import { createDiscordAdapterFromEnv } from '../config/env.js';
import { readJsonFile, writeJsonFile } from '../io/files.js';
import { loadSnapshot } from '../io/snapshot-loader.js';
import { readBooleanFlag, readStringFlag } from '../utils/args.js';
import { requestExplicitConfirmation } from '../utils/confirm.js';
import {
  formatApplyResultForTerminal,
  formatPlanForTerminal,
  printJson,
  printText,
} from '../utils/output.js';
import type { CommandContext } from './context.js';
import { defaults } from './context.js';

export const runApplyCommand = async ({ args, service }: CommandContext): Promise<void> => {
  const specPath = readStringFlag(args, 'spec', defaults.specPath) ?? defaults.specPath;
  const snapshotPath = readStringFlag(args, 'snapshot');
  const outputPath = readStringFlag(args, 'out');
  const planOutputPath = readStringFlag(args, 'plan-out');
  const source = readStringFlag(args, 'source', 'discord') === 'memory' ? 'memory' : 'discord';
  const guildId = readStringFlag(args, 'guild') ?? readStringFlag(args, 'g');
  const assumeYes = readBooleanFlag(args, 'yes', false);
  const showJson = readBooleanFlag(args, 'json', false);
  const showSkips = readBooleanFlag(args, 'verbose', false);
  const dryRun = readBooleanFlag(args, 'dry-run', false);
  const shouldRequireConfirmation = !assumeYes;

  const payload = await readJsonFile(specPath);
  const validation = service.validateSpec(payload);

  if (!validation.valid || !validation.spec) {
    printJson(validation);
    process.exitCode = 1;
    return;
  }

  const spec = validation.spec;
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

  if (planOutputPath) {
    await writeJsonFile(planOutputPath, planResult.plan);
  }

  if (!showJson) {
    printText(
      formatPlanForTerminal(planResult.plan, planResult.policyNotes, {
        showSkips,
      }),
    );
  }

  const hasActionableChanges =
    planResult.plan.summary.creates > 0 || planResult.plan.summary.updates > 0;

  if (!hasActionableChanges) {
    if (!showJson) {
      printText('No hay cambios create/update por aplicar.\n');
    }

    if (showJson) {
      printJson({
        validation,
        plan: planResult.plan,
        policyNotes: planResult.policyNotes,
        execution: null,
      });
    }

    return;
  }

  if (shouldRequireConfirmation) {
    const confirmed = await requestExplicitConfirmation({
      prompt:
        `Confirma apply seguro (${dryRun ? 'dry-run' : 'ejecución real'}) para guild ${spec.guild.id}.\n` +
        `Se aplicarán create=${planResult.plan.summary.creates} y update=${planResult.plan.summary.updates}.\n` +
        'Escribe APPLY para continuar:',
      expectedValue: 'APPLY',
    });

    if (!confirmed) {
      printText('Apply cancelado por el usuario.\n');
      return;
    }
  } else if (!showJson) {
    printText('Confirmación explícita recibida por flag --yes.\n');
  }

  const result = await service.applyPlan({
    spec,
    snapshot,
    plan: planResult.plan,
    dryRun,
    adapter,
  });

  const payloadResult = {
    validation,
    plan: planResult.plan,
    policyNotes: planResult.policyNotes,
    execution: result,
  };

  if (outputPath) {
    await writeJsonFile(outputPath, payloadResult);
  }

  if (showJson) {
    printJson(payloadResult);
  } else {
    printText(
      formatApplyResultForTerminal(planResult.plan, result, {
        showOmitted: showSkips,
      }),
    );
  }

  if (result.results.some((item: { status: string }) => item.status === 'failed')) {
    process.exitCode = 1;
  }
};
