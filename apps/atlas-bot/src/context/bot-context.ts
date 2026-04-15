import type { AtlasModuleRegistry } from '@atlas/core';
import { createConsoleLogger } from '@atlas/shared';
import type { Client } from 'discord.js';

export interface AtlasBotContext {
  client: Client;
  registry: AtlasModuleRegistry;
  logger: ReturnType<typeof createConsoleLogger>;
}

export const createBotContext = (options: {
  client: Client;
  registry: AtlasModuleRegistry;
  logger?: ReturnType<typeof createConsoleLogger>;
}): AtlasBotContext => {
  return {
    client: options.client,
    registry: options.registry,
    logger: options.logger ?? createConsoleLogger('atlas:bot'),
  };
};
