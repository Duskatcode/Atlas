import type { CreatorPlan, PlanChange } from '../models/plan.js';
import type { CreatorSnapshot } from '../models/snapshot.js';
import type { CreatorSpec } from '../models/spec.js';

export type PolicyDecision = 'allow' | 'deny' | 'warn';

export interface CreatorPolicyContext {
  spec: CreatorSpec;
  snapshot: CreatorSnapshot;
}

export interface PolicyEvaluation {
  decision: PolicyDecision;
  reason?: string;
}

export interface CreatorPolicy {
  id: string;
  description: string;
  evaluate: (change: PlanChange, context: CreatorPolicyContext) => PolicyEvaluation;
}

export interface AppliedPolicyNote {
  policyId: string;
  changeId: string;
  decision: PolicyDecision;
  reason?: string;
}

export interface PolicyRunResult {
  plan: CreatorPlan;
  notes: AppliedPolicyNote[];
}

export const runPolicies = (
  plan: CreatorPlan,
  context: CreatorPolicyContext,
  policies: CreatorPolicy[],
): PolicyRunResult => {
  if (!policies.length) {
    return {
      plan,
      notes: [],
    };
  }

  const notes: AppliedPolicyNote[] = [];

  const filteredChanges = plan.changes.filter((change) => {
    for (const policy of policies) {
      const evaluation = policy.evaluate(change, context);
      if (evaluation.decision === 'allow') {
        continue;
      }

      notes.push({
        policyId: policy.id,
        changeId: change.id,
        decision: evaluation.decision,
        reason: evaluation.reason,
      });

      if (evaluation.decision === 'deny') {
        return false;
      }
    }

    return true;
  });

  return {
    plan: {
      ...plan,
      changes: filteredChanges,
      summary: {
        totalChanges: filteredChanges.length,
        creates: filteredChanges.filter((item) => item.action === 'create').length,
        updates: filteredChanges.filter((item) => item.action === 'update').length,
        deletes: filteredChanges.filter((item) => item.action === 'delete').length,
        noops: filteredChanges.filter((item) => item.action === 'noop').length,
      },
    },
    notes,
  };
};
