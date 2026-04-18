import {
  ChannelType,
  Client,
  DiscordAPIError,
  type Guild,
  GatewayIntentBits,
  type GuildBasedChannel,
  type GuildForumTag,
  type GuildForumTagData,
  type NonThreadGuildBasedChannel,
  OverwriteType,
  PermissionFlagsBits,
  type Role,
} from 'discord.js';

import type { ExecutionResult, ExecutionResultItem } from '../../executor/types.js';
import type { PlanAction, PlanChange } from '../../models/plan.js';
import { createEmptySnapshot, type SnapshotChannel, type SnapshotRole } from '../../models/snapshot.js';
import type {
  CreatorChannelSpec,
  CreatorForumTagSpec,
  CreatorPermissionOverwriteSpec,
  CreatorRoleSpec,
  CreatorSpec,
} from '../../models/spec.js';
import type {
  DiscordAdapter,
  DiscordAdapterApplyInput,
  DiscordAdapterSnapshotInput,
  DiscordEnvironment,
} from './types.js';

const toApiErrorMessage = (error: DiscordAPIError): string => {
  if (error.status === 401) {
    return 'Token inválido o expirado para Discord API.';
  }

  if (error.status === 403) {
    return 'El bot no tiene permisos para leer este guild.';
  }

  if (error.status === 404) {
    return 'Guild no encontrado. Verifica guild id y acceso del bot.';
  }

  return `Discord API respondió ${error.status}: ${error.message}`;
};

const normalizeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const isSupportedChannelType = (type: ChannelType): boolean =>
  [
    ChannelType.GuildCategory,
    ChannelType.GuildText,
    ChannelType.GuildVoice,
    ChannelType.GuildForum,
  ].includes(type);

const isSupportedGuildChannel = (
  channel: GuildBasedChannel,
): channel is NonThreadGuildBasedChannel => isSupportedChannelType(channel.type);

const toSnapshotChannelType = (type: ChannelType): SnapshotChannel['type'] => {
  if (type === ChannelType.GuildCategory) {
    return 'category';
  }

  if (type === ChannelType.GuildVoice) {
    return 'voice';
  }

  if (type === ChannelType.GuildForum) {
    return 'forum';
  }

  return 'text';
};

const toChannelKey = (type: SnapshotChannel['type'], name: string): string => `${type}:${name}`;

const parseRoleTarget = (target: string): string | undefined => {
  if (!target.startsWith('role:')) {
    return undefined;
  }

  return target.slice('role:'.length);
};

const parseChannelTarget = (
  target: string,
):
  | {
      type: SnapshotChannel['type'];
      name: string;
    }
  | undefined => {
  const separatorIndex = target.indexOf(':');
  if (separatorIndex <= 0) {
    return undefined;
  }

  const type = target.slice(0, separatorIndex);
  const name = target.slice(separatorIndex + 1);

  if (!['category', 'text', 'voice', 'forum'].includes(type) || name.length === 0) {
    return undefined;
  }

  return {
    type: type as SnapshotChannel['type'],
    name,
  };
};

const parseForumTagTarget = (
  target: string,
):
  | {
      forumName: string;
      tagName: string;
    }
  | undefined => {
  const forumPrefix = 'forum:';
  const marker = '/tag:';

  if (!target.startsWith(forumPrefix)) {
    return undefined;
  }

  const markerIndex = target.indexOf(marker);
  if (markerIndex === -1) {
    return undefined;
  }

  const forumName = target.slice(forumPrefix.length, markerIndex);
  const tagName = target.slice(markerIndex + marker.length);

  if (!forumName || !tagName) {
    return undefined;
  }

  return {
    forumName,
    tagName,
  };
};

const parsePermissionOverwriteTarget = (
  target: string,
):
  | {
      channelType: SnapshotChannel['type'];
      channelName: string;
      targetType: 'role' | 'member';
      overwriteTarget: string;
    }
  | undefined => {
  const marker = '/overwrite:';
  const markerIndex = target.indexOf(marker);
  if (markerIndex === -1) {
    return undefined;
  }

  const channelTarget = target.slice(0, markerIndex);
  const overwriteTargetPayload = target.slice(markerIndex + marker.length);
  const channel = parseChannelTarget(channelTarget);
  if (!channel) {
    return undefined;
  }

  const overwriteSeparatorIndex = overwriteTargetPayload.indexOf(':');
  if (overwriteSeparatorIndex <= 0) {
    return undefined;
  }

  const targetType = overwriteTargetPayload.slice(0, overwriteSeparatorIndex);
  const overwriteTarget = overwriteTargetPayload.slice(overwriteSeparatorIndex + 1);
  if (!overwriteTarget || !['role', 'member'].includes(targetType)) {
    return undefined;
  }

  return {
    channelType: channel.type,
    channelName: channel.name,
    targetType: targetType as 'role' | 'member',
    overwriteTarget,
  };
};

const toDiscordChannelType = (type: CreatorChannelSpec['type']): ChannelType => {
  if (type === 'category') {
    return ChannelType.GuildCategory;
  }

  if (type === 'voice') {
    return ChannelType.GuildVoice;
  }

  if (type === 'forum') {
    return ChannelType.GuildForum;
  }

  return ChannelType.GuildText;
};

const resolvePermissionNames = (
  names: string[] | undefined,
): {
  resolved: bigint[];
  unknown: string[];
} => {
  const resolved: bigint[] = [];
  const unknown: string[] = [];

  for (const name of names ?? []) {
    const permission = PermissionFlagsBits[name as keyof typeof PermissionFlagsBits];
    if (typeof permission !== 'bigint') {
      unknown.push(name);
      continue;
    }

    resolved.push(permission);
  }

  return {
    resolved,
    unknown,
  };
};

const resolvePermissionOverwriteOptions = (
  allowNames: string[] | undefined,
  denyNames: string[] | undefined,
): {
  options: Record<string, boolean>;
  unknown: string[];
} => {
  const options: Record<string, boolean> = {};
  const unknown = new Set<string>();

  for (const name of allowNames ?? []) {
    const permission = PermissionFlagsBits[name as keyof typeof PermissionFlagsBits];
    if (typeof permission !== 'bigint') {
      unknown.add(name);
      continue;
    }

    options[name] = true;
  }

  for (const name of denyNames ?? []) {
    const permission = PermissionFlagsBits[name as keyof typeof PermissionFlagsBits];
    if (typeof permission !== 'bigint') {
      unknown.add(name);
      continue;
    }

    options[name] = false;
  }

  return {
    options,
    unknown: [...unknown],
  };
};

const toForumTagEmoji = (emoji: string | undefined): GuildForumTagData['emoji'] => {
  if (!emoji) {
    return null;
  }

  if (/^\d+$/.test(emoji)) {
    return {
      id: emoji,
      name: null,
    };
  }

  return {
    id: null,
    name: emoji,
  };
};

const readForumTagEmoji = (tag: GuildForumTag): string | undefined =>
  tag.emoji?.id ?? tag.emoji?.name ?? undefined;

const toForumTagDataFromExisting = (tag: GuildForumTag): GuildForumTagData => ({
  id: tag.id,
  name: tag.name,
  moderated: tag.moderated,
  emoji: tag.emoji,
});

const toForumTagDataFromSpec = (
  tag: CreatorForumTagSpec,
  fallback?: GuildForumTag,
): GuildForumTagData => ({
  id: fallback?.id,
  name: fallback?.name ?? tag.name,
  moderated: tag.moderated ?? fallback?.moderated ?? false,
  emoji: tag.emoji !== undefined ? toForumTagEmoji(tag.emoji) : fallback?.emoji ?? null,
});

const resolveChangeFields = (change: PlanChange): string[] => {
  const rawFields = change.details?.fields;
  if (!Array.isArray(rawFields)) {
    return [];
  }

  return rawFields.filter((field): field is string => typeof field === 'string');
};

const shouldApplyField = (fields: string[], field: string): boolean =>
  fields.length === 0 || fields.includes(field);

interface ApplyRuntime {
  guild: Guild;
  roleByName: Map<string, Role>;
  channelByKey: Map<string, NonThreadGuildBasedChannel>;
  categoryByName: Map<string, NonThreadGuildBasedChannel>;
}

export class DiscordJsAdapter implements DiscordAdapter {
  readonly name = 'discordjs-adapter';

  constructor(
    private readonly env: Required<Pick<DiscordEnvironment, 'token'>> &
      Pick<DiscordEnvironment, 'guildId'>,
  ) {}

  private async withGuild<T>(
    guildId: string | undefined,
    operationLabel: 'snapshot' | 'apply',
    handler: (guild: Guild) => Promise<T>,
  ): Promise<T> {
    const resolvedGuildId = guildId || this.env.guildId;
    if (!resolvedGuildId) {
      throw new Error(
        operationLabel === 'snapshot'
          ? 'Falta guild id para generar snapshot de Discord.'
          : 'Falta guild id para ejecutar apply en Discord.',
      );
    }

    const client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });

    try {
      await client.login(this.env.token);
      const guild = await client.guilds.fetch(resolvedGuildId);
      return await handler(guild);
    } catch (error: unknown) {
      if (error instanceof DiscordAPIError) {
        throw new Error(toApiErrorMessage(error));
      }

      const message = normalizeError(error);
      if (operationLabel === 'snapshot') {
        throw new Error(`No se pudo crear snapshot de Discord: ${message}`);
      }

      throw new Error(`No se pudo ejecutar apply en Discord: ${message}`);
    } finally {
      client.destroy();
    }
  }

  private findSpecRole(spec: CreatorSpec, roleName: string): CreatorRoleSpec | undefined {
    return spec.roles.find((role) => role.name === roleName);
  }

  private findSpecChannel(
    spec: CreatorSpec,
    channelType: CreatorChannelSpec['type'],
    channelName: string,
  ): CreatorChannelSpec | undefined {
    return spec.channels.find((channel) => channel.type === channelType && channel.name === channelName);
  }

  private findSpecOverwrite(
    channel: CreatorChannelSpec,
    targetType: CreatorPermissionOverwriteSpec['targetType'],
    target: string,
  ): CreatorPermissionOverwriteSpec | undefined {
    return channel.permissionOverwrites.find(
      (overwrite) => overwrite.targetType === targetType && overwrite.target === target,
    );
  }

  private buildRuntimeState(guild: Guild): ApplyRuntime {
    const roleByName = new Map<string, Role>();
    for (const role of guild.roles.cache.values()) {
      roleByName.set(role.name, role);
    }

    const channelByKey = new Map<string, NonThreadGuildBasedChannel>();
    const categoryByName = new Map<string, NonThreadGuildBasedChannel>();

    for (const channel of guild.channels.cache.values()) {
      if (!channel || !isSupportedGuildChannel(channel)) {
        continue;
      }

      const snapshotType = toSnapshotChannelType(channel.type);
      channelByKey.set(toChannelKey(snapshotType, channel.name), channel);

      if (channel.type === ChannelType.GuildCategory) {
        categoryByName.set(channel.name, channel);
      }
    }

    return {
      guild,
      roleByName,
      channelByKey,
      categoryByName,
    };
  }

  private resolveParentCategoryId(
    channelSpec: CreatorChannelSpec,
    runtime: ApplyRuntime,
  ): string | null | undefined {
    if (channelSpec.type === 'category') {
      return undefined;
    }

    if (channelSpec.parent === undefined) {
      return undefined;
    }

    if (channelSpec.parent.trim().length === 0) {
      return null;
    }

    const parent = runtime.categoryByName.get(channelSpec.parent);
    if (!parent) {
      throw new Error(`No se encontró la categoría parent ${channelSpec.parent}.`);
    }

    return parent.id;
  }

  private makeResult(
    change: PlanChange,
    status: ExecutionResultItem['status'],
    message: string,
  ): ExecutionResultItem {
    return {
      changeId: change.id,
      status,
      message,
    };
  }

  private async applyRoleChange(
    change: PlanChange,
    action: PlanAction,
    spec: CreatorSpec,
    runtime: ApplyRuntime,
  ): Promise<ExecutionResultItem> {
    const roleName = parseRoleTarget(change.target);
    if (!roleName) {
      return this.makeResult(change, 'failed', 'No se pudo parsear target de rol.');
    }

    const roleSpec = this.findSpecRole(spec, roleName);
    if (!roleSpec) {
      return this.makeResult(change, 'failed', `Rol ${roleName} no está definido en spec.`);
    }

    const existingRole = runtime.roleByName.get(roleName);

    if (action === 'create') {
      if (existingRole) {
        return this.makeResult(change, 'skipped', `Rol ${roleName} ya existe. Se omite.`);
      }

      const resolvedPermissions = resolvePermissionNames(roleSpec.permissions);
      if (resolvedPermissions.unknown.length > 0) {
        return this.makeResult(
          change,
          'failed',
          `Permisos desconocidos para rol ${roleName}: ${resolvedPermissions.unknown.join(', ')}`,
        );
      }

      const createdRole = await runtime.guild.roles.create({
        name: roleSpec.name,
        color: roleSpec.color as any,
        hoist: roleSpec.hoist,
        mentionable: roleSpec.mentionable,
        permissions: roleSpec.permissions ? resolvedPermissions.resolved : undefined,
        reason: '[Atlas Creator] Safe apply create role',
      });

      if (roleSpec.position !== undefined) {
        await createdRole.setPosition(roleSpec.position, {
          reason: '[Atlas Creator] Safe apply role position',
        });
      }

      runtime.roleByName.set(createdRole.name, createdRole);
      return this.makeResult(change, 'applied', `Rol ${roleName} creado.`);
    }

    if (!existingRole) {
      return this.makeResult(change, 'failed', `Rol ${roleName} no existe para actualizar.`);
    }

    if (existingRole.managed) {
      return this.makeResult(change, 'skipped', `Rol managed ${roleName}. Se omite update seguro.`);
    }

    const fields = resolveChangeFields(change);
    const editOptions: Record<string, unknown> = {};
    let hasMutations = false;

    if (shouldApplyField(fields, 'color') && roleSpec.color !== undefined) {
      editOptions.color = roleSpec.color as any;
      hasMutations = true;
    }

    if (shouldApplyField(fields, 'hoist') && roleSpec.hoist !== undefined) {
      editOptions.hoist = roleSpec.hoist;
      hasMutations = true;
    }

    if (shouldApplyField(fields, 'mentionable') && roleSpec.mentionable !== undefined) {
      editOptions.mentionable = roleSpec.mentionable;
      hasMutations = true;
    }

    if (shouldApplyField(fields, 'permissions') && roleSpec.permissions !== undefined) {
      const resolvedPermissions = resolvePermissionNames(roleSpec.permissions);
      if (resolvedPermissions.unknown.length > 0) {
        return this.makeResult(
          change,
          'failed',
          `Permisos desconocidos para rol ${roleName}: ${resolvedPermissions.unknown.join(', ')}`,
        );
      }

      editOptions.permissions = resolvedPermissions.resolved;
      hasMutations = true;
    }

    if (Object.keys(editOptions).length > 0) {
      await existingRole.edit({
        ...(editOptions as Record<string, unknown>),
        reason: '[Atlas Creator] Safe apply update role',
      } as any);
    }

    if (shouldApplyField(fields, 'position') && roleSpec.position !== undefined) {
      await existingRole.setPosition(roleSpec.position, {
        reason: '[Atlas Creator] Safe apply role position',
      });
      hasMutations = true;
    }

    if (!hasMutations) {
      return this.makeResult(change, 'skipped', `Rol ${roleName} sin campos seguros para actualizar.`);
    }

    return this.makeResult(change, 'applied', `Rol ${roleName} actualizado.`);
  }

  private async applyChannelChange(
    change: PlanChange,
    action: PlanAction,
    spec: CreatorSpec,
    runtime: ApplyRuntime,
  ): Promise<ExecutionResultItem> {
    const target = parseChannelTarget(change.target);
    if (!target) {
      return this.makeResult(change, 'failed', 'No se pudo parsear target de canal.');
    }

    const channelSpec = this.findSpecChannel(spec, target.type, target.name);
    if (!channelSpec) {
      return this.makeResult(
        change,
        'failed',
        `Canal ${target.type}:${target.name} no está definido en spec.`,
      );
    }

    const channelKey = toChannelKey(target.type, target.name);
    const existingChannel = runtime.channelByKey.get(channelKey);

    if (action === 'create') {
      if (existingChannel) {
        return this.makeResult(change, 'skipped', `Canal ${target.type}:${target.name} ya existe. Se omite.`);
      }

      const parentId = this.resolveParentCategoryId(channelSpec, runtime);
      const createOptions: Record<string, unknown> = {
        name: channelSpec.name,
        type: toDiscordChannelType(channelSpec.type),
        reason: '[Atlas Creator] Safe apply create channel',
      };

      if (parentId !== undefined) {
        createOptions.parent = parentId;
      }

      if (channelSpec.type === 'text' || channelSpec.type === 'forum') {
        if (channelSpec.topic !== undefined) {
          createOptions.topic = channelSpec.topic;
        }

        if (channelSpec.nsfw !== undefined) {
          createOptions.nsfw = channelSpec.nsfw;
        }
      }

      if (channelSpec.type === 'voice') {
        if (channelSpec.bitrate !== undefined) {
          createOptions.bitrate = channelSpec.bitrate;
        }

        if (channelSpec.userLimit !== undefined) {
          createOptions.userLimit = channelSpec.userLimit;
        }
      }

      if (channelSpec.type === 'forum' && channelSpec.forumTags.length > 0) {
        createOptions.availableTags = channelSpec.forumTags.map((forumTag) =>
          toForumTagDataFromSpec(forumTag),
        );
      }

      const createdChannel = await runtime.guild.channels.create(createOptions as any);
      if (!isSupportedGuildChannel(createdChannel)) {
        return this.makeResult(change, 'failed', `Canal ${target.type}:${target.name} creado con tipo no soportado.`);
      }

      runtime.channelByKey.set(channelKey, createdChannel);
      if (channelSpec.type === 'category') {
        runtime.categoryByName.set(channelSpec.name, createdChannel);
      }

      if (channelSpec.position !== undefined) {
        await (createdChannel as any).setPosition(channelSpec.position, {
          reason: '[Atlas Creator] Safe apply channel position',
        });
      }

      return this.makeResult(change, 'applied', `Canal ${target.type}:${target.name} creado.`);
    }

    if (!existingChannel) {
      return this.makeResult(change, 'failed', `Canal ${target.type}:${target.name} no existe para actualizar.`);
    }

    if ((existingChannel as any).managed) {
      return this.makeResult(
        change,
        'skipped',
        `Canal managed ${target.type}:${target.name}. Se omite update seguro.`,
      );
    }

    const fields = resolveChangeFields(change);
    const editOptions: Record<string, unknown> = {};
    let hasMutations = false;

    if ((channelSpec.type === 'text' || channelSpec.type === 'forum') && shouldApplyField(fields, 'topic')) {
      if (channelSpec.topic !== undefined) {
        editOptions.topic = channelSpec.topic;
        hasMutations = true;
      }
    }

    if ((channelSpec.type === 'text' || channelSpec.type === 'forum') && shouldApplyField(fields, 'nsfw')) {
      if (channelSpec.nsfw !== undefined) {
        editOptions.nsfw = channelSpec.nsfw;
        hasMutations = true;
      }
    }

    if (channelSpec.type === 'voice' && shouldApplyField(fields, 'bitrate')) {
      if (channelSpec.bitrate !== undefined) {
        editOptions.bitrate = channelSpec.bitrate;
        hasMutations = true;
      }
    }

    if (channelSpec.type === 'voice' && shouldApplyField(fields, 'userLimit')) {
      if (channelSpec.userLimit !== undefined) {
        editOptions.userLimit = channelSpec.userLimit;
        hasMutations = true;
      }
    }

    if (Object.keys(editOptions).length > 0) {
      await (existingChannel as any).edit({
        ...editOptions,
        reason: '[Atlas Creator] Safe apply update channel',
      });
    }

    if (channelSpec.type !== 'category' && shouldApplyField(fields, 'parent')) {
      const parentId = this.resolveParentCategoryId(channelSpec, runtime);
      await (existingChannel as any).setParent(parentId ?? null, {
        lockPermissions: false,
        reason: '[Atlas Creator] Safe apply move channel',
      });
      hasMutations = true;
    }

    if (shouldApplyField(fields, 'position') && channelSpec.position !== undefined) {
      await (existingChannel as any).setPosition(channelSpec.position, {
        reason: '[Atlas Creator] Safe apply channel position',
      });
      hasMutations = true;
    }

    if (!hasMutations) {
      return this.makeResult(
        change,
        'skipped',
        `Canal ${target.type}:${target.name} sin campos seguros para actualizar.`,
      );
    }

    return this.makeResult(change, 'applied', `Canal ${target.type}:${target.name} actualizado.`);
  }

  private async applyForumTagChange(
    change: PlanChange,
    action: PlanAction,
    spec: CreatorSpec,
    runtime: ApplyRuntime,
  ): Promise<ExecutionResultItem> {
    const target = parseForumTagTarget(change.target);
    if (!target) {
      return this.makeResult(change, 'failed', 'No se pudo parsear target de forum tag.');
    }

    const forumSpec = this.findSpecChannel(spec, 'forum', target.forumName);
    if (!forumSpec) {
      return this.makeResult(change, 'failed', `Foro ${target.forumName} no está definido en spec.`);
    }

    const tagSpec = forumSpec.forumTags.find((tag) => tag.name === target.tagName);
    if (!tagSpec) {
      return this.makeResult(
        change,
        'failed',
        `Forum tag ${target.tagName} no está definida en spec para ${target.forumName}.`,
      );
    }

    const forumChannel = runtime.channelByKey.get(toChannelKey('forum', target.forumName));
    if (!forumChannel) {
      return this.makeResult(change, 'failed', `Foro ${target.forumName} no existe para configurar tags.`);
    }

    if (forumChannel.type !== ChannelType.GuildForum) {
      return this.makeResult(change, 'failed', `Canal ${target.forumName} no es tipo forum en Discord.`);
    }

    const existingTag = forumChannel.availableTags.find((tag) => tag.name === target.tagName);

    if (action === 'create' && existingTag) {
      return this.makeResult(
        change,
        'skipped',
        `Forum tag ${target.tagName} ya existe en ${target.forumName}. Se omite.`,
      );
    }

    if (action === 'update' && !existingTag) {
      return this.makeResult(
        change,
        'failed',
        `Forum tag ${target.tagName} no existe para actualizar en ${target.forumName}.`,
      );
    }

    const nextTags = forumChannel.availableTags.map((tag) => {
      if (tag.name !== target.tagName) {
        return toForumTagDataFromExisting(tag);
      }

      return toForumTagDataFromSpec(tagSpec, tag);
    });

    if (action === 'create') {
      nextTags.push(toForumTagDataFromSpec(tagSpec));
    }

    if (action === 'update' && existingTag) {
      const currentEmoji = readForumTagEmoji(existingTag);
      const desiredEmoji = tagSpec.emoji ?? currentEmoji;
      const desiredModerated = tagSpec.moderated ?? existingTag.moderated;

      if (currentEmoji === desiredEmoji && desiredModerated === existingTag.moderated) {
        return this.makeResult(
          change,
          'skipped',
          `Forum tag ${target.tagName} ya está alineada en ${target.forumName}.`,
        );
      }
    }

    await forumChannel.setAvailableTags(nextTags, '[Atlas Creator] Safe apply forum tags');

    if (action === 'create') {
      return this.makeResult(
        change,
        'applied',
        `Forum tag ${target.tagName} creada en ${target.forumName}.`,
      );
    }

    return this.makeResult(
      change,
      'applied',
      `Forum tag ${target.tagName} actualizada en ${target.forumName}.`,
    );
  }

  private async applyPermissionOverwriteChange(
    change: PlanChange,
    spec: CreatorSpec,
    runtime: ApplyRuntime,
  ): Promise<ExecutionResultItem> {
    const target = parsePermissionOverwriteTarget(change.target);
    if (!target) {
      return this.makeResult(change, 'failed', 'No se pudo parsear target de permission overwrite.');
    }

    const channelSpec = this.findSpecChannel(spec, target.channelType, target.channelName);
    if (!channelSpec) {
      return this.makeResult(
        change,
        'failed',
        `Canal ${target.channelType}:${target.channelName} no está definido en spec.`,
      );
    }

    const overwriteSpec = this.findSpecOverwrite(
      channelSpec,
      target.targetType,
      target.overwriteTarget,
    );

    if (!overwriteSpec) {
      return this.makeResult(
        change,
        'failed',
        `Permission overwrite ${target.targetType}:${target.overwriteTarget} no está definida en spec.`,
      );
    }

    const channel = runtime.channelByKey.get(toChannelKey(target.channelType, target.channelName));
    if (!channel) {
      return this.makeResult(
        change,
        'failed',
        `Canal ${target.channelType}:${target.channelName} no existe para configurar permisos.`,
      );
    }

    let overwriteTargetId = overwriteSpec.target;
    if (target.targetType === 'role') {
      const targetRole =
        runtime.roleByName.get(overwriteSpec.target) ?? runtime.guild.roles.cache.get(overwriteSpec.target);
      if (!targetRole) {
        return this.makeResult(
          change,
          'failed',
          `No se encontró el rol objetivo ${overwriteSpec.target} para overwrite en ${target.channelName}.`,
        );
      }

      overwriteTargetId = targetRole.id;
    }

    const overwriteOptions = resolvePermissionOverwriteOptions(
      overwriteSpec.allow,
      overwriteSpec.deny,
    );

    const unknownPermissions = overwriteOptions.unknown;
    if (unknownPermissions.length > 0) {
      return this.makeResult(
        change,
        'failed',
        `Permisos desconocidos en overwrite ${target.channelName}: ${unknownPermissions.join(', ')}`,
      );
    }

    await channel.permissionOverwrites.edit(
      overwriteTargetId,
      overwriteOptions.options as any,
      {
        reason: '[Atlas Creator] Safe apply permission overwrite',
        type: target.targetType === 'role' ? OverwriteType.Role : OverwriteType.Member,
      },
    );

    return this.makeResult(
      change,
      'applied',
      `Permission overwrite ${target.targetType}:${target.overwriteTarget} aplicada en ${target.channelName}.`,
    );
  }

  private async applySingleChange(
    change: PlanChange,
    input: DiscordAdapterApplyInput,
    runtime: ApplyRuntime,
  ): Promise<ExecutionResultItem> {
    if (change.action === 'skip') {
      return this.makeResult(change, 'skipped', 'Cambio marcado como skip en el plan.');
    }

    if (change.action === 'potential-conflict') {
      return this.makeResult(change, 'skipped', 'Cambio marcado como potential-conflict. Se preserva estado actual.');
    }

    if (change.action !== 'create' && change.action !== 'update') {
      return this.makeResult(change, 'skipped', `Acción no soportada: ${change.action}.`);
    }

    if (input.dryRun) {
      return this.makeResult(change, 'skipped', 'Dry run activo. No se aplican cambios.');
    }

    try {
      if (change.resource === 'role') {
        return await this.applyRoleChange(change, change.action, input.spec, runtime);
      }

      if (['category', 'text-channel', 'voice-channel', 'forum-channel'].includes(change.resource)) {
        return await this.applyChannelChange(change, change.action, input.spec, runtime);
      }

      if (change.resource === 'forum-tag') {
        return await this.applyForumTagChange(change, change.action, input.spec, runtime);
      }

      if (change.resource === 'permission-overwrite') {
        return await this.applyPermissionOverwriteChange(change, input.spec, runtime);
      }

      return this.makeResult(change, 'skipped', `Recurso ${change.resource} no tiene apply seguro implementado.`);
    } catch (error: unknown) {
      return this.makeResult(change, 'failed', normalizeError(error));
    }
  }

  async fetchSnapshot({ guildId }: DiscordAdapterSnapshotInput) {
    return this.withGuild(guildId, 'snapshot', async (guild) => {
      await guild.roles.fetch();
      await guild.channels.fetch();

      const me = await guild.members.fetchMe();
      if (!me.permissions.has(PermissionFlagsBits.ViewChannel)) {
        throw new Error('El bot no tiene permiso ViewChannel en el guild seleccionado.');
      }

      const roleNameById = new Map<string, string>();
      const roles: SnapshotRole[] = [...guild.roles.cache.values()]
        .sort((left, right) => right.position - left.position)
        .map((role) => {
          roleNameById.set(role.id, role.name);

          return {
            id: role.id,
            name: role.name,
            color: role.color > 0 ? role.hexColor : undefined,
            position: role.position,
            permissions: role.permissions.toArray(),
            hoist: role.hoist,
            mentionable: role.mentionable,
            managed: role.managed,
          };
        });

      const channels: SnapshotChannel[] = [...guild.channels.cache.values()]
        .filter((channel): channel is NonNullable<typeof channel> => Boolean(channel))
        .filter((channel): channel is NonThreadGuildBasedChannel => isSupportedGuildChannel(channel))
        .sort((left, right) => {
          if (left.rawPosition === right.rawPosition) {
            return left.id.localeCompare(right.id);
          }

          return left.rawPosition - right.rawPosition;
        })
        .map((channel, index) => {
          const channelType = toSnapshotChannelType(channel.type);
          const permissionOverwrites: SnapshotChannel['permissionOverwrites'] = [
            ...channel.permissionOverwrites.cache.values(),
          ].map((overwrite) => ({
              targetType: overwrite.type === OverwriteType.Role ? 'role' : 'member',
              targetId: overwrite.id,
              targetName:
                overwrite.type === OverwriteType.Role
                  ? roleNameById.get(overwrite.id)
                  : undefined,
              allow: overwrite.allow.toArray(),
              deny: overwrite.deny.toArray(),
            }));

          const base: SnapshotChannel = {
            id: channel.id,
            name: channel.name,
            type: channelType,
            position: channel.rawPosition,
            order: index,
            parentId: channel.parentId ?? undefined,
            permissionOverwrites,
          };

          if (channelType === 'text') {
            base.topic = 'topic' in channel ? channel.topic ?? undefined : undefined;
            base.nsfw = 'nsfw' in channel ? channel.nsfw : undefined;
          }

          if (channelType === 'voice') {
            base.bitrate = 'bitrate' in channel ? channel.bitrate : undefined;
            base.userLimit = 'userLimit' in channel ? channel.userLimit : undefined;
          }

          if (channelType === 'forum') {
            base.topic = 'topic' in channel ? channel.topic ?? undefined : undefined;
            base.nsfw = 'nsfw' in channel ? channel.nsfw : undefined;
            base.forumTags =
              'availableTags' in channel
                ? channel.availableTags.map((tag) => ({
                    id: tag.id,
                    name: tag.name,
                    moderated: tag.moderated,
                    emoji: tag.emoji?.name ?? tag.emoji?.id ?? undefined,
                  }))
                : [];
          }

          return base;
        });

      if (channels.length === 0) {
        throw new Error(
          'No se encontraron canales visibles en el guild. Verifica permisos de acceso.',
        );
      }

      return {
        ...createEmptySnapshot(guild.id, 'discord'),
        guildName: guild.name,
        roles,
        channels,
      };
    });
  }

  async applyPlan(input: DiscordAdapterApplyInput): Promise<ExecutionResult> {
    return this.withGuild(input.spec.guild.id, 'apply', async (guild) => {
      await guild.roles.fetch();
      await guild.channels.fetch();

      const runtime = this.buildRuntimeState(guild);
      const results: ExecutionResultItem[] = [];

      for (const change of input.plan.changes) {
        const result = await this.applySingleChange(change, input, runtime);
        results.push(result);
      }

      const failedCount = results.filter((result) => result.status === 'failed').length;

      const status: ExecutionResult['status'] =
        failedCount === 0 ? 'ok' : failedCount === results.length ? 'failed' : 'partial';

      return {
        appliedAt: new Date().toISOString(),
        status,
        message: input.dryRun
          ? 'Dry run ejecutado en Discord: no se realizaron mutaciones.'
          : 'Apply seguro completado con política create-or-update/no-delete.',
        results,
      };
    });
  }
}
