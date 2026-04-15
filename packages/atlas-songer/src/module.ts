import type { AtlasModule, ButtonHandler, SlashCommandHandler } from '@atlas/types';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';

import { initShoukaku } from './lavalink/shoukaku.js';
import {
  applyPendingSelection,
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
import type { AtlasSongerModuleOptions } from './types.js';

const playlistModePattern = /^playlist_mode:(shuffle|normal):(.+)$/;

type SlashCommandFactory = (
  pausedGuilds: Set<string>,
) => SlashCommandHandler;

type ButtonHandlerFactory = (
  pausedGuilds: Set<string>,
) => ButtonHandler;

const buildPlaybackControls = (
  pausedGuilds: Set<string>,
  guildId?: string,
) => {
  const toggleButton = new ButtonBuilder()
    .setCustomId('queue_toggle_pause')
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
      .setCustomId('queue_next')
      .setLabel('Siguiente')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('queue_shuffle')
      .setLabel('Random')
      .setEmoji('🔀')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('queue_stop')
      .setLabel('Detener')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('queue_leave')
      .setLabel('Salir')
      .setEmoji('👋')
      .setStyle(ButtonStyle.Secondary),
  );
};

const requireGuildMember = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild) {
    throw new Error('Este comando solo funciona dentro de un servidor.');
  }

  return interaction.guild.members.fetch(interaction.user.id);
};

const createPingCommand: SlashCommandFactory = (_pausedGuilds) => ({
  id: 'atlas-songer:ping',
  data: new SlashCommandBuilder().setName('ping').setDescription('Responde con pong'),
  execute: async (interaction) => {
    await interaction.reply('🏓 Pong');
  },
});

const createJoinCommand: SlashCommandFactory = (pausedGuilds) => ({
  id: 'atlas-songer:join',
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Atlas entra al canal de voz'),
  execute: async (interaction) => {
    await interaction.deferReply();

    if (!interaction.guild) {
      throw new Error('Este comando solo funciona dentro de un servidor.');
    }

    const member = await requireGuildMember(interaction);
    const channelName = await joinMemberVoice(interaction.guild, member);

    pausedGuilds.delete(interaction.guild.id);
    await interaction.editReply(`🎤 Atlas entró a **${channelName}**`);
  },
});

const createLeaveCommand: SlashCommandFactory = (pausedGuilds) => ({
  id: 'atlas-songer:leave',
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Atlas sale del canal de voz'),
  execute: async (interaction) => {
    await interaction.deferReply();

    if (!interaction.guildId) {
      throw new Error('Este comando solo funciona dentro de un servidor.');
    }

    const left = await leaveVoice(interaction.guildId);
    pausedGuilds.delete(interaction.guildId);

    await interaction.editReply(
      left ? '👋 Atlas salió del canal de voz' : 'Atlas no estaba conectado.',
    );
  },
});

const createPlayCommand: SlashCommandFactory = (pausedGuilds) => ({
  id: 'atlas-songer:play',
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduce una URL, playlist o búsqueda')
    .addStringOption((option) =>
      option
        .setName('source')
        .setDescription('URL, playlist o texto de búsqueda')
        .setRequired(true),
    )
    .toJSON(),
  execute: async (interaction) => {
    await interaction.deferReply();

    if (!interaction.guild) {
      throw new Error('Este comando solo funciona dentro de un servidor.');
    }

    const member = await requireGuildMember(interaction);
    const source = interaction.options.getString('source', true);

    const result = await prepareSource(
      interaction.guild,
      member,
      source,
      interaction.user.username,
    );

    if (result.needsChoice) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`playlist_mode:shuffle:${result.selectionId}`)
          .setLabel('Aleatorio')
          .setEmoji('🔀')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`playlist_mode:normal:${result.selectionId}`)
          .setLabel('Normal')
          .setEmoji('➡️')
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.editReply({
        content: `📚 Detecté una playlist con **${result.added}** pistas. ¿Cómo quieres cargarla?`,
        components: [row],
      });

      return;
    }

    if (interaction.guildId && result.startedNow) {
      pausedGuilds.delete(interaction.guildId);
    }

    await interaction.editReply({
      content: result.startedNow
        ? `▶️ Reproduciendo **${result.firstTitle}**`
        : `➕ Añadida a la cola: **${result.firstTitle}**`,
      components: interaction.guildId
        ? [buildPlaybackControls(pausedGuilds, interaction.guildId)]
        : [],
    });
  },
});

const createPauseCommand: SlashCommandFactory = (pausedGuilds) => ({
  id: 'atlas-songer:pause',
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pausa la reproducción actual'),
  execute: async (interaction) => {
    const paused = interaction.guildId
      ? await pausePlayback(interaction.guildId)
      : false;

    if (paused && interaction.guildId) {
      pausedGuilds.add(interaction.guildId);
    }

    await interaction.reply(
      paused ? '⏸️ Reproducción pausada' : 'No hay nada sonando.',
    );
  },
});

const createResumeCommand: SlashCommandFactory = (pausedGuilds) => ({
  id: 'atlas-songer:resume',
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Reanuda la reproducción actual'),
  execute: async (interaction) => {
    const resumed = interaction.guildId
      ? await resumePlayback(interaction.guildId)
      : false;

    if (resumed && interaction.guildId) {
      pausedGuilds.delete(interaction.guildId);
    }

    await interaction.reply(
      resumed ? '▶️ Reproducción reanudada' : 'No hay reproducción pausada.',
    );
  },
});

const createStopCommand: SlashCommandFactory = (pausedGuilds) => ({
  id: 'atlas-songer:stop',
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Detiene la reproducción y vacía la cola'),
  execute: async (interaction) => {
    const stopped = interaction.guildId
      ? await stopPlayback(interaction.guildId)
      : false;

    if (interaction.guildId) {
      pausedGuilds.delete(interaction.guildId);
    }

    await interaction.reply(
      stopped
        ? '⏹️ Reproducción detenida y cola vaciada'
        : 'No hay nada reproduciéndose.',
    );
  },
});

const createSkipCommand: SlashCommandFactory = (pausedGuilds) => ({
  id: 'atlas-songer:skip',
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Salta a la siguiente pista'),
  execute: async (interaction) => {
    const skipped = interaction.guildId
      ? await skipPlayback(interaction.guildId)
      : false;

    if (interaction.guildId) {
      pausedGuilds.delete(interaction.guildId);
    }

    await interaction.reply(
      skipped ? '⏭️ Pista saltada' : 'No hay pista activa para saltar.',
    );
  },
});

const createVolumeCommand: SlashCommandFactory = (_pausedGuilds) => ({
  id: 'atlas-songer:volume',
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Cambia el volumen del reproductor')
    .addIntegerOption((option) =>
      option
        .setName('percent')
        .setDescription('Volumen entre 0 y 200')
        .setMinValue(0)
        .setMaxValue(200)
        .setRequired(true),
    )
    .toJSON(),
  execute: async (interaction) => {
    if (!interaction.guildId) {
      throw new Error('Este comando solo funciona dentro de un servidor.');
    }

    const percent = interaction.options.getInteger('percent', true);
    const changed = await setPlaybackVolume(interaction.guildId, percent);

    await interaction.reply(
      changed
        ? `🔊 Volumen ajustado a **${percent}%**`
        : 'No hay una sesión activa para cambiar el volumen.',
    );
  },
});

const createNowPlayingCommand: SlashCommandFactory = (_pausedGuilds) => ({
  id: 'atlas-songer:nowplaying',
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Muestra la pista actual'),
  execute: async (interaction) => {
    if (!interaction.guildId) {
      throw new Error('Este comando solo funciona dentro de un servidor.');
    }

    const track = getNowPlaying(interaction.guildId);

    await interaction.reply(
      track
        ? `🎶 Sonando ahora: **${track.title}**`
        : 'No hay nada reproduciéndose en este momento.',
    );
  },
});

const createPlaylistModeButton: ButtonHandlerFactory = (pausedGuilds) => ({
  id: 'atlas-songer:playlist-mode',
  customId: playlistModePattern,
  execute: async (interaction) => {
    const match = playlistModePattern.exec(interaction.customId);
    if (!match) {
      return;
    }

    const mode = match[1] as 'shuffle' | 'normal';
    const selectionId = match[2];

    const result = await applyPendingSelection(
      selectionId,
      mode,
      interaction.user.id,
    );

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

const createTogglePauseButton: ButtonHandlerFactory = (pausedGuilds) => ({
  id: 'atlas-songer:toggle-pause',
  customId: 'queue_toggle_pause',
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Este botón solo funciona dentro de un servidor.',
        ephemeral: true,
      });
      return;
    }

    const guildId = interaction.guildId;
    const isPaused = pausedGuilds.has(guildId);

    if (isPaused) {
      const resumed = await resumePlayback(guildId);

      if (!resumed) {
        await interaction.reply({
          content: 'No hay reproducción pausada para reanudar.',
          ephemeral: true,
        });
        return;
      }

      pausedGuilds.delete(guildId);

      await interaction.update({
        components: [buildPlaybackControls(pausedGuilds, guildId)],
      });

      await interaction.followUp({
        content: '▶️ Reproducción reanudada.',
        ephemeral: true,
      });

      return;
    }

    const paused = await pausePlayback(guildId);

    if (!paused) {
      await interaction.reply({
        content: 'No hay nada sonando para pausar.',
        ephemeral: true,
      });
      return;
    }

    pausedGuilds.add(guildId);

    await interaction.update({
      components: [buildPlaybackControls(pausedGuilds, guildId)],
    });

    await interaction.followUp({
      content: '⏸️ Reproducción pausada.',
      ephemeral: true,
    });
  },
});

const createNextButton: ButtonHandlerFactory = (pausedGuilds) => ({
  id: 'atlas-songer:queue-next',
  customId: 'queue_next',
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Este botón solo funciona dentro de un servidor.',
        ephemeral: true,
      });
      return;
    }

    const skipped = await skipPlayback(interaction.guildId);
    pausedGuilds.delete(interaction.guildId);

    if (!skipped) {
        await interaction.reply({
          content: 'No hay una pista activa para saltar.',
          ephemeral: true,
        });
      return;
    }

    await interaction.update({
      components: [buildPlaybackControls(pausedGuilds, interaction.guildId)],
    });

    await interaction.followUp({
      content: '⏭️ Saltando a la siguiente canción...',
      ephemeral: true,
    });
  },
});

const createShuffleButton: ButtonHandlerFactory = (_pausedGuilds) => ({
  id: 'atlas-songer:queue-shuffle',
  customId: 'queue_shuffle',
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Este botón solo funciona dentro de un servidor.',
        ephemeral: true,
      });
      return;
    }

    const shuffled = shuffleQueue(interaction.guildId);
    const queueSize = getQueueSize(interaction.guildId);

    await interaction.reply({
      content: shuffled
        ? `🔀 Cola randomizada. Quedan **${queueSize}** pistas pendientes.`
        : 'No hay suficientes pistas en cola para randomizar.',
      ephemeral: true,
    });
  },
});

const createStopButton: ButtonHandlerFactory = (pausedGuilds) => ({
  id: 'atlas-songer:queue-stop',
  customId: 'queue_stop',
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Este botón solo funciona dentro de un servidor.',
        ephemeral: true,
      });
      return;
    }

    const stopped = await stopPlayback(interaction.guildId);
    pausedGuilds.delete(interaction.guildId);

    if (!stopped) {
      await interaction.reply({
        content: 'No hay nada reproduciéndose para detener.',
        ephemeral: true,
      });
      return;
    }

    await interaction.update({
      components: [buildPlaybackControls(pausedGuilds, interaction.guildId)],
    });

    await interaction.followUp({
      content: '⏹️ Reproducción detenida y cola vaciada.',
      ephemeral: true,
    });
  },
});

const createLeaveButton: ButtonHandlerFactory = (pausedGuilds) => ({
  id: 'atlas-songer:queue-leave',
  customId: 'queue_leave',
  execute: async (interaction) => {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Este botón solo funciona dentro de un servidor.',
        ephemeral: true,
      });
      return;
    }

    const left = await leaveVoice(interaction.guildId);
    pausedGuilds.delete(interaction.guildId);

    if (!left) {
      await interaction.reply({
        content: 'Atlas no estaba conectado.',
        ephemeral: true,
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

  const slashCommands: SlashCommandHandler[] = [
    createPingCommand(pausedGuilds),
    createJoinCommand(pausedGuilds),
    createLeaveCommand(pausedGuilds),
    createPlayCommand(pausedGuilds),
    createPauseCommand(pausedGuilds),
    createResumeCommand(pausedGuilds),
    createStopCommand(pausedGuilds),
    createSkipCommand(pausedGuilds),
    createVolumeCommand(pausedGuilds),
    createNowPlayingCommand(pausedGuilds),
  ];

  const buttonHandlers: ButtonHandler[] = [
    createPlaylistModeButton(pausedGuilds),
    createTogglePauseButton(pausedGuilds),
    createNextButton(pausedGuilds),
    createShuffleButton(pausedGuilds),
    createStopButton(pausedGuilds),
    createLeaveButton(pausedGuilds),
  ];

  return {
    id: 'atlas-songer',
    name: 'Atlas Songer',
    description: 'Base musical de Atlas.',
    defaultEnabled: true,
    setup: ({ client, logger }) => {
      initShoukaku(client, options.lavalink);
      logger.info('Shoukaku inicializado.');
    },
    slashCommands,
    buttonHandlers,
  };
};
