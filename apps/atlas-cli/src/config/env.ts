import 'dotenv/config';
import {
  NoopDiscordAdapter,
  assertDiscordEnvironment,
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
  const rawDiscordEnvironment = readDiscordEnvironment(process.env);
  const discordEnvironment = assertDiscordEnvironment(rawDiscordEnvironment);

  return new NoopDiscordAdapter({ guildId: discordEnvironment.guildId });
};
