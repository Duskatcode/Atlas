import {
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
  PermissionsBitField,
} from 'discord.js';
import {
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { env } from './config.js';

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

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ Ocurrió un error ejecutando el comando.');
      } else {
        await interaction.reply({
          content: '❌ Ocurrió un error ejecutando el comando.',
          ephemeral: true,
        });
      }
    } catch (replyError) {
      console.error('❌ Error respondiendo al error:', replyError);
    }
  }
});

async function handleChatCommand(interaction: ChatInputCommandInteraction) {
  if (interaction.commandName === 'ping') {
    await interaction.reply('🏓 Pong');
    return;
  }

  if (interaction.commandName === 'join') {
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({
        content: 'Este comando solo funciona dentro de un servidor.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      await interaction.editReply('Debes estar dentro de un canal de voz para que Atlas entre.');
      return;
    }

    const permissions = voiceChannel.permissionsFor(interaction.client.user.id);

    if (!permissions?.has(PermissionsBitField.Flags.ViewChannel)) {
      await interaction.editReply('No tengo permiso para ver ese canal de voz.');
      return;
    }

    if (!permissions?.has(PermissionsBitField.Flags.Connect)) {
      await interaction.editReply('No tengo permiso para conectarme a ese canal de voz.');
      return;
    }

    if (!permissions?.has(PermissionsBitField.Flags.Speak)) {
      await interaction.editReply('No tengo permiso para hablar en ese canal de voz.');
      return;
    }

    const existingConnection = getVoiceConnection(interaction.guildId);
    if (existingConnection) {
      existingConnection.destroy();
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

    await interaction.editReply(`🎤 Atlas entró a **${voiceChannel.name}**`);
    return;
  }

  if (interaction.commandName === 'leave') {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Este comando solo funciona dentro de un servidor.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const connection = getVoiceConnection(interaction.guildId);

    if (!connection) {
      await interaction.editReply('Atlas no está conectado a ningún canal de voz.');
      return;
    }

    connection.destroy();
    await interaction.editReply('👋 Atlas salió del canal de voz');
    return;
  }
}

client.login(env.DISCORD_TOKEN);