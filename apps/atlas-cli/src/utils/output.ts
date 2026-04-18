import type { AppliedPolicyNote, CreatorPlan, PlanAction } from '@atlas/creator';

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

export const printHelp = (): void => {
  console.log(`Atlas CLI\n\nComandos:\n  atlas snapshot --guild <id> [--out <path>] [--format json|yaml]\n  atlas validate --spec <path>\n  atlas plan --spec <path> [--guild <id>] [--snapshot <path>] [--source memory|discord] [--out <path>] [--json] [--verbose]\n  atlas apply --spec <path> --plan <path> [--snapshot <path>] [--dry-run]\n  atlas sync --spec <path> [--source memory|discord] [--dry-run] [--out <path>]\n`);
};
