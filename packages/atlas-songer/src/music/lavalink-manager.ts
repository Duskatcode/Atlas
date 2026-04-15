import { randomUUID } from 'node:crypto';
import { Guild, GuildMember, PermissionsBitField } from 'discord.js';
import { getShoukaku } from '../lavalink/shoukaku.js';

export const PENDING_SELECTION_TTL_MS = 2 * 60 * 1000;

type QueueTrack = {
  encoded: string;
  title: string;
  uri?: string;
  requestedBy?: string;
};

type GuildSession = {
  player: any;
  queue: QueueTrack[];
  current: QueueTrack | null;
  voiceChannelId: string;
};

type PendingSelection = {
  guildId: string;
  userId: string;
  tracks: QueueTrack[];
  firstTitle: string;
  expiresAt: number;
};

export interface GuildSessionSnapshot {
  voiceChannelId: string;
  queueSize: number;
  hasCurrent: boolean;
}

const sessions = new Map<string, GuildSession>();
const pendingSelections = new Map<string, PendingSelection>();

function normalizeIdentifier(source: string) {
  const value = source.trim();

  if (/^https?:\/\//i.test(value)) return value;
  if (/^(ytsearch:|ytmsearch:|scsearch:)/i.test(value)) return value;

  return `ytsearch:${value}`;
}

function trackFromRaw(raw: any, requestedBy?: string): QueueTrack {
  return {
    encoded: raw.encoded,
    title: raw.info?.title ?? 'Sin título',
    uri: raw.info?.uri,
    requestedBy,
  };
}

function shuffleArray<T>(items: T[]) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function getShoukakuOrThrow() {
  try {
    return getShoukaku();
  } catch {
    throw new Error('El reproductor musical no está listo en este momento. Intenta de nuevo en unos segundos.');
  }
}

function removePendingSelection(selectionId: string) {
  return pendingSelections.delete(selectionId);
}

function clearGuildPendingSelections(guildId: string) {
  for (const [selectionId, pending] of pendingSelections.entries()) {
    if (pending.guildId === guildId) {
      removePendingSelection(selectionId);
    }
  }
}

function clearGuildSession(guildId: string) {
  sessions.delete(guildId);
  clearGuildPendingSelections(guildId);
}

function isPendingSelectionExpired(pending: PendingSelection, now = Date.now()) {
  return pending.expiresAt <= now;
}

export function clearExpiredPendingSelections(now = Date.now()) {
  let removed = 0;

  for (const [selectionId, pending] of pendingSelections.entries()) {
    if (isPendingSelectionExpired(pending, now)) {
      pendingSelections.delete(selectionId);
      removed += 1;
    }
  }

  return removed;
}

export function expirePendingSelection(selectionId: string) {
  return removePendingSelection(selectionId);
}

export function getGuildSessionSnapshot(guildId: string): GuildSessionSnapshot | null {
  const session = sessions.get(guildId);

  if (!session) {
    return null;
  }

  return {
    voiceChannelId: session.voiceChannelId,
    queueSize: session.queue.length,
    hasCurrent: session.current !== null,
  };
}

async function resolveTracks(source: string, requestedBy?: string): Promise<QueueTrack[]> {
  const shoukaku = getShoukakuOrThrow();
  const node = shoukaku.getIdealNode();

  if (!node) {
    throw new Error('Lavalink no está disponible en este momento. Intenta de nuevo más tarde.');
  }

  const result: any = await node.rest.resolve(normalizeIdentifier(source));

  switch (result.loadType) {
    case 'track':
      return [trackFromRaw(result.data, requestedBy)];

    case 'playlist':
      return result.data.tracks.map((track: any) => trackFromRaw(track, requestedBy));

    case 'search':
      if (!result.data.length) {
        throw new Error('No encontré resultados para esa búsqueda.');
      }

      return [trackFromRaw(result.data[0], requestedBy)];

    case 'empty':
      throw new Error('No encontré resultados para esa consulta.');

    case 'error':
      throw new Error(result.data?.message || 'Lavalink no pudo cargar la pista.');

    default:
      throw new Error(`Tipo de resultado no soportado: ${result.loadType}`);
  }
}

async function playNext(guildId: string) {
  const session = sessions.get(guildId);
  if (!session) return false;
  if (session.current) return false;

  let next = session.queue.shift();

  while (next) {
    session.current = next;

    try {
      await session.player.playTrack({
        track: { encoded: next.encoded },
      });

      return true;
    } catch {
      session.current = null;
      next = session.queue.shift();
    }
  }

  throw new Error('No se pudo iniciar la reproducción. Intenta otra pista o vuelve a conectar Atlas.');
}

function getConnectedChannelName(guild: Guild, channelId: string) {
  const channel = guild.channels.cache.get(channelId);
  return channel?.isVoiceBased() ? channel.name : null;
}

async function ensureSession(guild: Guild, member: GuildMember) {
  clearExpiredPendingSelections();

  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    throw new Error('Debes estar dentro de un canal de voz.');
  }

  if (!guild.client.user) {
    throw new Error('Atlas aún no está listo para conectarse a voz.');
  }

  const me = await guild.members.fetch(guild.client.user.id);
  const permissions = voiceChannel.permissionsFor(me);

  if (!permissions?.has(PermissionsBitField.Flags.ViewChannel)) {
    throw new Error('No tengo permiso para ver ese canal de voz.');
  }

  if (!permissions?.has(PermissionsBitField.Flags.Connect)) {
    throw new Error('No tengo permiso para conectarme a ese canal de voz.');
  }

  if (!permissions?.has(PermissionsBitField.Flags.Speak)) {
    throw new Error('No tengo permiso para hablar en ese canal de voz.');
  }

  const existing = sessions.get(guild.id);
  const botVoiceChannelId = me.voice.channelId;

  if (existing) {
    if (!botVoiceChannelId) {
      clearGuildSession(guild.id);
    } else {
      existing.voiceChannelId = botVoiceChannelId;

      if (existing.voiceChannelId === voiceChannel.id) {
        return existing;
      }

      const connectedChannelName = getConnectedChannelName(guild, existing.voiceChannelId);
      throw new Error(
        connectedChannelName
          ? `Atlas ya está conectado a **${connectedChannelName}**. Únete a ese canal o usa /songer leave desde allí.`
          : 'Atlas ya está conectado a otro canal de voz. Únete a ese canal o usa /songer leave desde allí.',
      );
    }
  }

  if (!existing && botVoiceChannelId && botVoiceChannelId !== voiceChannel.id) {
    const connectedChannelName = getConnectedChannelName(guild, botVoiceChannelId);
    throw new Error(
      connectedChannelName
        ? `Atlas ya está conectado a **${connectedChannelName}**. Únete a ese canal o usa /songer leave desde allí.`
        : 'Atlas ya está conectado a otro canal de voz. Únete a ese canal o usa /songer leave desde allí.',
    );
  }

  const shoukaku = getShoukakuOrThrow();
  const player = await shoukaku.joinVoiceChannel({
    guildId: guild.id,
    channelId: voiceChannel.id,
    shardId: guild.shardId ?? 0,
  });

  const session: GuildSession = {
    player,
    queue: [],
    current: null,
    voiceChannelId: voiceChannel.id,
  };

  player.on('end', async () => {
    const currentSession = sessions.get(guild.id);
    if (!currentSession) return;

    currentSession.current = null;
    await playNext(guild.id).catch(() => {
      currentSession.current = null;
    });
  });

  player.on('exception', async () => {
    const currentSession = sessions.get(guild.id);
    if (!currentSession) return;

    currentSession.current = null;
    await playNext(guild.id).catch(() => {
      currentSession.current = null;
    });
  });

  player.on('stuck', async () => {
    const currentSession = sessions.get(guild.id);
    if (!currentSession) return;

    currentSession.current = null;
    await playNext(guild.id).catch(() => {
      currentSession.current = null;
    });
  });

  sessions.set(guild.id, session);
  return session;
}

async function runSessionOperation(
  guildId: string,
  operation: (session: GuildSession) => Promise<void>,
  options?: { allowWithoutCurrent?: boolean },
) {
  clearExpiredPendingSelections();

  const session = sessions.get(guildId);
  if (!session) return false;

  if (!options?.allowWithoutCurrent && !session.current) {
    return false;
  }

  try {
    await operation(session);
    return true;
  } catch {
    clearGuildSession(guildId);
    throw new Error('La sesión musical quedó inconsistente. Usa /songer join para reconectar Atlas.');
  }
}

export async function joinMemberVoice(guild: Guild, member: GuildMember) {
  await ensureSession(guild, member);
  return member.voice.channel?.name ?? 'canal de voz';
}

export async function leaveVoice(guildId: string) {
  clearExpiredPendingSelections();

  const existed = sessions.has(guildId);
  clearGuildSession(guildId);

  try {
    const shoukaku = getShoukakuOrThrow();
    await shoukaku.leaveVoiceChannel(guildId);
  } catch {
    if (existed) {
      throw new Error('La sesión local fue limpiada, pero no pude cerrar la conexión de voz. Usa /songer join si necesitas reconectar Atlas.');
    }
  }

  return existed;
}

export async function prepareSource(
  guild: Guild,
  member: GuildMember,
  source: string,
  requestedBy?: string,
) {
  clearExpiredPendingSelections();

  await ensureSession(guild, member);
  const tracks = await resolveTracks(source, requestedBy);

  if (tracks.length <= 1) {
    const session = sessions.get(guild.id);

    if (!session) {
      throw new Error('No pude crear una sesión de reproducción para este servidor.');
    }

    session.queue.push(...tracks);

    const startedNow = await playNext(guild.id);

    return {
      needsChoice: false as const,
      added: tracks.length,
      startedNow,
      firstTitle: tracks[0]?.title ?? 'Sin título',
    };
  }

  const selectionId = randomUUID();

  pendingSelections.set(selectionId, {
    guildId: guild.id,
    userId: member.id,
    tracks,
    firstTitle: tracks[0]?.title ?? 'Sin título',
    expiresAt: Date.now() + PENDING_SELECTION_TTL_MS,
  });

  return {
    needsChoice: true as const,
    selectionId,
    added: tracks.length,
    firstTitle: tracks[0]?.title ?? 'Sin título',
    expiresAt: Date.now() + PENDING_SELECTION_TTL_MS,
  };
}

export async function applyPendingSelection(
  selectionId: string,
  mode: 'shuffle' | 'normal',
  userId: string,
) {
  clearExpiredPendingSelections();

  const pending = pendingSelections.get(selectionId);

  if (!pending) {
    throw new Error('Esta selección ya no existe o expiró.');
  }

  if (isPendingSelectionExpired(pending)) {
    removePendingSelection(selectionId);
    throw new Error('Esta selección ya no existe o expiró.');
  }

  if (pending.userId !== userId) {
    throw new Error('Solo quien cargó la playlist puede elegir el modo.');
  }

  const session = sessions.get(pending.guildId);

  if (!session) {
    removePendingSelection(selectionId);
    throw new Error('No hay sesión activa de reproducción.');
  }

  const finalTracks =
    mode === 'shuffle'
      ? shuffleArray(pending.tracks)
      : pending.tracks;

  session.queue.push(...finalTracks);
  removePendingSelection(selectionId);

  const startedNow = await playNext(pending.guildId);

  return {
    added: finalTracks.length,
    startedNow,
    firstTitle: finalTracks[0]?.title ?? 'Sin título',
    mode,
  };
}

export async function pausePlayback(guildId: string) {
  return runSessionOperation(guildId, async (session) => {
    await session.player.setPaused(true);
  });
}

export async function resumePlayback(guildId: string) {
  return runSessionOperation(guildId, async (session) => {
    await session.player.setPaused(false);
  });
}

export async function stopPlayback(guildId: string) {
  return runSessionOperation(
    guildId,
    async (session) => {
      session.queue = [];
      session.current = null;
      await session.player.stopTrack();
    },
    { allowWithoutCurrent: true },
  );
}

export async function skipPlayback(guildId: string) {
  return runSessionOperation(guildId, async (session) => {
    session.current = null;
    await session.player.stopTrack();
  });
}

export async function setPlaybackVolume(guildId: string, percent: number) {
  return runSessionOperation(
    guildId,
    async (session) => {
      await session.player.setGlobalVolume(percent);
    },
    { allowWithoutCurrent: true },
  );
}

export function getNowPlaying(guildId: string) {
  clearExpiredPendingSelections();
  const session = sessions.get(guildId);
  return session?.current ?? null;
}

export function getQueueSize(guildId: string) {
  clearExpiredPendingSelections();
  const session = sessions.get(guildId);
  return session?.queue.length ?? 0;
}

export function shuffleQueue(guildId: string) {
  clearExpiredPendingSelections();

  const session = sessions.get(guildId);

  if (!session || session.queue.length < 2) {
    return false;
  }

  session.queue = shuffleArray(session.queue);
  return true;
}
