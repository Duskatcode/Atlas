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
    .setDescription('Atlas sale del canal de voz'),

  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduce audio desde una URL directa o un archivo local')
    .addStringOption((option) =>
      option
        .setName('source')
        .setDescription('URL directa o nombre del archivo dentro de assets/audio')
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pausa la reproducción actual'),

  new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Reanuda la reproducción actual'),

  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Detiene la reproducción actual'),

  new SlashCommandBuilder()
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

  new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Muestra lo que Atlas está reproduciendo'),
].map((command) => command.toJSON());