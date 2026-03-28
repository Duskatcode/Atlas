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
    .setDescription('Reproduce una URL, playlist o búsqueda')
    .addStringOption((option) =>
      option
        .setName('source')
        .setDescription('URL, playlist o texto de búsqueda')
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
    .setDescription('Detiene la reproducción y vacía la cola'),

  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Salta a la siguiente pista'),

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
    .setDescription('Muestra la pista actual'),
].map((command) => command.toJSON());