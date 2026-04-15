import type { CreatorTemplate } from '../domain/templates/index.js';
import { getCreatorTemplateCatalog } from '../infra/index.js';

export interface CreatorTemplateSummary {
  id: string;
  name: string;
  description: string;
  plannedResourceCount: number;
}

export const listCreatorTemplates = (): CreatorTemplateSummary[] => {
  return getCreatorTemplateCatalog().map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    plannedResourceCount: template.plannedResources.length,
  }));
};

export const getCreatorTemplateById = (templateId: string): CreatorTemplate | null => {
  return getCreatorTemplateCatalog().find((template) => template.id === templateId) ?? null;
};
