import type { ExecutionResult } from '../../executor/types.js';
import type { CreatorPlan } from '../../models/plan.js';
import type { CreatorSnapshot } from '../../models/snapshot.js';
import type { CreatorSpec } from '../../models/spec.js';

export interface DiscordEnvironment {
  token?: string;
  guildId?: string;
  applicationId?: string;
}

export interface DiscordAdapterSnapshotInput {
  guildId: string;
  spec?: CreatorSpec;
}

export interface DiscordAdapterApplyInput {
  spec: CreatorSpec;
  snapshot: CreatorSnapshot;
  plan: CreatorPlan;
  dryRun?: boolean;
}

export interface DiscordAdapter {
  readonly name: string;
  fetchSnapshot: (input: DiscordAdapterSnapshotInput) => Promise<CreatorSnapshot>;
  applyPlan?: (input: DiscordAdapterApplyInput) => Promise<ExecutionResult>;
}
