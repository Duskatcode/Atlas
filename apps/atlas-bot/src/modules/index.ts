import { createModuleFlagConfig, createModuleFlagSourceFromEnv, isModuleFlagEnabled } from '@atlas/shared';
import { createAtlasSongerModule } from '@atlas/songer';
import type { AtlasModule, AtlasModuleFlags, ModuleFlagSource, SlashCommandData } from '@atlas/types';
import { env } from '../config/index.js';

export const createRuntimeModuleFlags = (source?: ModuleFlagSource): AtlasModuleFlags => {
  const envSource = createModuleFlagSourceFromEnv(env);
  return createModuleFlagConfig({ ...envSource, ...source });
};

export const createLocalModules = (): AtlasModule[] => {
  return [
    createAtlasSongerModule({
      lavalink: {
        host: env.LAVALINK_HOST,
        port: env.LAVALINK_PORT,
        password: env.LAVALINK_PASSWORD,
      },
    }),
  ];
};

const toCommandJson = (command: SlashCommandData) => command;

export const collectSlashCommandData = (overrides?: ModuleFlagSource) => {
  const flags = createRuntimeModuleFlags(overrides);

  return createLocalModules()
    .filter((module) => isModuleFlagEnabled(module.id, flags, module.defaultEnabled ?? false))
    .flatMap((module) => module.slashCommands ?? [])
    .map((handler) => {
      const data = handler.data;

      if ('toJSON' in data && typeof data.toJSON === 'function') {
        return data.toJSON();
      }

      return toCommandJson(data);
    });
};
