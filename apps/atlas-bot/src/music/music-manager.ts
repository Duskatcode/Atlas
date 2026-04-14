import {
  AudioPlayer,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
} from '@discordjs/voice';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { Guild, GuildMember, PermissionsBitField } from 'discord.js';

interface TrackMetadata {
  title: string;
  requestedBy?: string;
  process?: ChildProcess;
}

interface GuildSession {
  guildId: string;
  player: AudioPlayer;
  connection?: VoiceConnection;
  current: TrackMetadata | null;
}

const sessions = new Map<string, GuildSession>();

const AUDIO_ASSETS_DIR_CANDIDATES = [
  resolve(process.cwd(), 'assets/audio'),
  resolve(process.cwd(), 'apps/atlas-bot/assets/audio'),
];

function getAudioAssetsDir() {
  const match = AUDIO_ASSETS_DIR_CANDIDATES.find((dir) => existsSync(dir));

  if (!match) {
    return AUDIO_ASSETS_DIR_CANDIDATES[0];
  }

  return match;
}

const AUDIO_ASSETS_DIR = getAudioAssetsDir();

function cleanupCurrentTrack(session?: GuildSession) {
  if (!session?.current) return;

  const process = session.current.process;
  if (process && !process.killed) {
    process.kill('SIGKILL');
  }

  session.current = null;
}

function getOrCreateSession(guildId: string): GuildSession {
  const existing = sessions.get(guildId);
  if (existing) return existing;

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Stop,
    },
  });

  const session: GuildSession = {
    guildId,
    player,
    current: null,
  };

  player.on(AudioPlayerStatus.Idle, () => {
    cleanupCurrentTrack(session);
  });

  player.on('error', (error) => {
    console.error(`❌ Error en player de guild ${guildId}:`, error);
    cleanupCurrentTrack(session);
  });

  sessions.set(guildId, session);
  return session;
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function resolveLocalAudioPath(source: string) {
  const trimmed = source.trim();
  const absolutePath = resolve(AUDIO_ASSETS_DIR, trimmed);

  if (!absolutePath.startsWith(AUDIO_ASSETS_DIR)) {
    throw new Error('Ruta local inválida.');
  }

  if (!existsSync(absolutePath)) {
    throw new Error(
      `No encontré "${trimmed}" dentro de assets/audio.`,
    );
  }

  return absolutePath;
}

async function ensureVoiceConnection(guild: Guild, member: GuildMember) {
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

  const session = getOrCreateSession(guild.id);
  const existingConnection = getVoiceConnection(guild.id);

  if (
    existingConnection &&
    existingConnection.joinConfig.channelId === voiceChannel.id
  ) {
    await entersState(existingConnection, VoiceConnectionStatus.Ready, 15_000);
    existingConnection.subscribe(session.player);
    session.connection = existingConnection;

    return {
      connection: existingConnection,
      channelName: voiceChannel.name,
      session,
    };
  }

  if (existingConnection) {
    existingConnection.destroy();
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

  connection.subscribe(session.player);
  session.connection = connection;

  return {
    connection,
    channelName: voiceChannel.name,
    session,
  };
}

function buildFfmpegArgs(input: string, isUrl: boolean) {
  const args: string[] = [];

  if (isUrl) {
    args.push(
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
    );
  }

  args.push(
    '-i', input,
    '-analyzeduration', '0',
    '-loglevel', 'error',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1',
  );

  return args;
}

function createTrackResource(source: string, requestedBy?: string) {
  const fromUrl = isHttpUrl(source);
  const input = fromUrl ? source.trim() : resolveLocalAudioPath(source);
  const title = fromUrl ? source.trim() : source.trim();

  const ffmpeg = spawn('ffmpeg', buildFfmpegArgs(input, fromUrl), {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  ffmpeg.stderr.on('data', (chunk) => {
    const output = chunk.toString().trim();
    if (output) {
      console.error(`FFmpeg: ${output}`);
    }
  });

  ffmpeg.on('error', (error) => {
    console.error('❌ Error ejecutando ffmpeg:', error);
  });

  const metadata: TrackMetadata = {
    title,
    requestedBy,
    process: ffmpeg,
  };

  const resource = createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.Raw,
    inlineVolume: true,
    metadata,
  });

  return { resource, metadata };
}

export async function joinMemberVoice(guild: Guild, member: GuildMember) {
  const { channelName } = await ensureVoiceConnection(guild, member);
  return channelName;
}

export function leaveVoice(guildId: string) {
  const connection = getVoiceConnection(guildId);
  const session = sessions.get(guildId);

  if (!connection) return false;

  session?.player.stop(true);
  cleanupCurrentTrack(session);

  connection.destroy();

  if (session) {
    session.connection = undefined;
  }

  return true;
}

export async function playSource(
  guild: Guild,
  member: GuildMember,
  source: string,
  requestedBy?: string,
) {
  const { channelName, session } = await ensureVoiceConnection(guild, member);

  cleanupCurrentTrack(session);

  const { resource, metadata } = createTrackResource(source, requestedBy);
  session.current = metadata;
  session.player.play(resource);

  return {
    channelName,
    title: metadata.title,
  };
}

export function pausePlayback(guildId: string) {
  const session = sessions.get(guildId);
  if (!session) return false;
  return session.player.pause();
}

export function resumePlayback(guildId: string) {
  const session = sessions.get(guildId);
  if (!session) return false;
  return session.player.unpause();
}

export function stopPlayback(guildId: string) {
  const session = sessions.get(guildId);
  if (!session) return false;

  cleanupCurrentTrack(session);
  return session.player.stop(true);
}

export function setPlaybackVolume(guildId: string, percent: number) {
  const session = sessions.get(guildId);
  if (!session) return false;

  const state = session.player.state;
  if (state.status === AudioPlayerStatus.Idle) {
    return false;
  }

  state.resource.volume?.setVolume(percent / 100);
  return true;
}

export function getNowPlaying(guildId: string) {
  const session = sessions.get(guildId);
  return session?.current ?? null;
}
