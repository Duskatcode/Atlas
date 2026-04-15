import type { AtlasModule, ButtonHandler, SlashCommandHandler } from '@atlas/types';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionsBitField,
  SlashCommandBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Guild,
  type GuildMember,
} from 'discord.js';
import {
  PENDING_SELECTION_TTL_MS,
  applyPendingSelection,
  expirePendingSelection,
  getGuildSessionSnapshot,
  getNowPlaying,
  getQueueSize,
  joinMemberVoice,
  leaveVoice,
  pausePlayback,
  prepareSource,
  resumePlayback,
  setPlaybackVolume,
  shuffleQueue,
  skipPlayback,
  stopPlayback,
} from './music/lavalink-manager.js';
import { initShoukaku, type AtlasSongerLavalinkConfig } from './lavalink/shoukaku.js';

export interface AtlasSongerModuleOptions {
  lavalink: AtlasSongerLavalinkConfig;
}

type SongerSubcommand =
  | 'join'
  | 'leave'
  | 'play'
  | 'pause'
  | 'resume'
  | 'skip'
  | 'stop'
  | 'volume'
  | 'nowplaying';

type SongerInteraction = ChatInputCommandInteraction | ButtonInteraction;

const SONGER_COMMAND_NAME = 'songer';
const SONGER_COMPONENT_PREFIX = 'songer';
const SONGER_COMPONENT_IDS = {
  playlistModeShuffle: `${SONGER_COMPONENT_PREFIX}:playlist_mode:shuffle`,
  playlistModeNormal: `${SONGER_COMPONENT_PREFIX}:playlist_mode:normal`,
  togglePause: `${SONGER_COMPONENT_PREFIX}:queue_toggle_pause`,
  next: `${SONGER_COMPONENT_PREFIX}:queue_next`,
  shuffle: `${SONGER_COMPONENT_PREFIX}:queue_shuffle`,
  stop: `${SONGER_COMPONENT_PREFIX}:queue_stop`,
  leave: `${SONGER_COMPONENT_PREFIX}:queue_leave`,
} as const;

const playlistModePattern = /^songer:playlist_mode:(shuffle|normal):(.+)$/;
const pendingSelectionMinutes = Math.ceil(PENDING_SELECTION_TTL_MS / 60_000);

const buildPlaybackControls = (pausedGuilds: Set<string>, guildId?: string) => {
  const toggleButton = new ButtonBuilder()
    .setCustomId(SONGER_COMPONENT_IDS.togglePause)
    .setLabel('Pausar')
    .setEmoji('⏸️')
    .setStyle(ButtonStyle.Primary);

  if (guildId) {
    const isPaused = pausedGuilds.has(guildId);
    toggleButton
      .setLabel(isPaused ? 'Reanudar' : 'Pausar')
      .setEmoji(isPaused ? '▶️' : '⏸️');
  }

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    toggleButton,
    new ButtonBuilder()
      .setCustomId(SONGER_COMPONENT_IDS.next)
      .setLabel('Siguiente')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(SONGER_COMPONENT_IDS.shuffle)
      .setLabel('Random')
      .setEmoji('🔀')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(SONGER_COMPONENT_IDS.stop)
      .setLabel('Detener')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(SONGER_COMPONENT_IDS.leave)
      .setLabel('Salir')
      .setEmoji('👋')
      .setStyle(ButtonStyle.Secondary),
  );
};

const requireGuild = (interaction: SongerInteraction): Guild => {
  if (!interaction.guild || !interaction.guildId) {
    throw new Error('Este comando solo funciona dentro de un servidor.');
  }

  return interaction.guild;
};

const requireGuildMember = async (interaction: SongerInteraction): Promise<GuildMember> => {
  const guild = requireGuild(interaction);
  return guild.members.fetch(interaction.user.id);
};

const getSessionChannelName = (guild: Guild, channelId: string) => {
  const channel = guild.channels.cache.get(channelId);
  return channel?.isVoiceBased() ? channel.name : null;
};

const requireVoiceAccess = async (
  interaction: SongerInteraction,
  options?: {
    requireController?: boolean;
    controllerAction?: string;
  },
) => {
  const guild = requireGuild(interaction);
  const member = await requireGuildMember(interaction);
  const memberVoiceChannel = member.voice.channel;

  if (!memberVoiceChannel) {
    throw new Error('Debes estar dentro de un canal de voz para usar Songer.');
  }

  const session = getGuildSessionSnapshot(guild.id);
  const botMember = guild.client.user
    ? await guild.members.fetch(guild.client.user.id)
    : null;
  const botVoiceChannelId = botMember?.voice.channelId ?? session?.voiceChannelId ?? null;

  if (botVoiceChannelId && botVoiceChannelId !== memberVoiceChannel.id) {
    const channelName = getSessionChannelName(guild, botVoiceChannelId);
    throw new Error(
      channelName
        ? `Debes estar en el mismo canal de voz que Atlas (**${channelName}**).`
        : 'Debes estar en el mismo canal de voz que Atlas.',
    );
  }

  if (options?.requireController && session) {
    const listenerCount = memberVoiceChannel.members.filter((candidate) => !candidate.user.bot).size;
    const canManage = member.permissions.has(PermissionsBitField.Flags.ManageGuild);

    if (listenerCount > 1 && !canManage) {
      throw new Error(
        options.controllerAction
          ? `Solo alguien con permisos de gestión puede ${options.controllerAction} mientras hay otras personas escuchando.`
          : 'Solo alguien con permisos de gestión puede usar este control mientras hay otras personas escuchando.',
      );
    }
  }

  return {
    guild,
    member,
    memberVoiceChannel,
    session,
  };
};

const schedulePendingSelectionExpiry = (
  interaction: ChatInputCommandInteraction,
  selectionId: string,
) => {
  const timer = setTimeout(async () => {
    const expired = expirePendingSelection(selectionId);

    if (!expired) {
      return;
    }

    try {
      await interaction.editReply({
        content: `⏱️ La selección de playlist expiró tras ${pendingSelectionMinutes} minutos. Usa /songer play de nuevo si quieres cargarla.`,
        components: [],
      });
    } catch {
      // Best effort: si el mensaje ya cambió o la edición falla, la limpieza de estado ya ocurrió.
    }
  }, PENDING_SELECTION_TTL_MS);

  timer.unref?.();
};

const executeJoinCommand = async (
  interaction: ChatInputCommandInteraction,
  pausedGuilds: Set<string>,
) => {
  await interaction.deferReply();

  const { guild, member } = await requireVoiceAccess(interaction);
  const channelName = await joinMemberVoice(guild, member);

  pausedGuilds.delete(guild.id);

  await interaction.editReply(`🎤 Atlas entró a **${channelName}**`);
};

const executeLeaveCommand = async (
  interaction: ChatInputCommandInteraction,
  pausedGuilds: Set<string>,
) => {
  await interaction.deferReply();

  const { guild } = await requireVoiceAccess(interaction, {
    requireController: true,
    controllerAction: 'desconectar a Atlas',
  });

  const left = await leaveVoice(guild.id);
  pausedGuilds.delete(guild.id);

  await interaction.editReply(
    left ? '👋 Atlas salió del canal de voz' : 'Atlas no estaba conectado.',
  );
};

const executePlayCommand = async (
  interaction: ChatInputCommandInteraction,
  pausedGuilds: Set<string>,
) => {
  await interaction.deferReply();

  const { guild, member } = await requireVoiceAccess(interaction);
  const source = interaction.options.getString('source', true);
  const result = await prepareSource(
    guild,
    member,
    source,
    interaction.user.username,
  );

  if (result.needsChoice) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${SONGER_COMPONENT_IDS.playlistModeShuffle}:${result.selectionId}`)
        .setLabel('Aleatorio')
        .setEmoji('🔀')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${SONGER_COMPONENT_IDS.playlistModeNormal}:${result.selectionId}`)
        .setLabel('Normal')
        .setEmoji('➡️')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.editReply({
      content: `📚 Detecté una playlist con **${result.added}** pistas. ¿Cómo quieres cargarla? Tienes **${pendingSelectionMinutes} min** para elegir.`,
      components: [row],
    });

    schedulePendingSelectionExpiry(interaction, result.selectionId);
    return;
  }

  if (guild.id && result.startedNow) {
    pausedGuilds.delete(guild.id);
  }

  await interaction.editReply({
    content: result.startedNow
      ? `▶️ Reproduciendo **${result.firstTitle}**`
      : `➕ Añadida a la cola: **${result.firstTitle}**`,
    components: [buildPlaybackControls(pausedGuilds, guild.id)],
  });
};

const executePauseCommand = async (
  interaction: ChatInputCommandInteraction,
  pausedGuilds: Set<string>,
) => {
  const { guild } = await requireVoiceAccess(interaction);
  const paused = await pausePlayback(guild.id);

  if (paused) {
    pausedGuilds.add(guild.id);
  } else {
    pausedGuilds.delete(guild.id);
  }

  await interaction.reply(paused ? '⏸️ Reproducción pausada' : 'No hay nada sonando.');
};

const executeResumeCommand = async (
  interaction: ChatInputCommandInteraction,
  pausedGuilds: Set<string>,
) => {
  const { guild } = await requireVoiceAccess(interaction);
  const resumed = await resumePlayback(guild.id);

  if (resumed) {
    pausedGuilds.delete(guild.id);
  }

  await interaction.reply(resumed ? '▶️ Reproducción reanudada' : 'No hay reproducción pausada.');
};

const executeSkipCommand = async (
  interaction: ChatInputCommandInteraction,
  pausedGuilds: Set<string>,
) => {
  const { guild } = await requireVoiceAccess(interaction, {
    requireController: true,
    controllerAction: 'saltar la pista actual',
  });

  const skipped = await skipPlayback(guild.id);
  pausedGuilds.delete(guild.id);

  await interaction.reply(
    skipped ? '⏭️ Pista saltada' : 'No hay pista activa para saltar.',
  );
};

const executeStopCommand = async (
  interaction: ChatInputCommandInteraction,
  pausedGuilds: Set<string>,
) => {
  const { guild } = await requireVoiceAccess(interaction, {
    requireController: true,
    controllerAction: 'detener la reproducción',
  });

  const stopped = await stopPlayback(guild.id);
  pausedGuilds.delete(guild.id);

  await interaction.reply(
    stopped
      ? '⏹️ Reproducción detenida y cola vaciada'
      : 'No hay nada reproduciéndose.',
  );
};

const executeVolumeCommand = async (interaction: ChatInputCommandInteraction) => {
  const { guild } = await requireVoiceAccess(interaction);
  const percent = interaction.options.getInteger('percent', true);
  const changed = await setPlaybackVolume(guild.id, percent);

  await interaction.reply(
    changed
      ? `🔊 Volumen ajustado a **${percent}%**`
      : 'No hay una sesión activa para cambiar el volumen.',
  );
};

const executeNowPlayingCommand = async (interaction: ChatInputCommandInteraction) => {
  const { guild } = await requireVoiceAccess(interaction);
  const track = getNowPlaying(guild.id);

  await interaction.reply(
    track
      ? `🎶 Sonando ahora: **${track.title}**`
      : 'No hay nada reproduciéndose en este momento.',
  );
};

const createSongerSlashCommand = (pausedGuilds: Set<string>): SlashCommandHandler => ({
  id: 'atlas-songer:command',
  data: new SlashCommandBuilder()
    .setName(SONGER_COMMAND_NAME)
    .setDescription('Comandos musicales de Atlas')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('join')
        .setDescription('Atlas entra al canal de voz'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('leave')
        .setDescription('Atlas sale del canal de voz'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('play')
        .setDescription('Reproduce una URL, playlist o búsqueda')
        .addStringOption((option) =>
          option
            .setName('source')
            .setDescription('URL, playlist o texto de búsqueda')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('pause')
        .setDescription('Pausa la reproducción actual'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('resume')
        .setDescription('Reanuda la reproducción actual'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('skip')
        .setDescription('Salta a la siguiente pista'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('stop')
        .setDescription('Detiene la reproducción y vacía la cola'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('volume')
        .setDescription('Cambia el volumen del reproductor')
        .addIntegerOption((option) =>
          option
            .setName('percent')
            .setDescription('Volumen entre 0 y 200')
            .setMinValue(0)
            .setMaxValue(200)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('nowplaying')
        .setDescription('Muestra la pista actual'),
    ),
  execute: async (interaction) => {
    const subcommand = interaction.options.getSubcommand(true) as SongerSubcommand;

    switch (subcommand) {
      case 'join':
        await executeJoinCommand(interaction, pausedGuilds);
        return;
      case 'leave':
        await executeLeaveCommand(interaction, pausedGuilds);
        return;
      case 'play':
        await executePlayCommand(interaction, pausedGuilds);
        return;
      case 'pause':
        await executePauseCommand(interaction, pausedGuilds);
        return;
      case 'resume':
        await executeResumeCommand(interaction, pausedGuilds);
        return;
      case 'skip':
        await executeSkipCommand(interaction, pausedGuilds);
        return;
      case 'stop':
        await executeStopCommand(interaction, pausedGuilds);
        return;
      case 'volume':
        await executeVolumeCommand(interaction);
        return;
      case 'nowplaying':
        await executeNowPlayingCommand(interaction);
        return;
      default:
        throw new Error(`Subcomando no soportado: ${subcommand}`);
    }
  },
});

const createPlaylistModeButton = (pausedGuilds: Set<string>): ButtonHandler => ({
  id: 'atlas-songer:playlist-mode',
  customId: playlistModePattern,
  execute: async (interaction) => {
    await requireVoiceAccess(interaction);

    const match = playlistModePattern.exec(interaction.customId);
    if (!match) {
      return;
    }

    const mode = match[1] as 'shuffle' | 'normal';
    const selectionId = match[2];
    const result = await applyPendingSelection(selectionId, mode, interaction.user.id);

    if (interaction.guildId && result.startedNow) {
      pausedGuilds.delete(interaction.guildId);
    }

    await interaction.update({
      content:
        result.mode === 'shuffle'
          ? `🔀 Playlist añadida en modo aleatorio. **${result.added}** pistas. Primera: **${result.firstTitle}**`
          : `➡️ Playlist añadida en orden normal. **${result.added}** pistas. Primera: **${result.firstTitle}**`,
      components: interaction.guildId
        ? [buildPlaybackControls(pausedGuilds, interaction.guildId)]
        : [],
    });
  },
});

const createTogglePauseButton = (pausedGuilds: Set<string>): ButtonHandler => ({
  id: 'atlas-songer:toggle-pause',
  customId: SONGER_COMPONENT_IDS.togglePause,
  execute: async (interaction) => {
    const { guild } = await requireVoiceAccess(interaction);
    const isPaused = pausedGuilds.has(guild.id);

    if (isPaused) {
      const resumed = await resumePlayback(guild.id);

      if (!resumed) {
        pausedGuilds.delete(guild.id);
        await interaction.reply({
          content: 'No hay reproducción pausada para reanudar.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      pausedGuilds.delete(guild.id);
      await interaction.update({
        components: [buildPlaybackControls(pausedGuilds, guild.id)],
      });
      await interaction.followUp({
        content: '▶️ Reproducción reanudada.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const paused = await pausePlayback(guild.id);

    if (!paused) {
      pausedGuilds.delete(guild.id);
      await interaction.reply({
        content: 'No hay nada sonando para pausar.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    pausedGuilds.add(guild.id);
    await interaction.update({
      components: [buildPlaybackControls(pausedGuilds, guild.id)],
    });
    await interaction.followUp({
      content: '⏸️ Reproducción pausada.',
      flags: MessageFlags.Ephemeral,
    });
  },
});

const createNextButton = (pausedGuilds: Set<string>): ButtonHandler => ({
  id: 'atlas-songer:queue-next',
  customId: SONGER_COMPONENT_IDS.next,
  execute: async (interaction) => {
    const { guild } = await requireVoiceAccess(interaction, {
      requireController: true,
      controllerAction: 'saltar la pista actual',
    });

    const skipped = await skipPlayback(guild.id);
    pausedGuilds.delete(guild.id);

    if (!skipped) {
      await interaction.reply({
        content: 'No hay una pista activa para saltar.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.update({
      components: [buildPlaybackControls(pausedGuilds, guild.id)],
    });
    await interaction.followUp({
      content: '⏭️ Saltando a la siguiente canción...',
      flags: MessageFlags.Ephemeral,
    });
  },
});

const createShuffleButton = (): ButtonHandler => ({
  id: 'atlas-songer:queue-shuffle',
  customId: SONGER_COMPONENT_IDS.shuffle,
  execute: async (interaction) => {
    const { guild } = await requireVoiceAccess(interaction);
    const shuffled = shuffleQueue(guild.id);
    const queueSize = getQueueSize(guild.id);

    await interaction.reply({
      content: shuffled
        ? `🔀 Cola randomizada. Quedan **${queueSize}** pistas pendientes.`
        : 'No hay suficientes pistas en cola para randomizar.',
      flags: MessageFlags.Ephemeral,
    });
  },
});

const createStopButton = (pausedGuilds: Set<string>): ButtonHandler => ({
  id: 'atlas-songer:queue-stop',
  customId: SONGER_COMPONENT_IDS.stop,
  execute: async (interaction) => {
    const { guild } = await requireVoiceAccess(interaction, {
      requireController: true,
      controllerAction: 'detener la reproducción',
    });

    const stopped = await stopPlayback(guild.id);
    pausedGuilds.delete(guild.id);

    if (!stopped) {
      await interaction.reply({
        content: 'No hay nada reproduciéndose para detener.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.update({
      components: [buildPlaybackControls(pausedGuilds, guild.id)],
    });
    await interaction.followUp({
      content: '⏹️ Reproducción detenida y cola vaciada.',
      flags: MessageFlags.Ephemeral,
    });
  },
});

const createLeaveButton = (pausedGuilds: Set<string>): ButtonHandler => ({
  id: 'atlas-songer:queue-leave',
  customId: SONGER_COMPONENT_IDS.leave,
  execute: async (interaction) => {
    const { guild } = await requireVoiceAccess(interaction, {
      requireController: true,
      controllerAction: 'desconectar a Atlas',
    });

    const left = await leaveVoice(guild.id);
    pausedGuilds.delete(guild.id);

    if (!left) {
      await interaction.reply({
        content: 'Atlas no estaba conectado.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.update({
      content: '👋 Atlas salió del canal de voz.',
      components: [],
    });
  },
});

export const createAtlasSongerModule = (
  options: AtlasSongerModuleOptions,
): AtlasModule => {
  const pausedGuilds = new Set<string>();

  return {
    id: 'atlas-songer',
    name: 'Atlas Songer',
    description: 'Base musical de Atlas.',
    defaultEnabled: true,
    setup: ({ client, logger }) => {
      initShoukaku(client, options.lavalink);
      logger.info('Shoukaku inicializado.');
    },
    slashCommands: [createSongerSlashCommand(pausedGuilds)],
    buttonHandlers: [
      createPlaylistModeButton(pausedGuilds),
      createTogglePauseButton(pausedGuilds),
      createNextButton(pausedGuilds),
      createShuffleButton(),
      createStopButton(pausedGuilds),
      createLeaveButton(pausedGuilds),
    ],
  };
};
