import { Client, GatewayIntentBits } from 'discord.js';

export const createDiscordClient = () => {
  return new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  });
};
