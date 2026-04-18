import type { SlashCommandHandler } from '@atlas/types';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import {
  ATLAS_CREATOR_APPLY_CONFIRMATION_TTL_MS,
  ATLAS_CREATOR_COMMAND_NAME,
  ATLAS_CREATOR_DEFAULT_TEMPLATE_ID,
} from '../config/index.js';
import type { CreatorPlanItem } from '../domain/planner/index.js';
import { CREATOR_SAFE_APPLY_POLICY } from '../domain/policies/index.js';
import {
  assertCanApplyCreatorTemplate,
  createCreatorApplyConfirmation,
  listCreatorTemplates,
  previewCreatorTemplate,
} from '../services/index.js';

const applyConfirmCustomId = (confirmationId: string) =>
  `creator:apply:confirm:${confirmationId}`;
const applyCancelCustomId = (confirmationId: string) =>
  `creator:apply:cancel:${confirmationId}`;

const templateChoices = listCreatorTemplates()
  .slice(0, 25)
  .map((template) => ({
    name: template.name,
    value: template.id,
  }));

const applyConfirmationMinutes = Math.ceil(
  ATLAS_CREATOR_APPLY_CONFIRMATION_TTL_MS / 60_000,
);

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
    `Usa \`/${ATLAS_CREATOR_COMMAND_NAME} apply\` para ejecutar create-or-skip con confirmacion.`,
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
    '### Politica actual',
    `- Modo: **${plan.policy.mode}**`,
    `- Apply habilitado: **${plan.policy.allowsApply ? 'si' : 'no'}**`,
    `- Cambios destructivos: **${plan.policy.allowsDestructiveChanges ? 'si' : 'no'}**`,
    `- Estrategia ante duplicados: **${plan.policy.duplicateStrategy}**`,
    '',
    '### Plan de cambios propuesto',
    ...plan.items.map(formatPlanItem),
    '',
    'Este preview es informativo. En esta version no se modifica el servidor.',
  ].join('\n');
};

const formatApplyConfirmation = (templateId: string) => {
  const preview = formatTemplatePreview(templateId);
  if (!preview) {
    return null;
  }

  return [
    preview,
    '',
    '### Confirmacion requerida',
    `Si confirmas, Atlas aplicara politica create-or-skip (\`${CREATOR_SAFE_APPLY_POLICY.duplicateStrategy}\`): crea faltantes y omite existentes.`,
    'No se eliminan recursos ni se sobreescriben configuraciones existentes.',
    `Esta confirmacion expira en **${applyConfirmationMinutes} min**.`,
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
      content: `No encontre la plantilla \`${templateId}\`. Usa \`/${ATLAS_CREATOR_COMMAND_NAME} templates\` para ver las disponibles.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    content: preview,
    flags: MessageFlags.Ephemeral,
  });
};

const handleApplySubcommand = async (interaction: ChatInputCommandInteraction) => {
  const templateId =
    interaction.options.getString('template') ?? ATLAS_CREATOR_DEFAULT_TEMPLATE_ID;
  const confirmationPreview = formatApplyConfirmation(templateId);

  if (!confirmationPreview) {
    await interaction.reply({
      content: `No encontre la plantilla \`${templateId}\`. Usa \`/${ATLAS_CREATOR_COMMAND_NAME} templates\` para ver las disponibles.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await assertCanApplyCreatorTemplate(interaction);
  const confirmation = createCreatorApplyConfirmation({
    templateId,
    guildId: interaction.guildId!,
    requestedByUserId: interaction.user.id,
  });

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(applyConfirmCustomId(confirmation.id))
      .setLabel('Confirmar apply')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(applyCancelCustomId(confirmation.id))
      .setLabel('Cancelar')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({
    content: confirmationPreview,
    components: [actionRow],
    flags: MessageFlags.Ephemeral,
  });
};

const creatorCommand = new SlashCommandBuilder()
  .setName(ATLAS_CREATOR_COMMAND_NAME)
  .setDescription('Explora plantillas y ejecuta apply seguro de Atlas Creator.')
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
          .addChoices(...templateChoices),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('apply')
      .setDescription('Aplica una plantilla en modo seguro create-or-skip.')
      .addStringOption((option) =>
        option
          .setName('template')
          .setDescription('Template a aplicar.')
          .addChoices(...templateChoices),
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

    if (subcommand === 'apply') {
      await handleApplySubcommand(interaction);
      return;
    }

    await interaction.reply({
      content: 'Subcomando de Atlas Creator no reconocido.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
