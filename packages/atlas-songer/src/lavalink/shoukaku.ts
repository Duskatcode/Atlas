import type { Client } from 'discord.js';
import { Connectors, Shoukaku } from 'shoukaku';

import type { AtlasSongerLavalinkConfig } from '../types.js';

let shoukaku: Shoukaku | null = null;

export function initShoukaku(client: Client, config: AtlasSongerLavalinkConfig) {
  if (shoukaku) {
    return shoukaku;
  }

  shoukaku = new Shoukaku(
    new Connectors.DiscordJS(client),
    [
      {
        name: config.nodeName ?? 'atlas-local',
        url: `${config.host}:${config.port}`,
        auth: config.password,
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
