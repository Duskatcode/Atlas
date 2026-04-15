import { CREATOR_PREVIEW_MESSAGE_LIMIT } from '../config/creator-config.js';
import type { CreatorChangePlan } from '../domain/planner/change-plan.js';
import { clampPreviewMessage } from '../infra/preview-output.js';

const toBulletLines = (items: string[]): string[] =>
  items.length > 0 ? items.map((item) => `- ${item}`) : ['- (ninguno)'];

export const renderPreviewPlan = (plan: CreatorChangePlan): string => {
  const roleLines = toBulletLines(
    plan.rolesToCreate.map(
      (role) =>
        `**${role.name}** | permisos: ${role.permissions.join(', ')} | ${role.reason}`,
    ),
  );
  const categoryLines = toBulletLines(
    plan.categoriesToCreate.map(
      (category) => `**${category.name}** | key: \`${category.key}\` | ${category.reason}`,
    ),
  );
  const channelLines = toBulletLines(
    plan.channelsToCreate.map(
      (channel) =>
        `**${channel.name}** (${channel.type}) en \`${channel.categoryKey}\` | ${channel.reason}`,
    ),
  );
  const warningLines = toBulletLines(plan.warnings);

  const content = [
    `## Creator Preview · ${plan.templateName}`,
    `Template: \`${plan.templateId}\``,
    `Comunidad objetivo: **${plan.communityName}**`,
    `Modo: **preview** (sin aplicar cambios)`,
    '',
    '### Roles que pretende crear',
    ...roleLines,
    '',
    '### Categorías que pretende crear',
    ...categoryLines,
    '',
    '### Canales que pretende crear',
    ...channelLines,
    '',
    '### Seguridad',
    ...warningLines,
  ].join('\n');

  return clampPreviewMessage(content, CREATOR_PREVIEW_MESSAGE_LIMIT);
};
