import { createDiscordAdapterFromEnv } from '../config/env.js';
import { writeJsonFile } from '../io/files.js';
import { loadSnapshot } from '../io/snapshot-loader.js';
import { loadSpec } from '../io/spec-loader.js';
import { readBooleanFlag, readStringFlag } from '../utils/args.js';
import { formatPlanForTerminal, printJson, printText } from '../utils/output.js';
import type { CommandContext } from './context.js';
import { defaults } from './context.js';

export const runPlanCommand = async ({ args, service }: CommandContext): Promise<void> => {
  const specPath = readStringFlag(args, 'spec', defaults.specPath) ?? defaults.specPath;
  const snapshotPath = readStringFlag(args, 'snapshot');
  const outputPath = readStringFlag(args, 'out');
  const guildId = readStringFlag(args, 'guild') ?? readStringFlag(args, 'g');
  const source = readStringFlag(args, 'source', 'discord') === 'memory' ? 'memory' : 'discord';
  const showJson = readBooleanFlag(args, 'json', false);
  const showSkips = readBooleanFlag(args, 'verbose', false);

  const spec = await loadSpec(specPath);

  const adapter = source === 'discord' ? createDiscordAdapterFromEnv() : undefined;
  const snapshot = snapshotPath
    ? await loadSnapshot(snapshotPath)
    : await service.createSnapshot({
        spec,
        source,
        adapter,
        guildId,
      });

  const planResult = await service.createPlan({
    spec,
    snapshot,
  });

  if (outputPath) {
    await writeJsonFile(outputPath, planResult.plan);
  }

  if (showJson) {
    printJson(planResult);
    return;
  }

  printText(
    formatPlanForTerminal(planResult.plan, planResult.policyNotes, {
      showSkips,
    }),
  );
};
