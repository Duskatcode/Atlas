import type { AtlasModuleRegistry } from '@atlas/core';
import { createConsoleLogger } from '@atlas/shared';
import type { AtlasLogger } from '@atlas/types';
import type { Client } from 'discord.js';

export interface BotContextOptions {
  client: Client;
  registry: AtlasModuleRegistry;
  logger?: AtlasLogger;
}

export interface BotContext {
  client: Client;
  registry: AtlasModuleRegistry;
  logger: AtlasLogger;
}

export const createBotContext = (options: BotContextOptions): BotContext => {
  return {
    client: options.client,
    registry: options.registry,
    logger: options.logger ?? createConsoleLogger('atlas:bot'),
  };
};
