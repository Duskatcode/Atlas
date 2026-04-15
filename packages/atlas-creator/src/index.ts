import type { AtlasModule } from '@atlas/types';
import { creatorSlashCommandHandler } from './commands/index.js';
import {
  creatorButtonHandlers,
  creatorModalHandlers,
  creatorSelectMenuHandlers,
} from './interactions/index.js';

export const createAtlasCreatorModule = (): AtlasModule => {
  return {
    id: 'atlas-creator',
    name: 'Atlas Creator',
    description: 'Templates seguros y previews de estructura para servidores de Discord.',
    defaultEnabled: false,
    slashCommands: [creatorSlashCommandHandler],
    buttonHandlers: creatorButtonHandlers,
    selectMenuHandlers: creatorSelectMenuHandlers,
    modalHandlers: creatorModalHandlers,
  };
};
