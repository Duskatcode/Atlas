import type {
  AppliedPolicyNote,
  CreatorPlan,
  ExecutionResult,
  ExecutionResultItem,
  PlanAction,
  PlanChange,
} from '@atlas/creator';

export const printJson = (payload: unknown): void => {
  console.log(JSON.stringify(payload, null, 2));
};

export const printText = (content: string): void => {
  process.stdout.write(content);
};

const actionOrder: PlanAction[] = ['potential-conflict', 'create', 'update', 'skip'];

export const formatPlanForTerminal = (
  plan: CreatorPlan,
  policyNotes: AppliedPolicyNote[],
  options?: {
    showSkips?: boolean;
  },
): string => {
  const lines: string[] = [];
  const showSkips = options?.showSkips ?? false;

  lines.push(`Plan: ${plan.id}`);
  lines.push(`Generado: ${plan.generatedAt}`);
  lines.push(
    `Resumen: create=${plan.summary.creates} update=${plan.summary.updates} skip=${plan.summary.skips} potential-conflict=${plan.summary.potentialConflicts}`,
  );

  if (policyNotes.length > 0) {
    lines.push(`Policies: ${policyNotes.length} nota(s).`);
  }

  for (const action of actionOrder) {
    const actionChanges = plan.changes.filter((change) => change.action === action);
    if (actionChanges.length === 0) {
      continue;
    }

    if (action === 'skip' && !showSkips) {
      lines.push(`skip: ${actionChanges.length} (ocultos; usa --verbose para listarlos)`);
      continue;
    }

    lines.push(`${action.toUpperCase()} (${actionChanges.length})`);

    for (const change of actionChanges) {
      const fields = Array.isArray(change.details?.fields)
        ? ` [fields: ${(change.details.fields as string[]).join(', ')}]`
        : '';
      lines.push(`- [${change.resource}] ${change.target} -> ${change.reason}${fields}`);
    }
  }

  if (policyNotes.length > 0) {
    lines.push('POLICY NOTES');
    for (const note of policyNotes) {
      lines.push(`- ${note.policyId} (${note.decision}) ${note.changeId}: ${note.reason ?? 'sin detalle'}`);
    }
  }

  return `${lines.join('\n')}\n`;
};

type ApplyBucket = 'created' | 'updated' | 'omitted' | 'failed';

interface CategorizedApplyChange {
  change: PlanChange;
  result: ExecutionResultItem;
}

const categorizeApplyChange = (
  change: PlanChange,
  result: ExecutionResultItem,
): ApplyBucket => {
  if (result.status === 'failed') {
    return 'failed';
  }

  if (result.status === 'applied' && change.action === 'create') {
    return 'created';
  }

  if (result.status === 'applied' && change.action === 'update') {
    return 'updated';
  }

  return 'omitted';
};

export const formatApplyResultForTerminal = (
  plan: CreatorPlan,
  execution: ExecutionResult,
  options?: {
    showOmitted?: boolean;
  },
): string => {
  const lines: string[] = [];
  const showOmitted = options?.showOmitted ?? false;
  const changeById = new Map(plan.changes.map((change) => [change.id, change]));

  const buckets: Record<ApplyBucket, CategorizedApplyChange[]> = {
    created: [],
    updated: [],
    omitted: [],
    failed: [],
  };

  for (const result of execution.results) {
    const change = changeById.get(result.changeId);
    if (!change) {
      continue;
    }

    const bucket = categorizeApplyChange(change, result);
    buckets[bucket].push({
      change,
      result,
    });
  }

  lines.push(`Apply: ${execution.status}`);
  lines.push(`Ejecutado: ${execution.appliedAt}`);
  lines.push(
    `Resumen: created=${buckets.created.length} updated=${buckets.updated.length} omitted=${buckets.omitted.length} failed=${buckets.failed.length}`,
  );

  const sections: Array<{ bucket: ApplyBucket; title: string; alwaysShow: boolean }> = [
    { bucket: 'created', title: 'CREATED', alwaysShow: true },
    { bucket: 'updated', title: 'UPDATED', alwaysShow: true },
    { bucket: 'failed', title: 'FAILED', alwaysShow: true },
    { bucket: 'omitted', title: 'OMITTED', alwaysShow: showOmitted },
  ];

  for (const section of sections) {
    const items = buckets[section.bucket];

    if (items.length === 0) {
      continue;
    }

    if (!section.alwaysShow && section.bucket === 'omitted') {
      lines.push(`OMITTED (${items.length}) ocultos; usa --verbose para listarlos`);
      continue;
    }

    lines.push(`${section.title} (${items.length})`);
    for (const item of items) {
      lines.push(
        `- [${item.change.resource}] ${item.change.target}: ${item.result.message ?? item.change.reason}`,
      );
    }
  }

  if (execution.message) {
    lines.push(`Nota: ${execution.message}`);
  }

  return `${lines.join('\n')}\n`;
};

export const printHelp = (): void => {
  console.log(`Atlas CLI\n\nComandos:\n  atlas snapshot --guild <id> [--out <path>] [--format json|yaml]\n  atlas validate --spec <path>\n  atlas plan --spec <path> [--guild <id>] [--snapshot <path>] [--source memory|discord] [--out <path>] [--json] [--verbose]\n  atlas apply --spec <path> [--snapshot <path>] [--source memory|discord] [--guild <id>] [--dry-run] [--yes] [--out <path>] [--plan-out <path>] [--json] [--verbose]\n  atlas sync --spec <path> [--source memory|discord] [--dry-run] [--out <path>]\n`);
};
