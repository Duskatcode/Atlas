import { DefaultCreatorExecutor } from '../executor/default-executor.js';
import type { ExecutionResult } from '../executor/types.js';
import { createEmptySnapshot, type CreatorSnapshot } from '../models/snapshot.js';
import { validateCreatorSpec, type SpecValidationResult } from '../models/spec.js';
import { DefaultCreatorPlanner } from '../planner/default-planner.js';
import { defaultCreatorPolicies } from '../policies/default-policies.js';
import { runPolicies } from '../policies/types.js';
import type {
  ApplyInput,
  CreatePlanInput,
  CreatePlanResult,
  CreateSnapshotInput,
  CreatorService,
  CreatorServiceDependencies,
  SyncInput,
  SyncResult,
} from './types.js';

export class AtlasCreatorService implements CreatorService {
  constructor(private readonly dependencies: CreatorServiceDependencies = {}) {}

  validateSpec(candidate: unknown): SpecValidationResult {
    return validateCreatorSpec(candidate);
  }

  async createSnapshot(input: CreateSnapshotInput): Promise<CreatorSnapshot> {
    const guildId = input.guildId ?? input.spec?.guild.id;
    if (!guildId) {
      throw new Error('No se pudo resolver guildId para crear snapshot.');
    }

    if (input.source === 'discord') {
      if (!input.adapter) {
        throw new Error('Se pidió snapshot de Discord pero no se proporcionó adapter.');
      }

      return input.adapter.fetchSnapshot({
        guildId,
        spec: input.spec,
      });
    }

    return createEmptySnapshot(guildId, 'memory');
  }

  async createPlan(input: CreatePlanInput): Promise<CreatePlanResult> {
    const planner = this.dependencies.planner ?? new DefaultCreatorPlanner();
    const plan = await planner.createPlan({
      spec: input.spec,
      snapshot: input.snapshot,
    });

    const policies = input.policies ?? this.dependencies.policies ?? defaultCreatorPolicies;
    const policyResult = runPolicies(
      plan,
      {
        spec: input.spec,
        snapshot: input.snapshot,
      },
      policies,
    );

    return {
      plan: policyResult.plan,
      policyNotes: policyResult.notes,
    };
  }

  async applyPlan(input: ApplyInput): Promise<ExecutionResult> {
    const executor = this.dependencies.executor ?? new DefaultCreatorExecutor();
    return executor.execute({
      spec: input.spec,
      snapshot: input.snapshot,
      plan: input.plan,
      dryRun: input.dryRun,
      adapter: input.adapter,
    });
  }

  async sync(input: SyncInput): Promise<SyncResult> {
    const snapshot = await this.createSnapshot({
      spec: input.spec,
      source: input.source,
      adapter: input.adapter,
    });

    const planResult = await this.createPlan({
      spec: input.spec,
      snapshot,
    });

    const execution = await this.applyPlan({
      spec: input.spec,
      snapshot,
      plan: planResult.plan,
      dryRun: input.dryRun,
      adapter: input.adapter,
    });

    return {
      snapshot,
      plan: planResult.plan,
      policyNotes: planResult.policyNotes,
      execution,
    };
  }
}
