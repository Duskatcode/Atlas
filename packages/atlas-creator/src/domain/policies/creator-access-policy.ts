import {
  PermissionFlagsBits,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Guild,
  type PermissionResolvable,
} from 'discord.js';

type CreatorInteraction = ChatInputCommandInteraction | ButtonInteraction;

const USER_REQUIRED_PERMISSIONS: PermissionResolvable[] = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
];

const BOT_REQUIRED_PERMISSIONS: Array<[name: string, value: bigint]> = [
  ['ManageRoles', PermissionFlagsBits.ManageRoles],
  ['ManageChannels', PermissionFlagsBits.ManageChannels],
];

const hasAnyPermission = (
  interaction: CreatorInteraction,
  required: PermissionResolvable[],
): boolean => {
  const permissions = interaction.memberPermissions;
  if (!permissions) {
    return false;
  }

  return required.some((permission) => permissions.has(permission));
};

export const assertCreatorGuildContext = (
  interaction: CreatorInteraction,
): Guild => {
  if (!interaction.inGuild() || !interaction.guild) {
    throw new Error('Atlas Creator solo puede ejecutarse dentro de un servidor.');
  }

  return interaction.guild;
};

export const assertCreatorUserAccess = (
  interaction: CreatorInteraction,
): void => {
  if (hasAnyPermission(interaction, USER_REQUIRED_PERMISSIONS)) {
    return;
  }

  throw new Error(
    'No tienes permisos para usar Creator. Requiere `Manage Server` o `Administrator`.',
  );
};

export const assertCreatorBotPermissions = (
  interaction: CreatorInteraction,
): void => {
  const permissions = interaction.appPermissions;
  if (!permissions) {
    throw new Error('No se pudieron validar permisos del bot en este contexto.');
  }

  const missing = BOT_REQUIRED_PERMISSIONS.filter(([, permission]) =>
    !permissions.has(permission),
  ).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `El bot no tiene permisos suficientes para apply: ${missing.join(', ')}.`,
    );
  }
};
