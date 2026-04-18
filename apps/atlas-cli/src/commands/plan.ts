import { createDiscordAdapterFromEnv } from '../config/env.js';
import { writeJsonFile } from '../io/files.js';
import { loadSnapshot } from '../io/snapshot-loader.js';
import { loadSpec } from '../io/spec-loader.js';
import { readStringFlag } from '../utils/args.js';
import { printJson } from '../utils/output.js';
import type { CommandContext } from './context.js';
import { defaults } from './context.js';

export const runPlanCommand = async ({ args, service }: CommandContext): Promise<void> => {
  const specPath = readStringFlag(args, 'spec', defaults.specPath) ?? defaults.specPath;
  const snapshotPath = readStringFlag(args, 'snapshot');
  const outputPath = readStringFlag(args, 'out');
  const source = readStringFlag(args, 'source', 'memory') === 'discord' ? 'discord' : 'memory';

  const spec = await loadSpec(specPath);

  const adapter = source === 'discord' ? createDiscordAdapterFromEnv() : undefined;
  const snapshot = snapshotPath
    ? await loadSnapshot(snapshotPath)
    : await service.createSnapshot({
        spec,
        source,
        adapter,
      });

  const planResult = await service.createPlan({
    spec,
    snapshot,
  });

  if (outputPath) {
    await writeJsonFile(outputPath, planResult.plan);
  }

  printJson(planResult);
};
