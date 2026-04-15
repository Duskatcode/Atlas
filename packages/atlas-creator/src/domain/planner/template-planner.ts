import { DEFAULT_CREATOR_COMMUNITY_NAME } from '../../config/creator-config.js';
import type { CreatorTemplateInput, CreatorTemplate } from '../templates/template-contract.js';
import type { CreatorChangePlan } from './change-plan.js';

const normalizeCommunityName = (input: CreatorTemplateInput): string => {
  const normalized = input.communityName?.trim();
  return normalized && normalized.length > 0
    ? normalized
    : DEFAULT_CREATOR_COMMUNITY_NAME;
};

export const createTemplateChangePlan = (
  template: CreatorTemplate,
  input: CreatorTemplateInput,
): CreatorChangePlan => {
  const communityName = normalizeCommunityName(input);
  const blueprint = template.buildBlueprint({ ...input, communityName });

  return {
    templateId: template.metadata.id,
    templateName: template.metadata.name,
    communityName,
    dryRun: true,
    rolesToCreate: blueprint.roles,
    categoriesToCreate: blueprint.categories,
    channelsToCreate: blueprint.channels,
    warnings: [
      'Preview mode: no se aplicarán cambios reales en el servidor.',
      'Revisa permisos y nombres antes de habilitar cualquier futura operación apply.',
    ],
  };
};
