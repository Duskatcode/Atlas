import { CREATOR_PREVIEW_POLICY } from '../policies/index.js';
import type { CreatorTemplate } from '../templates/index.js';
import type { CreatorPlan } from './types.js';

export const createTemplatePlan = (template: CreatorTemplate): CreatorPlan => {
  const items = template.plannedResources.map((resource) => ({
    action: 'create' as const,
    kind: resource.kind,
    targetName: resource.name,
    description: resource.description,
    parentName: resource.parentName,
  }));

  return {
    template: {
      id: template.id,
      name: template.name,
      description: template.description,
    },
    summary: `Preview legible de ${items.length} recursos previstos sin tocar el servidor.`,
    items,
    policy: CREATOR_PREVIEW_POLICY,
  };
};
