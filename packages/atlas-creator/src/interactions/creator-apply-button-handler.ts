import { MessageFlags, type ButtonInteraction } from 'discord.js';

import {
  assertCreatorBotPermissions,
  assertCreatorGuildContext,
  assertCreatorUserAccess,
} from '../domain/policies/creator-access-policy.js';
import { parseCreatorApplyCustomId } from '../infra/apply-confirmation-custom-id.js';
import { renderApplyResult } from '../services/apply-result-renderer-service.js';
import type { ApplyConfirmationService } from '../services/apply-confirmation-service.js';
import { applyTemplatePlanSafely } from '../services/template-apply-service.js';
import type { TemplateRegistryService } from '../services/template-registry-service.js';

interface CreatorApplyButtonHandlerOptions {
  templateRegistry: TemplateRegistryService;
  confirmationService: ApplyConfirmationService;
}

export const createCreatorApplyButtonHandler = (
  options: CreatorApplyButtonHandlerOptions,
) => {
  const { templateRegistry, confirmationService } = options;

  return async (interaction: ButtonInteraction): Promise<void> => {
    const parsed = parseCreatorApplyCustomId(interaction.customId);
    if (!parsed) {
      return;
    }

    const request = confirmationService.getRequest(parsed.requestId);
    if (!request) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content:
          'Esta confirmación ya no está disponible. Ejecuta `/creator apply` nuevamente.',
      });
      return;
    }

    if (request.userId !== interaction.user.id) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: 'Solo el usuario que inició el apply puede confirmar esta acción.',
      });
      return;
    }

    if (confirmationService.isExpired(request)) {
      confirmationService.cancelRequest(request.id);
      await interaction.update({
        content:
          'La confirmación expiró. Vuelve a ejecutar `/creator apply` para generar un nuevo preview.',
        components: [],
      });
      return;
    }

    if (parsed.action === 'cancel') {
      confirmationService.cancelRequest(request.id);
      await interaction.update({
        content: 'Apply cancelado. No se realizaron cambios en el servidor.',
        components: [],
      });
      return;
    }

    confirmationService.consumeRequest(request.id);
    await interaction.deferUpdate();

    try {
      const guild = assertCreatorGuildContext(interaction);
      if (guild.id !== request.guildId) {
        throw new Error('La confirmación no corresponde a este servidor.');
      }

      assertCreatorUserAccess(interaction);
      assertCreatorBotPermissions(interaction);

      const template = templateRegistry.getTemplateOrThrow(request.templateId);
      const result = await applyTemplatePlanSafely({
        guild,
        template,
        input: request.input,
      });

      await interaction.editReply({
        content: renderApplyResult(result),
        components: [],
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? `No se pudo aplicar la plantilla: ${error.message}`
          : 'No se pudo aplicar la plantilla por un error inesperado.';

      await interaction.editReply({
        content: `❌ ${message}`,
        components: [],
      });
    }
  };
};
