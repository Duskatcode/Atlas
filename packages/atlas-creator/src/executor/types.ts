import type { DiscordAdapter } from '../adapters/discord/types.js';
import type { CreatorPlan } from '../models/plan.js';
import type { CreatorSnapshot } from '../models/snapshot.js';
import type { CreatorSpec } from '../models/spec.js';

export type ExecutionStatus = 'applied' | 'skipped' | 'failed';

export interface ExecutionResultItem {
  changeId: string;
  status: ExecutionStatus;
  message?: string;
}

export interface ExecutionResult {
  appliedAt: string;
  status: 'ok' | 'partial' | 'failed';
  results: ExecutionResultItem[];
  message?: string;
}

export interface ExecutePlanInput {
  spec: CreatorSpec;
  snapshot: CreatorSnapshot;
  plan: CreatorPlan;
  dryRun?: boolean;
  adapter?: DiscordAdapter;
}

export interface CreatorExecutor {
  execute: (input: ExecutePlanInput) => Promise<ExecutionResult>;
}
