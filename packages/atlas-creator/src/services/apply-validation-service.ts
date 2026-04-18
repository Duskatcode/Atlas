import {
  PermissionsBitField,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Guild,
  type GuildMember,
} from 'discord.js';

type ApplyInteraction = ChatInputCommandInteraction | ButtonInteraction;

export interface CreatorApplyPermissionContext {
  guild: Guild;
  invokerMember: GuildMember;
  botMember: GuildMember;
}

interface RequiredPermission {
  flag: bigint;
  label: string;
}

const INVOKER_REQUIRED_PERMISSIONS: RequiredPermission[] = [
  { flag: PermissionsBitField.Flags.ManageGuild, label: 'Manage Server' },
];

const BOT_REQUIRED_PERMISSIONS: RequiredPermission[] = [
  { flag: PermissionsBitField.Flags.ViewChannel, label: 'View Channels' },
  { flag: PermissionsBitField.Flags.ManageRoles, label: 'Manage Roles' },
  { flag: PermissionsBitField.Flags.ManageChannels, label: 'Manage Channels' },
];

const listMissingPermissions = (
  member: GuildMember,
  required: RequiredPermission[],
): string[] => {
  return required
    .filter((permission) => !member.permissions.has(permission.flag))
    .map((permission) => permission.label);
};

export const assertCanApplyCreatorTemplate = async (
  interaction: ApplyInteraction,
): Promise<CreatorApplyPermissionContext> => {
  if (!interaction.guild || !interaction.guildId) {
    throw new Error('Creator apply solo funciona dentro de un servidor.');
  }

  const guild = interaction.guild;
  const invokerMember = await guild.members.fetch(interaction.user.id);
  const botUser = guild.client.user;

  if (!botUser) {
    throw new Error('No pude resolver la identidad del bot para validar permisos.');
  }

  const botMember = await guild.members.fetch(botUser.id);
  const missingInvokerPermissions = listMissingPermissions(
    invokerMember,
    INVOKER_REQUIRED_PERMISSIONS,
  );

  if (missingInvokerPermissions.length > 0) {
    throw new Error(
      `No tienes permisos para aplicar templates. Faltan: ${missingInvokerPermissions.join(', ')}.`,
    );
  }

  const missingBotPermissions = listMissingPermissions(
    botMember,
    BOT_REQUIRED_PERMISSIONS,
  );

  if (missingBotPermissions.length > 0) {
    throw new Error(
      `Atlas no tiene permisos suficientes para aplicar templates. Faltan: ${missingBotPermissions.join(', ')}.`,
    );
  }

  return { guild, invokerMember, botMember };
};
