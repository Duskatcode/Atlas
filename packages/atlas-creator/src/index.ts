export { AtlasCreatorService } from './application/creator-service.js';
export type {
  ApplyInput,
  CreatePlanInput,
  CreatePlanResult,
  CreateSnapshotInput,
  CreatorService,
  CreatorServiceDependencies,
  SyncInput,
  SyncResult,
} from './application/types.js';

export { DefaultCreatorExecutor } from './executor/default-executor.js';
export type {
  CreatorExecutor,
  ExecutePlanInput,
  ExecutionResult,
  ExecutionResultItem,
  ExecutionStatus,
} from './executor/types.js';

export { createPlanSummary } from './models/plan.js';
export type {
  CreatorPlan,
  PlanAction,
  PlanChange,
  PlanResource,
  PlanSummary,
} from './models/plan.js';

export { createEmptySnapshot } from './models/snapshot.js';
export type {
  CreatorSnapshot,
  SnapshotChannel,
  SnapshotForumTag,
  SnapshotPermissionOverwrite,
  SnapshotRole,
} from './models/snapshot.js';

export {
  creatorChannelSpecSchema,
  creatorGuildSpecSchema,
  creatorRoleSpecSchema,
  creatorSpecSchema,
  validateCreatorSpec,
} from './models/spec.js';
export type {
  CreatorChannelSpec,
  CreatorChannelType,
  CreatorForumTagSpec,
  CreatorGuildSpec,
  CreatorPermissionOverwriteSpec,
  CreatorRoleSpec,
  CreatorSpec,
  SpecValidationIssue,
  SpecValidationResult,
} from './models/spec.js';

export { DefaultCreatorPlanner } from './planner/default-planner.js';
export type { CreatePlanInput as PlannerCreatePlanInput, CreatorPlanner } from './planner/types.js';

export { defaultCreatorPolicies, flagManagedConflictPolicy } from './policies/default-policies.js';
export { runPolicies } from './policies/types.js';
export type {
  AppliedPolicyNote,
  CreatorPolicy,
  CreatorPolicyContext,
  PolicyDecision,
  PolicyEvaluation,
  PolicyRunResult,
} from './policies/types.js';

export { assertDiscordEnvironment, readDiscordEnvironment } from './adapters/discord/env.js';
export { DiscordJsAdapter } from './adapters/discord/discordjs-adapter.js';
export { NoopDiscordAdapter } from './adapters/discord/noop-discord-adapter.js';
export type {
  DiscordAdapter,
  DiscordAdapterApplyInput,
  DiscordAdapterSnapshotInput,
  DiscordEnvironment,
} from './adapters/discord/types.js';
