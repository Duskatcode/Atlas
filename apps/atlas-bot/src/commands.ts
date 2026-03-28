import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Responde con pong'),

  new SlashCommandBuilder()
    .setName('join')
    .setDescription('Atlas entra al canal de voz'),

  new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Atlas sale del canal de voz')
].map(command => command.toJSON());