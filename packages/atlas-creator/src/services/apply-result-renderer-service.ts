import { CREATOR_PREVIEW_MESSAGE_LIMIT } from '../config/creator-config.js';
import type { CreatorApplyResult, CreatorApplySummary } from '../domain/planner/apply-result.js';
import { clampPreviewMessage } from '../infra/preview-output.js';

const renderSummaryLines = (summary: CreatorApplySummary): string[] => {
  const lines = [
    ...summary.roles.map((role) => `- rol: **${role}**`),
    ...summary.categories.map((category) => `- categoría: **${category}**`),
    ...summary.channels.map((channel) => `- canal: **${channel}**`),
  ];

  return lines.length > 0 ? lines : ['- (ninguno)'];
};

const toBulletLines = (items: string[]): string[] =>
  items.length > 0 ? items.map((item) => `- ${item}`) : ['- (ninguno)'];

export const renderApplyResult = (result: CreatorApplyResult): string => {
  const content = [
    `## Creator Apply · ${result.templateName}`,
    `Template: \`${result.templateId}\``,
    `Comunidad objetivo: **${result.communityName}**`,
    '',
    '### Recursos creados',
    ...renderSummaryLines(result.created),
    '',
    '### Recursos omitidos (ya existentes/equivalentes)',
    ...renderSummaryLines(result.skipped),
    '',
    '### Errores',
    ...toBulletLines(result.errors),
    '',
    '### Seguridad',
    ...toBulletLines(result.warnings),
  ].join('\n');

  return clampPreviewMessage(content, CREATOR_PREVIEW_MESSAGE_LIMIT);
};
