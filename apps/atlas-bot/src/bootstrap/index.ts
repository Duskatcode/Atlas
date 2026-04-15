import { Events } from 'discord.js';

import { env } from '../config/index.js';
import { createBotContext } from '../context/bot-context.js';
import { registerEventHandlers } from '../router/event-router.js';
import { registerInteractionRouter } from '../router/interaction-router.js';
import { createDiscordClient } from './client.js';
import { bootstrapModuleRegistry, logModuleSummary } from './modules.js';

export const bootstrapAtlasBot = async (): Promise<void> => {
  const client = createDiscordClient();
  const registry = bootstrapModuleRegistry(client);
  const context = createBotContext({ client, registry });

  await registry.initializeModules();
  logModuleSummary(registry);

  registerEventHandlers(context);
  registerInteractionRouter(context);

  client.once(Events.ClientReady, (readyClient) => {
    context.logger.info(`✅ Atlas encendido como ${readyClient.user.tag}`);
  });

  await client.login(env.DISCORD_TOKEN);
};
