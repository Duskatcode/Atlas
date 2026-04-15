import { isModuleFlagEnabled } from '@atlas/shared';
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';

import { createLocalModules, createRuntimeModuleFlags } from './index.js';

const toCommandJson = (
  command: RESTPostAPIChatInputApplicationCommandsJSONBody,
): RESTPostAPIChatInputApplicationCommandsJSONBody => command;

export const collectSlashCommandData = (
  overrides?: Partial<Record<string, string | number | boolean | null | undefined>>,
): RESTPostAPIChatInputApplicationCommandsJSONBody[] => {
  const flags = createRuntimeModuleFlags(overrides);

  return createLocalModules()
    .filter((module) =>
      isModuleFlagEnabled(module.id, flags, module.defaultEnabled ?? false),
    )
    .flatMap((module) => module.slashCommands ?? [])
    .map((handler) => {
      const data = handler.data;
      if (typeof (data as any).toJSON === 'function') {
        return (data as any).toJSON();
      }

      return toCommandJson(data as RESTPostAPIChatInputApplicationCommandsJSONBody);
    });
};
