import {
  ChannelType,
  Client,
  DiscordAPIError,
  GatewayIntentBits,
  type GuildBasedChannel,
  type NonThreadGuildBasedChannel,
  OverwriteType,
  PermissionFlagsBits,
} from 'discord.js';

import { createEmptySnapshot, type SnapshotChannel, type SnapshotRole } from '../../models/snapshot.js';
import type {
  DiscordAdapter,
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

export class DiscordJsAdapter implements DiscordAdapter {
  readonly name = 'discordjs-adapter';

  constructor(
    private readonly env: Required<Pick<DiscordEnvironment, 'token'>> &
      Pick<DiscordEnvironment, 'guildId'>,
  ) {}

  async fetchSnapshot({ guildId }: DiscordAdapterSnapshotInput) {
    const resolvedGuildId = guildId || this.env.guildId;
    if (!resolvedGuildId) {
      throw new Error('Falta guild id para generar snapshot de Discord.');
    }

    const client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });

    try {
      await client.login(this.env.token);
      const guild = await client.guilds.fetch(resolvedGuildId);

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
    } catch (error: unknown) {
      if (error instanceof DiscordAPIError) {
        throw new Error(toApiErrorMessage(error));
      }

      if (error instanceof Error) {
        throw new Error(`No se pudo crear snapshot de Discord: ${error.message}`);
      }

      throw new Error('No se pudo crear snapshot de Discord por un error desconocido.');
    } finally {
      client.destroy();
    }
  }
}
