import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID_1: z.string().min(1),
  DISCORD_GUILD_ID_2: z.string().min(1)
});

export const env = envSchema.parse(process.env);