import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
} from 'discord.js';
import { env } from './config.js';
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

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

initShoukaku(client);

const pausedGuilds = new Set<string>();

function getPlaybackControls(guildId?: string) {
  const isPaused = guildId ? pausedGuilds.has(guildId) : false;

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('queue_toggle_pause')
      .setLabel(isPaused ? 'Reanudar' : 'Pausar')
      .setEmoji(isPaused ? '▶️' : '⏸️')
      .setStyle(ButtonStyle.Primary),

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
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Atlas encendido como ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('playlist_mode:')) {
        const parts = interaction.customId.split(':');
        const mode = parts[1] as 'shuffle' | 'normal';
        const selectionId = parts.slice(2).join(':');

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
            ? [getPlaybackControls(interaction.guildId)]
            : [],
        });

        return;
      }

      if (interaction.customId === 'queue_toggle_pause') {
        if (!interaction.guildId) {
          await interaction.reply({
            content: 'Este botón solo funciona dentro de un servidor.',
            flags: MessageFlags.Ephemeral,
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
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          pausedGuilds.delete(guildId);

          await interaction.update({
            components: [getPlaybackControls(guildId)],
          });

          await interaction.followUp({
            content: '▶️ Reproducción reanudada.',
            flags: MessageFlags.Ephemeral,
          });

          return;
        }

        const paused = await pausePlayback(guildId);

        if (!paused) {
          await interaction.reply({
            content: 'No hay nada sonando para pausar.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        pausedGuilds.add(guildId);

        await interaction.update({
          components: [getPlaybackControls(guildId)],
        });

        await interaction.followUp({
          content: '⏸️ Reproducción pausada.',
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      if (interaction.customId === 'queue_next') {
        if (!interaction.guildId) {
          await interaction.reply({
            content: 'Este botón solo funciona dentro de un servidor.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const skipped = await skipPlayback(interaction.guildId);
        pausedGuilds.delete(interaction.guildId);

        if (!skipped) {
          await interaction.reply({
            content: 'No hay una pista activa para saltar.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.update({
          components: [getPlaybackControls(interaction.guildId)],
        });

        await interaction.followUp({
          content: '⏭️ Saltando a la siguiente canción...',
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      if (interaction.customId === 'queue_shuffle') {
        if (!interaction.guildId) {
          await interaction.reply({
            content: 'Este botón solo funciona dentro de un servidor.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const shuffled = shuffleQueue(interaction.guildId);
        const queueSize = getQueueSize(interaction.guildId);

        await interaction.reply({
          content: shuffled
            ? `🔀 Cola randomizada. Quedan **${queueSize}** pistas pendientes.`
            : 'No hay suficientes pistas en cola para randomizar.',
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      if (interaction.customId === 'queue_stop') {
        if (!interaction.guildId) {
          await interaction.reply({
            content: 'Este botón solo funciona dentro de un servidor.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const stopped = await stopPlayback(interaction.guildId);
        pausedGuilds.delete(interaction.guildId);

        if (!stopped) {
          await interaction.reply({
            content: 'No hay nada reproduciéndose para detener.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await interaction.update({
          components: [getPlaybackControls(interaction.guildId)],
        });

        await interaction.followUp({
          content: '⏹️ Reproducción detenida y cola vaciada.',
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      if (interaction.customId === 'queue_leave') {
        if (!interaction.guildId) {
          await interaction.reply({
            content: 'Este botón solo funciona dentro de un servidor.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const left = await leaveVoice(interaction.guildId);
        pausedGuilds.delete(interaction.guildId);

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

        return;
      }
    }

    if (!interaction.isChatInputCommand()) return;

    await handleChatCommand(interaction);
  } catch (error) {
    console.error('❌ Error en comando:', error);

    const safeMessage =
      error instanceof Error
        ? `❌ ${error.message}`.slice(0, 1900)
        : '❌ Ocurrió un error ejecutando el comando.';

    try {
      if (!interaction.isRepliable()) {
        console.error('❌ La interacción no es respondible.');
        return;
      }

      if ('deferred' in interaction && interaction.deferred) {
        await interaction.editReply(safeMessage);
      } else if ('replied' in interaction && interaction.replied) {
        await interaction.followUp({
          content: safeMessage,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: safeMessage,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyError) {
      console.error('❌ Error respondiendo al error:', replyError);
    }
  }
});

async function getRequestMember(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    throw new Error('Este comando solo funciona dentro de un servidor.');
  }

  return interaction.guild.members.fetch(interaction.user.id);
}

async function handleChatCommand(interaction: ChatInputCommandInteraction) {
  if (interaction.commandName === 'ping') {
    await interaction.reply('🏓 Pong');
    return;
  }

  if (interaction.commandName === 'join') {
    await interaction.deferReply();

    if (!interaction.guild) {
      throw new Error('Este comando solo funciona dentro de un servidor.');
    }

    const member = await getRequestMember(interaction);
    const channelName = await joinMemberVoice(interaction.guild, member);

    pausedGuilds.delete(interaction.guild.id);

    await interaction.editReply(`🎤 Atlas entró a **${channelName}**`);
    return;
  }

  if (interaction.commandName === 'leave') {
    await interaction.deferReply();

    if (!interaction.guildId) {
      throw new Error('Este comando solo funciona dentro de un servidor.');
    }

    const left = await leaveVoice(interaction.guildId);
    pausedGuilds.delete(interaction.guildId);

    await interaction.editReply(
      left ? '👋 Atlas salió del canal de voz' : 'Atlas no estaba conectado.',
    );
    return;
  }

  if (interaction.commandName === 'play') {
    await interaction.deferReply();

    if (!interaction.guild) {
      throw new Error('Este comando solo funciona dentro de un servidor.');
    }

    const member = await getRequestMember(interaction);
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
        ? [getPlaybackControls(interaction.guildId)]
        : [],
    });

    return;
  }

  if (interaction.commandName === 'pause') {
    const paused = interaction.guildId
      ? await pausePlayback(interaction.guildId)
      : false;

    if (paused && interaction.guildId) {
      pausedGuilds.add(interaction.guildId);
    }

    await interaction.reply(
      paused ? '⏸️ Reproducción pausada' : 'No hay nada sonando.',
    );
    return;
  }

  if (interaction.commandName === 'resume') {
    const resumed = interaction.guildId
      ? await resumePlayback(interaction.guildId)
      : false;

    if (resumed && interaction.guildId) {
      pausedGuilds.delete(interaction.guildId);
    }

    await interaction.reply(
      resumed ? '▶️ Reproducción reanudada' : 'No hay reproducción pausada.',
    );
    return;
  }

  if (interaction.commandName === 'stop') {
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
    return;
  }

  if (interaction.commandName === 'skip') {
    const skipped = interaction.guildId
      ? await skipPlayback(interaction.guildId)
      : false;

    if (interaction.guildId) {
      pausedGuilds.delete(interaction.guildId);
    }

    await interaction.reply(
      skipped ? '⏭️ Pista saltada' : 'No hay pista activa para saltar.',
    );
    return;
  }

  if (interaction.commandName === 'volume') {
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
    return;
  }

  if (interaction.commandName === 'nowplaying') {
    if (!interaction.guildId) {
      throw new Error('Este comando solo funciona dentro de un servidor.');
    }

    const track = getNowPlaying(interaction.guildId);

    await interaction.reply(
      track
        ? `🎶 Sonando ahora: **${track.title}**`
        : 'No hay nada reproduciéndose en este momento.',
    );
  }
}

client.login(env.DISCORD_TOKEN);