import type { AtlasModule } from '@atlas/types';

export const createAtlasCreatorPlaceholderModule = (): AtlasModule => ({
  id: 'atlas-creator',
  name: 'Atlas Creator (placeholder)',
  description:
    'Base inicial para herramientas creativas. Pendiente de implementación.',
  defaultEnabled: false,
});
