import { AtlasModuleRegistry } from '@atlas/core';
import { createConsoleLogger } from '@atlas/shared';
import type { Client } from 'discord.js';
import { createLocalModules, createRuntimeModuleFlags } from '../modules/index.js';

export const bootstrapModuleRegistry = (client: Client) => {
  const registry = new AtlasModuleRegistry({
    client,
    flags: createRuntimeModuleFlags(),
    logger: createConsoleLogger('atlas:registry'),
  });

  registry.registerModules(createLocalModules());

  return registry;
};

export const logModuleSummary = (registry: AtlasModuleRegistry): void => {
  const summaries = registry.getModuleSummaries();
  const enabled = summaries.filter((item) => item.enabled);
  const disabled = summaries.filter((item) => !item.enabled);

  if (summaries.length === 0) {
    console.warn('[atlas:modules] No hay módulos registrados.');
    return;
  }

  console.log(
    `[atlas:modules] Activos: ${
      enabled.length ? enabled.map((item) => item.name).join(', ') : 'ninguno'
    }.`,
  );

  if (disabled.length > 0) {
    console.log(
      `[atlas:modules] Deshabilitados: ${disabled.map((item) => item.name).join(', ')}.`,
    );
  }
};
