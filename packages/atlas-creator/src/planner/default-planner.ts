import {
  createPlanSummary,
  type CreatorPlan,
  type PlanAction,
  type PlanChange,
} from '../models/plan.js';
import type { CreatorPlanner, CreatePlanInput } from './types.js';

const createChange = (
  resource: PlanChange['resource'],
  action: PlanAction,
  target: string,
  reason: string,
  payload?: Record<string, unknown>,
): PlanChange => ({
  id: `${resource}:${action}:${target}`,
  resource,
  action,
  target,
  reason,
  payload,
});

export class DefaultCreatorPlanner implements CreatorPlanner {
  async createPlan({ spec, snapshot }: CreatePlanInput): Promise<CreatorPlan> {
    const changes: PlanChange[] = [];

    if (spec.guild.id !== snapshot.guildId) {
      changes.push(
        createChange(
          'guild',
          'update',
          spec.guild.id,
          'El snapshot no coincide con el guild de la spec.',
          { snapshotGuildId: snapshot.guildId, specGuildId: spec.guild.id },
        ),
      );
    }

    const snapshotRoleNames = new Set(snapshot.roles.map((role) => role.name));
    const specRoleNames = new Set(spec.roles.map((role) => role.name));

    for (const role of spec.roles) {
      if (!snapshotRoleNames.has(role.name)) {
        changes.push(
          createChange('role', 'create', role.name, 'Rol definido en spec pero ausente.', {
            role,
          }),
        );
      }
    }

    for (const role of snapshot.roles) {
      if (!specRoleNames.has(role.name)) {
        changes.push(
          createChange('role', 'delete', role.name, 'Rol presente en snapshot pero no en spec.', {
            roleId: role.id,
            managed: role.managed ?? false,
          }),
        );
      }
    }

    const snapshotChannelNames = new Set(snapshot.channels.map((channel) => channel.name));
    const specChannelNames = new Set(spec.channels.map((channel) => channel.name));

    for (const channel of spec.channels) {
      if (!snapshotChannelNames.has(channel.name)) {
        changes.push(
          createChange(
            'channel',
            'create',
            channel.name,
            'Canal definido en spec pero ausente.',
            {
              channel,
            },
          ),
        );
      }
    }

    for (const channel of snapshot.channels) {
      if (!specChannelNames.has(channel.name)) {
        changes.push(
          createChange(
            'channel',
            'delete',
            channel.name,
            'Canal presente en snapshot pero no en spec.',
            {
              channelId: channel.id,
              managed: channel.managed ?? false,
            },
          ),
        );
      }
    }

    return {
      version: '1',
      id: `plan_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      changes,
      summary: createPlanSummary(changes),
    };
  }
}
