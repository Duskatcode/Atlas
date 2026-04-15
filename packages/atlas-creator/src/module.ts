import type { AtlasModule, SlashCommandHandler } from '@atlas/types';

import { buildCreatorCommand } from './commands/creator-command.js';
import { createCreatorCommandHandler } from './interactions/creator-command-handler.js';
import { createTemplateRegistryService } from './services/template-registry-service.js';

export const createAtlasCreatorModule = (): AtlasModule => {
  const templateRegistry = createTemplateRegistryService();
  const handleCreatorCommand = createCreatorCommandHandler({ templateRegistry });

  const slashCommands: SlashCommandHandler[] = [
    {
      id: 'atlas-creator:creator',
      data: buildCreatorCommand(),
      execute: handleCreatorCommand,
    },
  ];

  return {
    id: 'atlas-creator',
    name: 'Atlas Creator',
    description: 'Módulo de plantillas y planificación segura para comunidades.',
    defaultEnabled: false,
    slashCommands,
  };
};
