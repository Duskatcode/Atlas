import { createModuleFlagConfig, createModuleFlagSourceFromEnv } from '@atlas/shared';
import { createAtlasCreatorModule } from '@atlas/creator';
import { createAtlasSongerModule } from '@atlas/songer';
import type { AtlasModule, AtlasModuleFlags } from '@atlas/types';

import { env } from '../config/index.js';

export const createLocalModules = (): AtlasModule[] => [
  createAtlasSongerModule({
    lavalink: {
      host: env.LAVALINK_HOST,
      port: env.LAVALINK_PORT,
      password: env.LAVALINK_PASSWORD,
    },
  }),
  createAtlasCreatorModule(),
];

export const createRuntimeModuleFlags = (
  overrides?: Partial<Record<string, string | number | boolean | null | undefined>>,
): AtlasModuleFlags => {
  return createModuleFlagConfig({
    ...createModuleFlagSourceFromEnv(env),
    ...overrides,
  });
};
