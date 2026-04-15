import { DEFAULT_CREATOR_COMMUNITY_NAME } from '../../config/creator-config.js';
import type { CreatorTemplate } from './template-contract.js';

const normalizeCommunityName = (value?: string): string => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0
    ? normalized
    : DEFAULT_CREATOR_COMMUNITY_NAME;
};

export const basicCommunityTemplate: CreatorTemplate = {
  metadata: {
    id: 'basic-community',
    name: 'Basic Community',
    summary: 'Servidor base con estructura segura para comunidad general.',
  },
  buildBlueprint: (input) => {
    const communityName = normalizeCommunityName(input.communityName);

    return {
      roles: [
        {
          name: `${communityName} Admin`,
          reason: 'Rol administrativo principal de la comunidad.',
          permissions: [
            'ManageGuild',
            'ManageRoles',
            'ManageChannels',
            'ManageMessages',
            'ModerateMembers',
            'MoveMembers',
            'MuteMembers',
            'DeafenMembers',
          ],
        },
        {
          name: 'Moderator',
          reason: 'Moderación diaria del servidor.',
          permissions: [
            'ManageMessages',
            'ModerateMembers',
            'MuteMembers',
            'MoveMembers',
            'KickMembers',
          ],
        },
        {
          name: 'Member',
          reason: 'Rol base para miembros verificados.',
          permissions: ['ViewChannel', 'SendMessages', 'Connect', 'Speak'],
        },
      ],
      categories: [
        {
          key: 'info',
          name: '📣 Información',
          reason: 'Canales de anuncios y reglas.',
        },
        {
          key: 'chat',
          name: '💬 Comunidad',
          reason: 'Conversaciones y soporte.',
        },
        {
          key: 'voice',
          name: '🎧 Voz',
          reason: 'Salas de voz comunes.',
        },
      ],
      channels: [
        {
          name: 'anuncios',
          type: 'text',
          categoryKey: 'info',
          reason: 'Difusión de novedades oficiales.',
        },
        {
          name: 'reglas',
          type: 'text',
          categoryKey: 'info',
          reason: 'Normas de convivencia y uso.',
        },
        {
          name: 'general',
          type: 'text',
          categoryKey: 'chat',
          reason: 'Canal principal de conversación.',
        },
        {
          name: 'presentaciones',
          type: 'text',
          categoryKey: 'chat',
          reason: 'Canal de bienvenida para miembros nuevos.',
        },
        {
          name: 'soporte',
          type: 'text',
          categoryKey: 'chat',
          reason: 'Canal para resolver dudas de la comunidad.',
        },
        {
          name: 'General',
          type: 'voice',
          categoryKey: 'voice',
          reason: 'Sala de voz principal.',
        },
        {
          name: 'Gaming',
          type: 'voice',
          categoryKey: 'voice',
          reason: 'Sala de voz adicional para actividades paralelas.',
        },
      ],
    };
  },
};
