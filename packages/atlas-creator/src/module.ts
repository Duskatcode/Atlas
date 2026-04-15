import type { AtlasModule, ButtonHandler, SlashCommandHandler } from '@atlas/types';

import { buildCreatorCommand } from './commands/creator-command.js';
import { CREATOR_APPLY_CONFIRMATION_TTL_MS } from './config/creator-config.js';
import { creatorApplyButtonMatcher } from './infra/apply-confirmation-custom-id.js';
import { createCreatorApplyButtonHandler } from './interactions/creator-apply-button-handler.js';
import { createCreatorCommandHandler } from './interactions/creator-command-handler.js';
import { createApplyConfirmationService } from './services/apply-confirmation-service.js';
import { createTemplateRegistryService } from './services/template-registry-service.js';

export const createAtlasCreatorModule = (): AtlasModule => {
  const templateRegistry = createTemplateRegistryService();
  const confirmationService = createApplyConfirmationService({
    ttlMs: CREATOR_APPLY_CONFIRMATION_TTL_MS,
  });
  const handleCreatorCommand = createCreatorCommandHandler({
    templateRegistry,
    confirmationService,
  });
  const handleApplyButton = createCreatorApplyButtonHandler({
    templateRegistry,
    confirmationService,
  });

  const slashCommands: SlashCommandHandler[] = [
    {
      id: 'atlas-creator:creator',
      data: buildCreatorCommand(),
      execute: handleCreatorCommand,
    },
  ];

  const buttonHandlers: ButtonHandler[] = [
    {
      id: 'atlas-creator:apply-confirmation',
      customId: creatorApplyButtonMatcher,
      execute: handleApplyButton,
    },
  ];

  const cleanupIntervalMs = Math.min(CREATOR_APPLY_CONFIRMATION_TTL_MS, 60_000);

  return {
    id: 'atlas-creator',
    name: 'Atlas Creator',
    description: 'Módulo de plantillas y planificación segura para comunidades.',
    defaultEnabled: false,
    slashCommands,
    buttonHandlers,
    setup: ({ logger }) => {
      const timer = setInterval(() => {
        confirmationService.clearExpired();
      }, cleanupIntervalMs);

      timer.unref?.();
      logger.info(
        `Creator apply confirmation cleanup activo cada ${cleanupIntervalMs}ms.`,
      );
    },
  };
};
