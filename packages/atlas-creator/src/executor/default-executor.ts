import type { CreatorExecutor, ExecutePlanInput, ExecutionResult } from './types.js';

export class DefaultCreatorExecutor implements CreatorExecutor {
  async execute(input: ExecutePlanInput): Promise<ExecutionResult> {
    if (input.adapter?.applyPlan) {
      return input.adapter.applyPlan({
        spec: input.spec,
        snapshot: input.snapshot,
        plan: input.plan,
        dryRun: input.dryRun,
      });
    }

    return {
      appliedAt: new Date().toISOString(),
      status: 'partial',
      message: input.dryRun
        ? 'Dry run ejecutado: sin cambios persistidos.'
        : 'Executor base: sin adapter de aplicación real.',
      results: input.plan.changes.map((change) => ({
        changeId: change.id,
        status: 'skipped',
        message: 'Sin implementación de apply para este cambio.',
      })),
    };
  }
}
