#!/usr/bin/env node
import { createCommandContext } from './commands/context.js';
import { runApplyCommand } from './commands/apply.js';
import { runPlanCommand } from './commands/plan.js';
import { runSnapshotCommand } from './commands/snapshot.js';
import { runSyncCommand } from './commands/sync.js';
import { runValidateCommand } from './commands/validate.js';
import { parseCliArgs } from './utils/args.js';
import { printHelp } from './utils/output.js';

const main = async (): Promise<void> => {
  const args = parseCliArgs(process.argv.slice(2));

  if (!args.command || ['help', '--help', '-h'].includes(args.command)) {
    printHelp();
    return;
  }

  const context = createCommandContext(args);

  const handlers: Record<string, (ctx: typeof context) => Promise<void>> = {
    snapshot: runSnapshotCommand,
    validate: runValidateCommand,
    plan: runPlanCommand,
    apply: runApplyCommand,
    sync: runSyncCommand,
  };

  const handler = handlers[args.command];
  if (!handler) {
    console.error(`Comando no soportado: ${args.command}`);
    printHelp();
    process.exitCode = 1;
    return;
  }

  await handler(context);
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[atlas-cli] Error: ${message}`);
  process.exitCode = 1;
});
