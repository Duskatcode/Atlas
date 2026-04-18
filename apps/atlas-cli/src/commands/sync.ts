import { createDiscordAdapterFromEnv } from '../config/env.js';
import { writeJsonFile } from '../io/files.js';
import { loadSpec } from '../io/spec-loader.js';
import { readBooleanFlag, readStringFlag } from '../utils/args.js';
import { printJson } from '../utils/output.js';
import type { CommandContext } from './context.js';
import { defaults } from './context.js';

export const runSyncCommand = async ({ args, service }: CommandContext): Promise<void> => {
  const specPath = readStringFlag(args, 'spec', defaults.specPath) ?? defaults.specPath;
  const outputPath = readStringFlag(args, 'out');
  const source = readStringFlag(args, 'source', 'memory') === 'discord' ? 'discord' : 'memory';
  const dryRun = readBooleanFlag(args, 'dry-run', false);

  const spec = await loadSpec(specPath);
  const adapter = source === 'discord' ? createDiscordAdapterFromEnv() : undefined;

  const result = await service.sync({
    spec,
    source,
    dryRun,
    adapter,
  });

  if (outputPath) {
    await writeJsonFile(outputPath, result);
  }

  printJson(result);
};
