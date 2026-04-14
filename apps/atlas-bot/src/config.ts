import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID_1: z.string().min(1),
  DISCORD_GUILD_ID_2: z.string().min(1),
  LAVALINK_HOST: z.string().min(1),
  LAVALINK_PORT: z.coerce.number().int().positive(),
  LAVALINK_PASSWORD: z.string().min(1),
  ENABLE_ATLAS_SONGER: z.string().optional(),
  ENABLE_ATLAS_CREATOR: z.string().optional(),
});

export const env = envSchema.parse(process.env);
