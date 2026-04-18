export type PlanResource =
  | 'guild'
  | 'role'
  | 'category'
  | 'text-channel'
  | 'voice-channel'
  | 'forum-channel'
  | 'forum-tag'
  | 'permission-overwrite';
export type PlanAction = 'create' | 'update' | 'skip' | 'potential-conflict';

export interface PlanChange {
  id: string;
  resource: PlanResource;
  action: PlanAction;
  target: string;
  reason: string;
  current?: Record<string, unknown>;
  desired?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

export interface PlanSummary {
  totalChanges: number;
  creates: number;
  updates: number;
  skips: number;
  potentialConflicts: number;
}

export interface CreatorPlan {
  version: '1';
  id: string;
  generatedAt: string;
  summary: PlanSummary;
  changes: PlanChange[];
}

export const createPlanSummary = (changes: PlanChange[]): PlanSummary => ({
  totalChanges: changes.length,
  creates: changes.filter((change) => change.action === 'create').length,
  updates: changes.filter((change) => change.action === 'update').length,
  skips: changes.filter((change) => change.action === 'skip').length,
  potentialConflicts: changes.filter((change) => change.action === 'potential-conflict').length,
});
