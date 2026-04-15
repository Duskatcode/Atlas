import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ChatInputCommandInteraction,
} from 'discord.js';

import {
  CREATOR_APPLY_PREVIEW_MESSAGE_LIMIT,
} from '../config/creator-config.js';
import {
  assertCreatorBotPermissions,
  assertCreatorGuildContext,
  assertCreatorUserAccess,
} from '../domain/policies/creator-access-policy.js';
import { assertPreviewPolicy } from '../domain/policies/preview-policy.js';
import { createTemplateChangePlan } from '../domain/planner/template-planner.js';
import { buildCreatorApplyCustomId } from '../infra/apply-confirmation-custom-id.js';
import type { ApplyConfirmationService } from '../services/apply-confirmation-service.js';
import type { TemplateRegistryService } from '../services/template-registry-service.js';
import { renderPreviewPlan } from '../services/preview-renderer-service.js';

interface CreatorCommandHandlerOptions {
  templateRegistry: TemplateRegistryService;
  confirmationService: ApplyConfirmationService;
}

export const createCreatorCommandHandler = (
  options: CreatorCommandHandlerOptions,
) => {
  const { templateRegistry, confirmationService } = options;

  return async (interaction: ChatInputCommandInteraction): Promise<void> => {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'templates') {
      const templates = templateRegistry.listTemplates();
      const lines = templates.map(
        (template) =>
          `- \`${template.metadata.id}\` · **${template.metadata.name}** · ${template.metadata.summary}`,
      );

      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: [
          '## Atlas Creator Templates',
          ...(lines.length > 0 ? lines : ['- (sin plantillas registradas)']),
        ].join('\n'),
      });
      return;
    }

    if (subcommand === 'preview') {
      assertPreviewPolicy({ applyRequested: false });

      const templateId = interaction.options.getString('template', true);
      const communityName = interaction.options.getString('community_name') ?? undefined;

      const template = templateRegistry.getTemplateOrThrow(templateId);
      const plan = createTemplateChangePlan(template, { communityName });
      const preview = renderPreviewPlan(plan);

      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: preview,
      });
      return;
    }

    if (subcommand === 'apply') {
      const guild = assertCreatorGuildContext(interaction);
      assertCreatorUserAccess(interaction);
      assertCreatorBotPermissions(interaction);

      const templateId = interaction.options.getString('template', true);
      const communityName = interaction.options.getString('community_name') ?? undefined;
      const template = templateRegistry.getTemplateOrThrow(templateId);
      const plan = createTemplateChangePlan(template, { communityName });
      const preview = renderPreviewPlan(plan, {
        maxLength: CREATOR_APPLY_PREVIEW_MESSAGE_LIMIT,
      });

      const request = confirmationService.createRequest({
        userId: interaction.user.id,
        guildId: guild.id,
        templateId,
        templateInput: { communityName },
      });

      const expireTimestamp = Math.floor(request.expiresAt / 1000);
      const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(buildCreatorApplyCustomId('confirm', request.id))
          .setLabel('Confirmar apply')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(buildCreatorApplyCustomId('cancel', request.id))
          .setLabel('Cancelar')
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: [
          preview,
          '',
          '### Confirmación requerida',
          'Safe apply: se crearán solo recursos faltantes, sin borrar ni sobrescribir recursos existentes.',
          `Esta confirmación expira <t:${expireTimestamp}:R>.`,
        ].join('\n'),
        components: [confirmRow],
      });
      return;
    }

    throw new Error(`Subcomando de creator no soportado: ${subcommand}`);
  };
};
