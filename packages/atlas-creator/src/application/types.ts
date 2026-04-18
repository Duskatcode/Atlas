import type { DiscordAdapter } from '../adapters/discord/types.js';
import type { CreatorExecutor, ExecutionResult } from '../executor/types.js';
import type { CreatorPlan } from '../models/plan.js';
import type { CreatorSnapshot } from '../models/snapshot.js';
import type { CreatorSpec, SpecValidationResult } from '../models/spec.js';
import type { CreatorPlanner } from '../planner/types.js';
import type { AppliedPolicyNote, CreatorPolicy } from '../policies/types.js';

export interface CreatorServiceDependencies {
  planner?: CreatorPlanner;
  executor?: CreatorExecutor;
  policies?: CreatorPolicy[];
}

export interface CreateSnapshotInput {
  spec?: CreatorSpec;
  guildId?: string;
  source?: 'memory' | 'discord';
  adapter?: DiscordAdapter;
}

export interface CreatePlanInput {
  spec: CreatorSpec;
  snapshot: CreatorSnapshot;
  policies?: CreatorPolicy[];
}

export interface CreatePlanResult {
  plan: CreatorPlan;
  policyNotes: AppliedPolicyNote[];
}

export interface ApplyInput {
  spec: CreatorSpec;
  snapshot: CreatorSnapshot;
  plan: CreatorPlan;
  dryRun?: boolean;
  adapter?: DiscordAdapter;
}

export interface SyncInput {
  spec: CreatorSpec;
  source?: 'memory' | 'discord';
  adapter?: DiscordAdapter;
  dryRun?: boolean;
}

export interface SyncResult {
  snapshot: CreatorSnapshot;
  plan: CreatorPlan;
  policyNotes: AppliedPolicyNote[];
  execution: ExecutionResult;
}

export interface CreatorService {
  validateSpec: (candidate: unknown) => SpecValidationResult;
  createSnapshot: (input: CreateSnapshotInput) => Promise<CreatorSnapshot>;
  createPlan: (input: CreatePlanInput) => Promise<CreatePlanResult>;
  applyPlan: (input: ApplyInput) => Promise<ExecutionResult>;
  sync: (input: SyncInput) => Promise<SyncResult>;
}
