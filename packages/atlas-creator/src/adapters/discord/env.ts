import { z } from 'zod';

import type { DiscordEnvironment } from './types.js';

const discordEnvironmentSchema = z.object({
  DISCORD_TOKEN: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
});

export const readDiscordEnvironment = (
  source: Record<string, string | undefined>,
): DiscordEnvironment => {
  const parsed = discordEnvironmentSchema.parse(source);

  return {
    token: parsed.DISCORD_TOKEN,
    guildId: parsed.DISCORD_GUILD_ID,
    applicationId: parsed.DISCORD_CLIENT_ID,
  };
};

export const assertDiscordEnvironment = (
  env: DiscordEnvironment,
): Required<Pick<DiscordEnvironment, 'token' | 'guildId'>> &
  Pick<DiscordEnvironment, 'applicationId'> => {
  if (!env.token || !env.guildId) {
    throw new Error(
      'Faltan variables de entorno para Discord. Requiere DISCORD_TOKEN y DISCORD_GUILD_ID.',
    );
  }

  return {
    token: env.token,
    guildId: env.guildId,
    applicationId: env.applicationId,
  };
};
