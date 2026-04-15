import type { CreatorTemplate } from './types.js';

export const basicCommunityTemplate: CreatorTemplate = {
  id: 'basic-community',
  name: 'Basic Community',
  description:
    'Base segura para comunidades nuevas con estructura simple de información, conversación y voz.',
  plannedResources: [
    {
      kind: 'role',
      name: 'Moderadores',
      description: 'Rol operativo para moderación y soporte básico del servidor.',
    },
    {
      kind: 'role',
      name: 'Staff',
      description: 'Rol interno para coordinación del equipo de la comunidad.',
    },
    {
      kind: 'category',
      name: 'Información',
      description: 'Agrupa canales de lectura y orientación inicial.',
    },
    {
      kind: 'text-channel',
      name: 'anuncios',
      parentName: 'Información',
      description: 'Canal para novedades y mensajes oficiales del servidor.',
    },
    {
      kind: 'text-channel',
      name: 'bienvenida',
      parentName: 'Información',
      description: 'Canal para reglas, onboarding y orientación general.',
    },
    {
      kind: 'category',
      name: 'Comunidad',
      description: 'Agrupa la conversación principal de la comunidad.',
    },
    {
      kind: 'text-channel',
      name: 'general',
      parentName: 'Comunidad',
      description: 'Canal de conversación general para miembros.',
    },
    {
      kind: 'text-channel',
      name: 'presentaciones',
      parentName: 'Comunidad',
      description: 'Canal para que miembros nuevos se presenten.',
    },
    {
      kind: 'category',
      name: 'Voz',
      description: 'Agrupa espacios básicos de voz.',
    },
    {
      kind: 'voice-channel',
      name: 'General',
      parentName: 'Voz',
      description: 'Sala principal de voz para encuentros informales.',
    },
    {
      kind: 'voice-channel',
      name: 'Co-working',
      parentName: 'Voz',
      description: 'Sala de voz para sesiones de trabajo o estudio.',
    },
  ],
};
