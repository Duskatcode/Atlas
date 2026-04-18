import { createDiscordAdapterFromEnv } from '../config/env.js';
import { loadPlan } from '../io/plan-loader.js';
import { loadSnapshot } from '../io/snapshot-loader.js';
import { loadSpec } from '../io/spec-loader.js';
import { readBooleanFlag, readStringFlag } from '../utils/args.js';
import { printJson } from '../utils/output.js';
import type { CommandContext } from './context.js';
import { defaults } from './context.js';

export const runApplyCommand = async ({ args, service }: CommandContext): Promise<void> => {
  const specPath = readStringFlag(args, 'spec', defaults.specPath) ?? defaults.specPath;
  const planPath = readStringFlag(args, 'plan', defaults.planPath) ?? defaults.planPath;
  const snapshotPath = readStringFlag(args, 'snapshot');
  const dryRun = readBooleanFlag(args, 'dry-run', false);
  const useDiscordAdapter = readBooleanFlag(args, 'discord', false);

  const spec = await loadSpec(specPath);
  const snapshot = snapshotPath
    ? await loadSnapshot(snapshotPath)
    : await service.createSnapshot({
        spec,
        source: 'memory',
      });
  const plan = await loadPlan(planPath);

  const adapter = useDiscordAdapter ? createDiscordAdapterFromEnv() : undefined;

  const result = await service.applyPlan({
    spec,
    snapshot,
    plan,
    dryRun,
    adapter,
  });

  printJson(result);
};
