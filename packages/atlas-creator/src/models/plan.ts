export type PlanResource = 'guild' | 'role' | 'channel';
export type PlanAction = 'create' | 'update' | 'delete' | 'noop';

export interface PlanChange {
  id: string;
  resource: PlanResource;
  action: PlanAction;
  target: string;
  reason: string;
  payload?: Record<string, unknown>;
}

export interface PlanSummary {
  totalChanges: number;
  creates: number;
  updates: number;
  deletes: number;
  noops: number;
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
  deletes: changes.filter((change) => change.action === 'delete').length,
  noops: changes.filter((change) => change.action === 'noop').length,
});
