import {
  createPlanSummary,
  type CreatorPlan,
  type PlanAction,
  type PlanChange,
} from '../models/plan.js';
import type { SnapshotChannel, SnapshotPermissionOverwrite } from '../models/snapshot.js';
import type { CreatorChannelSpec, CreatorPermissionOverwriteSpec, CreatorSpec } from '../models/spec.js';
import type { CreatorPlanner, CreatePlanInput } from './types.js';

const normalizeStringList = (items: string[] | undefined): string[] =>
  [...new Set((items ?? []).map((item) => item.trim()).filter((item) => item.length > 0))].sort();

const areStringListsEqual = (left: string[] | undefined, right: string[] | undefined): boolean => {
  const normalizedLeft = normalizeStringList(left);
  const normalizedRight = normalizeStringList(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
};

const channelResourceByType: Record<CreatorChannelSpec['type'], PlanChange['resource']> = {
  category: 'category',
  text: 'text-channel',
  voice: 'voice-channel',
  forum: 'forum-channel',
};

const toChannelKey = (type: CreatorChannelSpec['type'], name: string): string => `${type}:${name}`;

const findMatchingOverwriteIndex = (
  overwrite: CreatorPermissionOverwriteSpec,
  snapshotOverwrites: SnapshotPermissionOverwrite[],
  usedIndexes: Set<number>,
): number => {
  for (let index = 0; index < snapshotOverwrites.length; index += 1) {
    if (usedIndexes.has(index)) {
      continue;
    }

    const snapshotOverwrite = snapshotOverwrites[index];
    if (snapshotOverwrite.targetType !== overwrite.targetType) {
      continue;
    }

    if (overwrite.targetType === 'member' && snapshotOverwrite.targetId === overwrite.target) {
      return index;
    }

    if (
      overwrite.targetType === 'role' &&
      (snapshotOverwrite.targetName === overwrite.target || snapshotOverwrite.targetId === overwrite.target)
    ) {
      return index;
    }
  }

  return -1;
};

const createChange = (
  order: number,
  resource: PlanChange['resource'],
  action: PlanAction,
  target: string,
  reason: string,
  extras?: Pick<PlanChange, 'current' | 'desired' | 'details'>,
): PlanChange => ({
  id: `${resource}:${action}:${order}`,
  resource,
  action,
  target,
  reason,
  ...extras,
});

const collectRoleDiff = (
  specRole: CreatorSpec['roles'][number],
  snapshotRole: CreatePlanInput['snapshot']['roles'][number],
): Pick<PlanChange, 'current' | 'desired' | 'details'> | undefined => {
  const current: Record<string, unknown> = {};
  const desired: Record<string, unknown> = {};
  const fields: string[] = [];

  if (specRole.color !== undefined && specRole.color !== snapshotRole.color) {
    fields.push('color');
    current.color = snapshotRole.color;
    desired.color = specRole.color;
  }

  if (specRole.position !== undefined && specRole.position !== snapshotRole.position) {
    fields.push('position');
    current.position = snapshotRole.position;
    desired.position = specRole.position;
  }

  if (specRole.hoist !== undefined && specRole.hoist !== snapshotRole.hoist) {
    fields.push('hoist');
    current.hoist = snapshotRole.hoist;
    desired.hoist = specRole.hoist;
  }

  if (specRole.mentionable !== undefined && specRole.mentionable !== snapshotRole.mentionable) {
    fields.push('mentionable');
    current.mentionable = snapshotRole.mentionable;
    desired.mentionable = specRole.mentionable;
  }

  if (specRole.permissions && !areStringListsEqual(specRole.permissions, snapshotRole.permissions)) {
    fields.push('permissions');
    current.permissions = normalizeStringList(snapshotRole.permissions);
    desired.permissions = normalizeStringList(specRole.permissions);
  }

  if (!fields.length) {
    return undefined;
  }

  return {
    current,
    desired,
    details: { fields },
  };
};

const collectChannelDiff = (
  specChannel: CreatorChannelSpec,
  snapshotChannel: SnapshotChannel,
  snapshotCategoryNameById: Map<string, string>,
): Pick<PlanChange, 'current' | 'desired' | 'details'> | undefined => {
  const current: Record<string, unknown> = {};
  const desired: Record<string, unknown> = {};
  const fields: string[] = [];

  const snapshotParentName = snapshotChannel.parentId
    ? snapshotCategoryNameById.get(snapshotChannel.parentId)
    : undefined;

  if (specChannel.position !== undefined && specChannel.position !== snapshotChannel.position) {
    fields.push('position');
    current.position = snapshotChannel.position;
    desired.position = specChannel.position;
  }

  if (specChannel.parent !== undefined && specChannel.parent !== snapshotParentName) {
    fields.push('parent');
    current.parent = snapshotParentName;
    desired.parent = specChannel.parent;
  }

  if (specChannel.topic !== undefined && specChannel.topic !== snapshotChannel.topic) {
    fields.push('topic');
    current.topic = snapshotChannel.topic;
    desired.topic = specChannel.topic;
  }

  if (specChannel.nsfw !== undefined && specChannel.nsfw !== snapshotChannel.nsfw) {
    fields.push('nsfw');
    current.nsfw = snapshotChannel.nsfw;
    desired.nsfw = specChannel.nsfw;
  }

  if (specChannel.bitrate !== undefined && specChannel.bitrate !== snapshotChannel.bitrate) {
    fields.push('bitrate');
    current.bitrate = snapshotChannel.bitrate;
    desired.bitrate = specChannel.bitrate;
  }

  if (specChannel.userLimit !== undefined && specChannel.userLimit !== snapshotChannel.userLimit) {
    fields.push('userLimit');
    current.userLimit = snapshotChannel.userLimit;
    desired.userLimit = specChannel.userLimit;
  }

  if (!fields.length) {
    return undefined;
  }

  return {
    current,
    desired,
    details: { fields },
  };
};

export class DefaultCreatorPlanner implements CreatorPlanner {
  async createPlan({ spec, snapshot }: CreatePlanInput): Promise<CreatorPlan> {
    const changes: PlanChange[] = [];
    let order = 0;
    const pushChange = (
      resource: PlanChange['resource'],
      action: PlanAction,
      target: string,
      reason: string,
      extras?: Pick<PlanChange, 'current' | 'desired' | 'details'>,
    ): void => {
      order += 1;
      changes.push(createChange(order, resource, action, target, reason, extras));
    };

    if (spec.guild.id !== snapshot.guildId) {
      pushChange(
        'guild',
        'potential-conflict',
        `guild:${spec.guild.id}`,
        'El snapshot no coincide con el guild de la spec.',
        {
          current: {
            guildId: snapshot.guildId,
          },
          desired: {
            guildId: spec.guild.id,
          },
          details: { fields: ['guildId'] },
        },
      );
    } else {
      pushChange('guild', 'skip', `guild:${spec.guild.id}`, 'Guild objetivo coincide con la spec.');
    }

    const snapshotRolesByName = new Map(snapshot.roles.map((role) => [role.name, role]));
    const specRoleNames = new Set(spec.roles.map((role) => role.name));

    for (const role of spec.roles) {
      const snapshotRole = snapshotRolesByName.get(role.name);
      const target = `role:${role.name}`;

      if (!snapshotRole) {
        pushChange('role', 'create', target, 'Rol definido en spec pero ausente en el guild.', {
          desired: { ...role },
        });
        continue;
      }

      const roleDiff = collectRoleDiff(role, snapshotRole);
      if (!roleDiff) {
        pushChange('role', 'skip', target, 'Rol ya alineado con la spec.');
        continue;
      }

      if (snapshotRole.managed) {
        pushChange('role', 'potential-conflict', target, 'Rol managed con diferencias detectadas.', {
          ...roleDiff,
          details: {
            ...(roleDiff.details ?? {}),
            managed: true,
          },
        });
        continue;
      }

      pushChange('role', 'update', target, 'Rol existente con diferencias frente a la spec.', roleDiff);
    }

    for (const snapshotRole of snapshot.roles) {
      if (!specRoleNames.has(snapshotRole.name)) {
        pushChange(
          'role',
          'skip',
          `role:${snapshotRole.name}`,
          'Rol presente en guild pero no declarado en spec. Se preserva.',
          {
            current: {
              id: snapshotRole.id,
              managed: snapshotRole.managed ?? false,
            },
          },
        );
      }
    }

    const specChannelsByKey = new Map(spec.channels.map((channel) => [toChannelKey(channel.type, channel.name), channel]));
    const snapshotChannelsByKey = new Map(
      snapshot.channels.map((channel) => [toChannelKey(channel.type, channel.name), channel]),
    );
    const snapshotChannelsByName = new Map<string, SnapshotChannel[]>();
    const snapshotCategoryNameById = new Map(
      snapshot.channels
        .filter((channel) => channel.type === 'category')
        .map((channel) => [channel.id, channel.name]),
    );

    for (const channel of snapshot.channels) {
      const existing = snapshotChannelsByName.get(channel.name) ?? [];
      existing.push(channel);
      snapshotChannelsByName.set(channel.name, existing);
    }

    for (const channel of spec.channels) {
      const target = `${channel.type}:${channel.name}`;
      const resource = channelResourceByType[channel.type];
      const snapshotChannel = snapshotChannelsByKey.get(toChannelKey(channel.type, channel.name));

      if (!snapshotChannel) {
        const sameNameDifferentType = (snapshotChannelsByName.get(channel.name) ?? []).find(
          (item) => item.type !== channel.type,
        );

        if (sameNameDifferentType) {
          pushChange(
            resource,
            'potential-conflict',
            target,
            'Existe un canal con el mismo nombre pero distinto tipo.',
            {
              current: {
                type: sameNameDifferentType.type,
              },
              desired: {
                type: channel.type,
              },
              details: {
                fields: ['type'],
              },
            },
          );
          continue;
        }

        pushChange(resource, 'create', target, 'Canal definido en spec pero ausente en el guild.', {
          desired: {
            ...channel,
          },
        });

        if (channel.type === 'forum') {
          for (const forumTag of channel.forumTags) {
            pushChange(
              'forum-tag',
              'create',
              `forum:${channel.name}/tag:${forumTag.name}`,
              'Forum tag definido en spec para canal que será creado.',
              {
                desired: {
                  ...forumTag,
                },
              },
            );
          }
        }

        for (const overwrite of channel.permissionOverwrites) {
          pushChange(
            'permission-overwrite',
            'create',
            `${target}/overwrite:${overwrite.targetType}:${overwrite.target}`,
            'Permission overwrite definido en spec para canal que será creado.',
            {
              desired: {
                ...overwrite,
                allow: normalizeStringList(overwrite.allow),
                deny: normalizeStringList(overwrite.deny),
              },
            },
          );
        }

        continue;
      }

      const channelDiff = collectChannelDiff(channel, snapshotChannel, snapshotCategoryNameById);
      if (!channelDiff) {
        pushChange(resource, 'skip', target, 'Canal ya alineado con la spec.');
      } else if (snapshotChannel.managed) {
        pushChange(resource, 'potential-conflict', target, 'Canal managed con diferencias detectadas.', {
          ...channelDiff,
          details: {
            ...(channelDiff.details ?? {}),
            managed: true,
          },
        });
      } else {
        pushChange(resource, 'update', target, 'Canal existente con diferencias frente a la spec.', channelDiff);
      }

      if (channel.type === 'forum') {
        const snapshotTags = snapshotChannel.forumTags ?? [];
        const snapshotTagByName = new Map(snapshotTags.map((tag) => [tag.name, tag]));
        const seenTagNames = new Set<string>();

        for (const forumTag of channel.forumTags) {
          const targetTag = `forum:${channel.name}/tag:${forumTag.name}`;
          const snapshotTag = snapshotTagByName.get(forumTag.name);

          if (!snapshotTag) {
            pushChange('forum-tag', 'create', targetTag, 'Forum tag definido en spec pero ausente en el guild.', {
              desired: {
                ...forumTag,
              },
            });
            continue;
          }

          seenTagNames.add(forumTag.name);

          const current: Record<string, unknown> = {};
          const desired: Record<string, unknown> = {};
          const fields: string[] = [];

          if (forumTag.moderated !== undefined && forumTag.moderated !== snapshotTag.moderated) {
            fields.push('moderated');
            current.moderated = snapshotTag.moderated;
            desired.moderated = forumTag.moderated;
          }

          if (forumTag.emoji !== undefined && forumTag.emoji !== snapshotTag.emoji) {
            fields.push('emoji');
            current.emoji = snapshotTag.emoji;
            desired.emoji = forumTag.emoji;
          }

          if (!fields.length) {
            pushChange('forum-tag', 'skip', targetTag, 'Forum tag ya alineado con la spec.');
            continue;
          }

          pushChange('forum-tag', 'update', targetTag, 'Forum tag existente con diferencias frente a la spec.', {
            current,
            desired,
            details: { fields },
          });
        }

        for (const snapshotTag of snapshotTags) {
          if (!seenTagNames.has(snapshotTag.name)) {
            pushChange(
              'forum-tag',
              'skip',
              `forum:${channel.name}/tag:${snapshotTag.name}`,
              'Forum tag presente en guild pero no declarada en spec. Se preserva.',
            );
          }
        }
      }

      const usedOverwriteIndexes = new Set<number>();
      for (const overwrite of channel.permissionOverwrites) {
        const overwriteTarget = `${target}/overwrite:${overwrite.targetType}:${overwrite.target}`;
        const matchedIndex = findMatchingOverwriteIndex(
          overwrite,
          snapshotChannel.permissionOverwrites,
          usedOverwriteIndexes,
        );

        if (matchedIndex === -1) {
          pushChange(
            'permission-overwrite',
            'create',
            overwriteTarget,
            'Permission overwrite definido en spec pero ausente en el guild.',
            {
              desired: {
                ...overwrite,
                allow: normalizeStringList(overwrite.allow),
                deny: normalizeStringList(overwrite.deny),
              },
            },
          );
          continue;
        }

        usedOverwriteIndexes.add(matchedIndex);

        const snapshotOverwrite = snapshotChannel.permissionOverwrites[matchedIndex];
        const allowMatches = areStringListsEqual(overwrite.allow, snapshotOverwrite.allow);
        const denyMatches = areStringListsEqual(overwrite.deny, snapshotOverwrite.deny);
        if (allowMatches && denyMatches) {
          pushChange('permission-overwrite', 'skip', overwriteTarget, 'Permission overwrite ya alineado.');
          continue;
        }

        pushChange(
          'permission-overwrite',
          'update',
          overwriteTarget,
          'Permission overwrite existente con diferencias frente a la spec.',
          {
            current: {
              allow: normalizeStringList(snapshotOverwrite.allow),
              deny: normalizeStringList(snapshotOverwrite.deny),
            },
            desired: {
              allow: normalizeStringList(overwrite.allow),
              deny: normalizeStringList(overwrite.deny),
            },
            details: { fields: ['allow', 'deny'] },
          },
        );
      }

      snapshotChannel.permissionOverwrites.forEach((snapshotOverwrite, index) => {
        if (!usedOverwriteIndexes.has(index)) {
          const overwriteName =
            snapshotOverwrite.targetType === 'role'
              ? snapshotOverwrite.targetName ?? snapshotOverwrite.targetId
              : snapshotOverwrite.targetId;

          pushChange(
            'permission-overwrite',
            'skip',
            `${target}/overwrite:${snapshotOverwrite.targetType}:${overwriteName}`,
            'Permission overwrite presente en guild pero no declarado en spec. Se preserva.',
          );
        }
      });
    }

    for (const snapshotChannel of snapshot.channels) {
      const key = toChannelKey(snapshotChannel.type, snapshotChannel.name);
      if (!specChannelsByKey.has(key)) {
        const resource = channelResourceByType[snapshotChannel.type];
        pushChange(
          resource,
          'skip',
          `${snapshotChannel.type}:${snapshotChannel.name}`,
          'Canal presente en guild pero no declarado en spec. Se preserva.',
          {
            current: {
              id: snapshotChannel.id,
              managed: snapshotChannel.managed ?? false,
            },
          },
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
