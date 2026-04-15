import type { CreatorPlan } from '../domain/planner/index.js';
import { createTemplatePlan } from '../domain/planner/index.js';
import { getCreatorTemplateById } from './template-catalog-service.js';

export const previewCreatorTemplate = (templateId: string): CreatorPlan | null => {
  const template = getCreatorTemplateById(templateId);
  return template ? createTemplatePlan(template) : null;
};
