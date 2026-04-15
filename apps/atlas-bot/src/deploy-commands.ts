import { REST, Routes } from 'discord.js';
import { env } from './config/index.js';
import { commands } from './commands.js';

const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

async function main() {
  const guildIds = [env.DISCORD_GUILD_ID_1, env.DISCORD_GUILD_ID_2];

  for (const guildId of guildIds) {
    await rest.put(
      Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, guildId),
      { body: commands }
    );

    console.log(`✅ Comandos registrados en guild ${guildId}`);
  }
}

main().catch((error) => {
  console.error('❌ Error registrando comandos:', error);
  process.exit(1);
});
