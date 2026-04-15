import { createModuleFlagConfig, createModuleFlagSourceFromEnv } from '@atlas/shared';
import type { AtlasModule, AtlasModuleFlags } from '@atlas/types';

import { env } from '../config/index.js';

import { createAtlasCreatorPlaceholderModule } from './atlas-creator-placeholder.js';
import { createAtlasSongerModule } from './atlas-songer.js';

export const createLocalModules = (): AtlasModule[] => [
  createAtlasSongerModule(),
  createAtlasCreatorPlaceholderModule(),
];

export const createRuntimeModuleFlags = (
  overrides?: Partial<Record<string, string | number | boolean | null | undefined>>,
): AtlasModuleFlags => {
  return createModuleFlagConfig({
    ...createModuleFlagSourceFromEnv(env),
    ...overrides,
  });
};
