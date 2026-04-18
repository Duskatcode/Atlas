import 'dotenv/config';
import {
  DiscordJsAdapter,
  readDiscordEnvironment,
  type DiscordAdapter,
} from '@atlas/creator';
import { z } from 'zod';

const cliEnvironmentSchema = z.object({
  CREATOR_DEFAULT_SPEC: z.string().optional(),
  CREATOR_DEFAULT_SNAPSHOT: z.string().optional(),
  CREATOR_DEFAULT_PLAN: z.string().optional(),
});

export const cliEnvironment = cliEnvironmentSchema.parse(process.env);

export const createDiscordAdapterFromEnv = (): DiscordAdapter => {
  const discordEnvironment = readDiscordEnvironment(process.env);
  if (!discordEnvironment.token) {
    throw new Error('Falta DISCORD_TOKEN para conectarse a Discord.');
  }

  return new DiscordJsAdapter({
    token: discordEnvironment.token,
    guildId: discordEnvironment.guildId,
  });
};
