import { Guild, GuildMember, PermissionsBitField } from 'discord.js';
import { getShoukaku } from '../lavalink/shoukaku.js';
import { randomUUID } from 'node:crypto';
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
};

type PendingSelection = {
  guildId: string;
  userId: string;
  tracks: QueueTrack[];
  firstTitle: string;
};

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

function createSelectionId() {
  return randomUUID();
}

async function resolveTracks(source: string, requestedBy?: string): Promise<QueueTrack[]> {
  const shoukaku = getShoukaku();
  const node = shoukaku.getIdealNode();

  if (!node) {
    throw new Error('No hay nodos Lavalink disponibles.');
  }

  const result: any = await node.rest.resolve(normalizeIdentifier(source));

  console.log('loadType:', result.loadType);

  if (result.loadType === 'playlist') {
    console.log('playlist name:', result.data.info?.name);
    console.log('tracks returned by Lavalink:', result.data.tracks?.length);
  }

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

  const next = session.queue.shift();
  if (!next) return false;

  session.current = next;

  await session.player.playTrack({
    track: { encoded: next.encoded },
  });

  return true;
}

async function ensureSession(guild: Guild, member: GuildMember) {
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    throw new Error('Debes estar dentro de un canal de voz.');
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
  if (existing) {
    return existing;
  }

  const shoukaku = getShoukaku();

  const player = await shoukaku.joinVoiceChannel({
    guildId: guild.id,
    channelId: voiceChannel.id,
    shardId: guild.shardId ?? 0,
  });

  const session: GuildSession = {
    player,
    queue: [],
    current: null,
  };

  player.on('end', async () => {
    const currentSession = sessions.get(guild.id);
    if (!currentSession) return;
    currentSession.current = null;
    await playNext(guild.id);
  });

  player.on('exception', async () => {
    const currentSession = sessions.get(guild.id);
    if (!currentSession) return;
    currentSession.current = null;
    await playNext(guild.id);
  });

  player.on('stuck', async () => {
    const currentSession = sessions.get(guild.id);
    if (!currentSession) return;
    currentSession.current = null;
    await playNext(guild.id);
  });

  sessions.set(guild.id, session);
  return session;
}

export async function joinMemberVoice(guild: Guild, member: GuildMember) {
  await ensureSession(guild, member);
  return member.voice.channel?.name ?? 'canal de voz';
}

export async function leaveVoice(guildId: string) {
  const shoukaku = getShoukaku();
  const existed = sessions.has(guildId);

  await shoukaku.leaveVoiceChannel(guildId);
  sessions.delete(guildId);

  return existed;
}

export async function prepareSource(
  guild: Guild,
  member: GuildMember,
  source: string,
  requestedBy?: string,
) {
  await ensureSession(guild, member);
  const tracks = await resolveTracks(source, requestedBy);

  // Una sola pista: entra normal directo
  if (tracks.length <= 1) {
    const session = sessions.get(guild.id)!;
    session.queue.push(...tracks);

    const startedNow = await playNext(guild.id);

    return {
      needsChoice: false,
      added: tracks.length,
      startedNow,
      firstTitle: tracks[0]?.title ?? 'Sin título',
    };
  }

  // Varias pistas: guardar selección pendiente
  const selectionId = createSelectionId();

  pendingSelections.set(selectionId, {
    guildId: guild.id,
    userId: member.id,
    tracks,
    firstTitle: tracks[0]?.title ?? 'Sin título',
  });

  return {
    needsChoice: true,
    selectionId,
    added: tracks.length,
    firstTitle: tracks[0]?.title ?? 'Sin título',
  };
}

export async function applyPendingSelection(
  selectionId: string,
  mode: 'shuffle' | 'normal',
  userId: string,
) {
  const pending = pendingSelections.get(selectionId);

  if (!pending) {
    throw new Error('Esta selección ya no existe o expiró.');
  }

  if (pending.userId !== userId) {
    throw new Error('Solo quien cargó la playlist puede elegir el modo.');
  }

  const session = sessions.get(pending.guildId);

  if (!session) {
    pendingSelections.delete(selectionId);
    throw new Error('No hay sesión activa de reproducción.');
  }

  const finalTracks =
    mode === 'shuffle'
      ? shuffleArray(pending.tracks)
      : pending.tracks;

  session.queue.push(...finalTracks);
  pendingSelections.delete(selectionId);

  const startedNow = await playNext(pending.guildId);

  return {
    added: finalTracks.length,
    startedNow,
    firstTitle: finalTracks[0]?.title ?? 'Sin título',
    mode,
  };
}

export async function pausePlayback(guildId: string) {
  const session = sessions.get(guildId);
  if (!session) return false;

  await session.player.setPaused(true);
  return true;
}

export async function resumePlayback(guildId: string) {
  const session = sessions.get(guildId);
  if (!session) return false;

  await session.player.setPaused(false);
  return true;
}

export async function stopPlayback(guildId: string) {
  const session = sessions.get(guildId);
  if (!session) return false;

  session.queue = [];
  session.current = null;
  await session.player.stopTrack();
  return true;
}

export async function skipPlayback(guildId: string) {
  const session = sessions.get(guildId);
  if (!session) return false;

  session.current = null;
  await session.player.stopTrack();
  return true;
}

export async function setPlaybackVolume(guildId: string, percent: number) {
  const session = sessions.get(guildId);
  if (!session) return false;

  await session.player.setGlobalVolume(percent);
  return true;
}

export function getNowPlaying(guildId: string) {
  const session = sessions.get(guildId);
  return session?.current ?? null;
}

export function getQueueSize(guildId: string) {
  const session = sessions.get(guildId);
  return session?.queue.length ?? 0;
}

export function shuffleQueue(guildId: string) {
  const session = sessions.get(guildId);

  if (!session || session.queue.length < 2) {
    return false;
  }

  for (let i = session.queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [session.queue[i], session.queue[j]] = [session.queue[j], session.queue[i]];
  }

  return true;
}