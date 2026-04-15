import {
  ChannelType,
  PermissionFlagsBits,
  type CategoryChannel,
  type Guild,
  type GuildBasedChannel,
} from 'discord.js';

import type { CreatorApplyResult } from '../domain/planner/apply-result.js';
import { createTemplateChangePlan } from '../domain/planner/template-planner.js';
import type { CreatorTemplate, CreatorTemplateInput } from '../domain/templates/template-contract.js';

export interface ApplyTemplatePlanOptions {
  guild: Guild;
  template: CreatorTemplate;
  input: CreatorTemplateInput;
}

const normalizeName = (value: string): string => value.trim().toLocaleLowerCase();

const permissionMap: Record<string, bigint> = {
  Administrator: PermissionFlagsBits.Administrator,
  ManageGuild: PermissionFlagsBits.ManageGuild,
  ManageRoles: PermissionFlagsBits.ManageRoles,
  ManageChannels: PermissionFlagsBits.ManageChannels,
  ManageMessages: PermissionFlagsBits.ManageMessages,
  ModerateMembers: PermissionFlagsBits.ModerateMembers,
  MuteMembers: PermissionFlagsBits.MuteMembers,
  DeafenMembers: PermissionFlagsBits.DeafenMembers,
  MoveMembers: PermissionFlagsBits.MoveMembers,
  KickMembers: PermissionFlagsBits.KickMembers,
  ViewChannel: PermissionFlagsBits.ViewChannel,
  SendMessages: PermissionFlagsBits.SendMessages,
  Connect: PermissionFlagsBits.Connect,
  Speak: PermissionFlagsBits.Speak,
};

const resolvePermissions = (
  permissions: string[],
): { values: bigint[]; unknown: string[] } => {
  const values: bigint[] = [];
  const unknown: string[] = [];

  for (const permissionName of permissions) {
    const value = permissionMap[permissionName];
    if (typeof value !== 'bigint') {
      unknown.push(permissionName);
      continue;
    }

    values.push(value);
  }

  return { values, unknown };
};

const findEquivalentCategory = (
  guild: Guild,
  categoryName: string,
): CategoryChannel | undefined => {
  const normalizedName = normalizeName(categoryName);

  const existing = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      normalizeName(channel.name) === normalizedName,
  );

  return existing as CategoryChannel | undefined;
};

const findEquivalentChannel = (
  guild: Guild,
  input: {
    name: string;
    type: ChannelType.GuildText | ChannelType.GuildVoice;
    parentId: string;
  },
): GuildBasedChannel | undefined => {
  const normalizedName = normalizeName(input.name);

  return guild.channels.cache.find(
    (channel) =>
      channel.type === input.type &&
      normalizeName(channel.name) === normalizedName &&
      channel.parentId === input.parentId,
  );
};

export const applyTemplatePlanSafely = async (
  options: ApplyTemplatePlanOptions,
): Promise<CreatorApplyResult> => {
  const { guild, template, input } = options;
  const plan = createTemplateChangePlan(template, input);

  const result: CreatorApplyResult = {
    templateId: plan.templateId,
    templateName: plan.templateName,
    communityName: plan.communityName,
    created: {
      roles: [],
      categories: [],
      channels: [],
    },
    skipped: {
      roles: [],
      categories: [],
      channels: [],
    },
    errors: [],
    warnings: [
      'Safe apply: no se eliminan ni sobrescriben recursos existentes.',
    ],
  };

  const roleLookup = new Map(
    guild.roles.cache.map((role) => [normalizeName(role.name), role]),
  );

  for (const rolePlan of plan.rolesToCreate) {
    const normalizedName = normalizeName(rolePlan.name);
    if (roleLookup.has(normalizedName)) {
      result.skipped.roles.push(rolePlan.name);
      continue;
    }

    const resolved = resolvePermissions(rolePlan.permissions);
    if (resolved.unknown.length > 0) {
      result.warnings.push(
        `Permisos no reconocidos en rol ${rolePlan.name}: ${resolved.unknown.join(', ')}.`,
      );
    }

    try {
      const createdRole = await guild.roles.create({
        name: rolePlan.name,
        permissions: resolved.values,
        reason: `[Atlas Creator] ${rolePlan.reason}`,
      });
      roleLookup.set(normalizedName, createdRole);
      result.created.roles.push(createdRole.name);
    } catch (error) {
      result.errors.push(
        `No se pudo crear el rol ${rolePlan.name}: ${String(error)}`,
      );
    }
  }

  const categoryByKey = new Map<string, CategoryChannel>();

  for (const categoryPlan of plan.categoriesToCreate) {
    const existing = findEquivalentCategory(guild, categoryPlan.name);
    if (existing) {
      categoryByKey.set(categoryPlan.key, existing);
      result.skipped.categories.push(categoryPlan.name);
      continue;
    }

    try {
      const created = (await guild.channels.create({
        name: categoryPlan.name,
        type: ChannelType.GuildCategory,
        reason: `[Atlas Creator] ${categoryPlan.reason}`,
      })) as CategoryChannel;

      categoryByKey.set(categoryPlan.key, created);
      result.created.categories.push(created.name);
    } catch (error) {
      result.errors.push(
        `No se pudo crear la categoría ${categoryPlan.name}: ${String(error)}`,
      );
    }
  }

  for (const channelPlan of plan.channelsToCreate) {
    const parent = categoryByKey.get(channelPlan.categoryKey);
    if (!parent) {
      result.errors.push(
        `No se pudo resolver la categoría ${channelPlan.categoryKey} para el canal ${channelPlan.name}.`,
      );
      continue;
    }

    const channelType =
      channelPlan.type === 'voice'
        ? ChannelType.GuildVoice
        : ChannelType.GuildText;

    const equivalent = findEquivalentChannel(guild, {
      name: channelPlan.name,
      type: channelType,
      parentId: parent.id,
    });

    if (equivalent) {
      result.skipped.channels.push(`${channelPlan.name} (${channelPlan.type})`);
      continue;
    }

    try {
      const created = await guild.channels.create({
        name: channelPlan.name,
        type: channelType,
        parent: parent.id,
        reason: `[Atlas Creator] ${channelPlan.reason}`,
      });

      result.created.channels.push(`${created.name} (${channelPlan.type})`);
    } catch (error) {
      result.errors.push(
        `No se pudo crear el canal ${channelPlan.name}: ${String(error)}`,
      );
    }
  }

  return result;
};
