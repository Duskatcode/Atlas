import { Client } from 'discord.js';
import { Connectors, Shoukaku } from 'shoukaku';
import { env } from '../config/index.js';

let shoukaku: Shoukaku | null = null;

export function initShoukaku(client: Client) {
  if (shoukaku) return shoukaku;

  shoukaku = new Shoukaku(
    new Connectors.DiscordJS(client),
    [
      {
        name: 'atlas-local',
        url: `${env.LAVALINK_HOST}:${env.LAVALINK_PORT}`,
        auth: env.LAVALINK_PASSWORD,
      },
    ],
    {
      resume: true,
      resumeTimeout: 60,
      reconnectTries: 5,
      reconnectInterval: 5,
      restTimeout: 30,
      voiceConnectionTimeout: 15,
    },
  );

  shoukaku.on('error', (_, error) => {
    console.error('❌ Shoukaku/Lavalink error:', error);
  });

  return shoukaku;
}

export function getShoukaku() {
  if (!shoukaku) {
    throw new Error('Shoukaku aún no fue inicializado.');
  }

  return shoukaku;
}
