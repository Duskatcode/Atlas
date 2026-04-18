import type { CreatorPlan } from '../models/plan.js';
import type { CreatorSnapshot } from '../models/snapshot.js';
import type { CreatorSpec } from '../models/spec.js';

export interface CreatePlanInput {
  spec: CreatorSpec;
  snapshot: CreatorSnapshot;
}

export interface CreatorPlanner {
  createPlan: (input: CreatePlanInput) => Promise<CreatorPlan>;
}
