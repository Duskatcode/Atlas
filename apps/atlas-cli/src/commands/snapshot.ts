import { createDiscordAdapterFromEnv } from '../config/env.js';
import { writeJsonFile } from '../io/files.js';
import { loadSpec } from '../io/spec-loader.js';
import { readStringFlag } from '../utils/args.js';
import { printJson } from '../utils/output.js';
import type { CommandContext } from './context.js';
import { defaults } from './context.js';

export const runSnapshotCommand = async ({ args, service }: CommandContext): Promise<void> => {
  const specPath = readStringFlag(args, 'spec', defaults.specPath) ?? defaults.specPath;
  const outputPath = readStringFlag(args, 'out');
  const source = readStringFlag(args, 'source', 'memory') === 'discord' ? 'discord' : 'memory';

  const spec = await loadSpec(specPath);
  const adapter = source === 'discord' ? createDiscordAdapterFromEnv() : undefined;

  const snapshot = await service.createSnapshot({
    spec,
    source,
    adapter,
  });

  if (outputPath) {
    await writeJsonFile(outputPath, snapshot);
  }

  printJson(snapshot);
};
