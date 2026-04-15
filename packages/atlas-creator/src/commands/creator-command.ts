import type { SlashCommandHandler } from '@atlas/types';
import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import {
  ATLAS_CREATOR_COMMAND_NAME,
  ATLAS_CREATOR_DEFAULT_TEMPLATE_ID,
} from '../config/index.js';
import type { CreatorPlanItem } from '../domain/planner/index.js';
import { listCreatorTemplates, previewCreatorTemplate } from '../services/index.js';

const previewTemplateChoices = listCreatorTemplates()
  .slice(0, 25)
  .map((template) => ({
    name: template.name,
    value: template.id,
  }));

const formatTemplateList = () => {
  const templates = listCreatorTemplates();

  const lines = templates.map(
    (template, index) =>
      `${index + 1}. **${template.name}** (\`${template.id}\`)` +
      `\n   ${template.description}` +
      `\n   Recursos previstos: **${template.plannedResourceCount}**`,
  );

  return [
    '## Plantillas disponibles',
    ...lines,
    '',
    `Usa \`/${ATLAS_CREATOR_COMMAND_NAME} preview\` para revisar el plan sin aplicar cambios.`,
  ].join('\n');
};

const formatPlanItem = (item: CreatorPlanItem, index: number) => {
  const parent = item.parentName ? ` dentro de **${item.parentName}**` : '';
  return `${index + 1}. Crear **${item.kind}** \`${item.targetName}\`${parent}\n   ${item.description}`;
};

const formatTemplatePreview = (templateId: string) => {
  const plan = previewCreatorTemplate(templateId);

  if (!plan) {
    return null;
  }

  return [
    `## Preview: ${plan.template.name}`,
    `Template: \`${plan.template.id}\``,
    plan.template.description,
    '',
    plan.summary,
    '',
    '### Política actual',
    `- Modo: **${plan.policy.mode}**`,
    `- Apply habilitado: **${plan.policy.allowsApply ? 'sí' : 'no'}**`,
    `- Cambios destructivos: **${plan.policy.allowsDestructiveChanges ? 'sí' : 'no'}**`,
    `- Estrategia ante duplicados: **${plan.policy.duplicateStrategy}**`,
    '',
    '### Plan de cambios propuesto',
    ...plan.items.map(formatPlanItem),
    '',
    'Este preview es informativo. En esta versión no se modifica el servidor.',
  ].join('\n');
};

const handleTemplatesSubcommand = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply({
    content: formatTemplateList(),
    flags: MessageFlags.Ephemeral,
  });
};

const handlePreviewSubcommand = async (interaction: ChatInputCommandInteraction) => {
  const templateId =
    interaction.options.getString('template') ?? ATLAS_CREATOR_DEFAULT_TEMPLATE_ID;
  const preview = formatTemplatePreview(templateId);

  if (!preview) {
    await interaction.reply({
      content: `No encontré la plantilla \`${templateId}\`. Usa \`/${ATLAS_CREATOR_COMMAND_NAME} templates\` para ver las disponibles.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    content: preview,
    flags: MessageFlags.Ephemeral,
  });
};

const creatorCommand = new SlashCommandBuilder()
  .setName(ATLAS_CREATOR_COMMAND_NAME)
  .setDescription('Explora plantillas y revisa previews seguros de Atlas Creator.')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('templates')
      .setDescription('Lista las plantillas disponibles para Atlas Creator.'),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('preview')
      .setDescription('Muestra el plan de cambios de una plantilla sin tocar el servidor.')
      .addStringOption((option) =>
        option
          .setName('template')
          .setDescription('Template a previsualizar.')
          .addChoices(...previewTemplateChoices),
      ),
  );

export const creatorSlashCommandHandler: SlashCommandHandler = {
  id: 'atlas-creator.command.creator',
  description: 'Surface principal de Atlas Creator.',
  data: creatorCommand,
  execute: async (interaction) => {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'templates') {
      await handleTemplatesSubcommand(interaction);
      return;
    }

    if (subcommand === 'preview') {
      await handlePreviewSubcommand(interaction);
      return;
    }

    await interaction.reply({
      content: 'Subcomando de Atlas Creator no reconocido.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
