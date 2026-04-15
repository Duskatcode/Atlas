import type { AtlasModule } from '@atlas/types';

export const createAtlasCreatorModule = (): AtlasModule => {
  return {
    id: 'atlas-creator',
    name: 'Atlas Creator',
    description: 'Base inicial para plantillas y administración de servidores.',
    defaultEnabled: false,
  };
};
