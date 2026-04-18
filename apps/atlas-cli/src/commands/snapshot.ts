import { createDiscordAdapterFromEnv } from '../config/env.js';
import { writeTextFile } from '../io/files.js';
import { resolveSnapshotOutputFormat, serializeSnapshot } from '../io/serializer.js';
import { readStringFlag } from '../utils/args.js';
import { printText } from '../utils/output.js';
import type { CommandContext } from './context.js';

export const runSnapshotCommand = async ({ args, service }: CommandContext): Promise<void> => {
  const guildId = readStringFlag(args, 'guild') ?? readStringFlag(args, 'g');
  if (!guildId) {
    throw new Error('Falta --guild <id> para generar snapshot.');
  }

  const outputPath = readStringFlag(args, 'out');
  const requestedFormat = readStringFlag(args, 'format');
  const outputFormat = resolveSnapshotOutputFormat(requestedFormat, outputPath);
  const adapter = createDiscordAdapterFromEnv();

  const snapshot = await service.createSnapshot({
    source: 'discord',
    guildId,
    adapter,
  });
  const serializedSnapshot = serializeSnapshot(snapshot, outputFormat);

  if (outputPath) {
    await writeTextFile(outputPath, serializedSnapshot);
  }

  printText(serializedSnapshot);
};
