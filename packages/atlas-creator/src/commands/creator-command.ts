import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';
import { SlashCommandBuilder } from 'discord.js';

export const buildCreatorCommand = (): RESTPostAPIChatInputApplicationCommandsJSONBody =>
  new SlashCommandBuilder()
    .setName('creator')
    .setDescription('Herramientas de estructura y plantillas para comunidades')
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('templates')
        .setDescription('Lista las plantillas disponibles en Atlas Creator'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('preview')
        .setDescription('Genera un preview del plan de cambios de una plantilla')
        .addStringOption((option) =>
          option
            .setName('template')
            .setDescription('ID de plantilla (ejemplo: basic-community)')
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('community_name')
            .setDescription('Nombre de comunidad para personalizar el preview')
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('apply')
        .setDescription('Aplica de forma segura la plantilla en el servidor')
        .addStringOption((option) =>
          option
            .setName('template')
            .setDescription('ID de plantilla (ejemplo: basic-community)')
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('community_name')
            .setDescription('Nombre de comunidad para personalizar el apply')
            .setRequired(false),
        ),
    )
    .toJSON();
