import {
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
} from 'discord.js';
import { env } from './config.js';
import {
  getNowPlaying,
  joinMemberVoice,
  leaveVoice,
  pausePlayback,
  playSource,
  resumePlayback,
  setPlaybackVolume,
  stopPlayback,
} from './music/music-manager.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Atlas encendido como ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await handleChatCommand(interaction);
  } catch (error) {
    console.error('❌ Error en comando:', error);

    const message =
      error instanceof Error
        ? `❌ ${error.message}`
        : '❌ Ocurrió un error ejecutando el comando.';

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(message);
      } else {
        await interaction.reply({
          content: message,
          ephemeral: true,
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

    await interaction.editReply(`🎤 Atlas entró a **${channelName}**`);
    return;
  }

  if (interaction.commandName === 'leave') {
    await interaction.deferReply();

    if (!interaction.guildId) {
      throw new Error('Este comando solo funciona dentro de un servidor.');
    }

    const left = leaveVoice(interaction.guildId);

    await interaction.editReply(
      left
        ? '👋 Atlas salió del canal de voz'
        : 'Atlas no está conectado a ningún canal de voz.',
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

    const result = await playSource(
      interaction.guild,
      member,
      source,
      interaction.user.username,
    );

    await interaction.editReply(
      `▶️ Reproduciendo **${result.title}** en **${result.channelName}**`,
    );
    return;
  }

  if (interaction.commandName === 'pause') {
    const paused = interaction.guildId ? pausePlayback(interaction.guildId) : false;

    await interaction.reply(
      paused
        ? '⏸️ Reproducción pausada'
        : 'No hay nada reproduciéndose ahora mismo.',
    );
    return;
  }

  if (interaction.commandName === 'resume') {
    const resumed = interaction.guildId ? resumePlayback(interaction.guildId) : false;

    await interaction.reply(
      resumed
        ? '▶️ Reproducción reanudada'
        : 'No hay reproducción pausada para reanudar.',
    );
    return;
  }

  if (interaction.commandName === 'stop') {
    const stopped = interaction.guildId ? stopPlayback(interaction.guildId) : false;

    await interaction.reply(
      stopped
        ? '⏹️ Reproducción detenida'
        : 'No hay nada reproduciéndose ahora mismo.',
    );
    return;
  }

  if (interaction.commandName === 'volume') {
    if (!interaction.guildId) {
      throw new Error('Este comando solo funciona dentro de un servidor.');
    }

    const percent = interaction.options.getInteger('percent', true);
    const changed = setPlaybackVolume(interaction.guildId, percent);

    await interaction.reply(
      changed
        ? `🔊 Volumen ajustado a **${percent}%**`
        : 'No hay una pista activa para cambiar el volumen.',
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