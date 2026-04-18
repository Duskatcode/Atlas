import type { ButtonHandler } from '@atlas/types';
import {
  type ButtonInteraction,
} from 'discord.js';
import {
  applyCreatorTemplateSafely,
  assertCanApplyCreatorTemplate,
  cancelCreatorApplyConfirmation,
  consumeCreatorApplyConfirmation,
  formatCreatorApplyReport,
  getCreatorApplyConfirmation,
} from '../services/index.js';

const confirmApplyPattern = /^creator:apply:confirm:([0-9a-f-]+)$/;
const cancelApplyPattern = /^creator:apply:cancel:([0-9a-f-]+)$/;

const extractConfirmationId = (pattern: RegExp, customId: string): string | null => {
  const matches = customId.match(pattern);
  return matches?.[1] ?? null;
};

const assertConfirmationOwnership = (
  interaction: ButtonInteraction,
  ownerUserId: string,
) => {
  if (interaction.user.id !== ownerUserId) {
    throw new Error('Solo el usuario que inicio este apply puede confirmar o cancelar.');
  }
};

const handleExpiredConfirmation = async (interaction: ButtonInteraction) => {
  await interaction.update({
    content:
      'La confirmacion de apply ya expiro o fue procesada. Ejecuta `/creator apply` de nuevo.',
    components: [],
  });
};

export const creatorApplyConfirmButtonHandler: ButtonHandler = {
  id: 'atlas-creator.button.apply-confirm',
  description: 'Confirma y ejecuta apply seguro de una plantilla.',
  customId: confirmApplyPattern,
  execute: async (interaction) => {
    const confirmationId = extractConfirmationId(confirmApplyPattern, interaction.customId);
    if (!confirmationId) {
      return;
    }

    const pending = getCreatorApplyConfirmation(confirmationId);
    if (!pending) {
      await handleExpiredConfirmation(interaction);
      return;
    }

    assertConfirmationOwnership(interaction, pending.requestedByUserId);

    if (!interaction.guild || interaction.guildId !== pending.guildId) {
      throw new Error('El contexto del servidor cambio. Inicia el apply nuevamente.');
    }

    await assertCanApplyCreatorTemplate(interaction);
    const confirmation = consumeCreatorApplyConfirmation(confirmationId);
    if (!confirmation) {
      await handleExpiredConfirmation(interaction);
      return;
    }

    await interaction.update({
      content: 'Ejecutando apply seguro. Esto puede tomar unos segundos...',
      components: [],
    });

    const report = await applyCreatorTemplateSafely(
      interaction.guild,
      confirmation.templateId,
    );

    await interaction.editReply({
      content: formatCreatorApplyReport(report),
      components: [],
    });
  },
};

export const creatorApplyCancelButtonHandler: ButtonHandler = {
  id: 'atlas-creator.button.apply-cancel',
  description: 'Cancela apply seguro de una plantilla.',
  customId: cancelApplyPattern,
  execute: async (interaction) => {
    const confirmationId = extractConfirmationId(cancelApplyPattern, interaction.customId);
    if (!confirmationId) {
      return;
    }

    const pending = getCreatorApplyConfirmation(confirmationId);
    if (!pending) {
      await handleExpiredConfirmation(interaction);
      return;
    }

    assertConfirmationOwnership(interaction, pending.requestedByUserId);
    cancelCreatorApplyConfirmation(confirmationId);

    await interaction.update({
      content: 'Apply cancelado. No se realizaron cambios en el servidor.',
      components: [],
    });
  },
};
