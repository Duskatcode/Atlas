import type { ExecutionResult, ExecutionResultItem } from '../../executor/types.js';
import { createEmptySnapshot } from '../../models/snapshot.js';
import type {
  DiscordAdapter,
  DiscordAdapterApplyInput,
  DiscordAdapterSnapshotInput,
  DiscordEnvironment,
} from './types.js';

const toResultItem = (changeId: string): ExecutionResultItem => ({
  changeId,
  status: 'skipped',
  message: 'NoopDiscordAdapter: ejecución real aún no implementada.',
});

export class NoopDiscordAdapter implements DiscordAdapter {
  readonly name = 'noop-discord-adapter';

  constructor(private readonly env: Required<Pick<DiscordEnvironment, 'guildId'>>) {}

  async fetchSnapshot({ guildId }: DiscordAdapterSnapshotInput) {
    const resolvedGuildId = guildId || this.env.guildId;
    return createEmptySnapshot(resolvedGuildId, 'discord');
  }

  async applyPlan({ plan }: DiscordAdapterApplyInput): Promise<ExecutionResult> {
    return {
      appliedAt: new Date().toISOString(),
      status: 'partial',
      results: plan.changes.map((change) => toResultItem(change.id)),
      message: 'NoopDiscordAdapter conectado. Sin mutaciones reales todavía.',
    };
  }
}
