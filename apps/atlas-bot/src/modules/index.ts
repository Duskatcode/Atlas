import { AtlasModuleRegistry } from '@atlas/core';
import { createConsoleLogger, createModuleFlagConfig } from '@atlas/shared';
import type { AtlasModule } from '@atlas/types';
import type { Client } from 'discord.js';
import { env } from '../config.js';

const placeholderModules: AtlasModule[] = [
  {
    id: 'atlas-songer',
    name: 'Atlas Songer',
    description: 'Base musical de Atlas.',
    defaultEnabled: true,
  },
  {
    id: 'atlas-creator',
    name: 'Atlas Creator',
    description: 'Herramientas creativas para creadores.',
    defaultEnabled: false,
  },
];

export const bootstrapModuleRegistry = (client: Client): AtlasModuleRegistry => {
  const flags = createModuleFlagConfig({
    'atlas-songer': env.ENABLE_ATLAS_SONGER,
    'atlas-creator': env.ENABLE_ATLAS_CREATOR,
  });

  const registry = new AtlasModuleRegistry({
    client,
    flags,
    logger: createConsoleLogger('atlas:registry'),
  });

  for (const definition of placeholderModules) {
    registry.registerModule(definition);
  }

  return registry;
};

export const logModuleSummary = (registry: AtlasModuleRegistry): void => {
  const summaries = registry.getModuleSummaries();
  const enabledModules = summaries.filter((summary) => summary.enabled);
  const disabledModules = summaries.filter((summary) => !summary.enabled);

  if (summaries.length === 0) {
    console.warn('[modules] No se encontraron módulos registrados.');
    return;
  }

  console.log(
    `[modules] Activos: ${enabledModules
      .map((module) => module.name)
      .join(', ') || 'ninguno'}.`,
  );

  if (disabledModules.length > 0) {
    console.log(
      `[modules] Deshabilitados: ${disabledModules
        .map((module) => module.name)
        .join(', ')}.`,
    );
  }
};
