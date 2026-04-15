import { basicCommunityTemplate } from '../domain/templates/basic-community.js';
import type { CreatorTemplate, CreatorTemplateId } from '../domain/templates/template-contract.js';

const templates: CreatorTemplate[] = [basicCommunityTemplate];

export interface TemplateRegistryService {
  listTemplates: () => CreatorTemplate[];
  getTemplateById: (id: string) => CreatorTemplate | undefined;
  getTemplateOrThrow: (id: string) => CreatorTemplate;
}

export const createTemplateRegistryService = (): TemplateRegistryService => ({
  listTemplates: () => templates,
  getTemplateById: (id: string) =>
    templates.find((template) => template.metadata.id === id),
  getTemplateOrThrow: (id: string) => {
    const template = templates.find((item) => item.metadata.id === id);
    if (!template) {
      const available = templates.map((item) => item.metadata.id).join(', ');
      throw new Error(
        `La plantilla "${id}" no existe. Disponibles: ${available || 'ninguna'}.`,
      );
    }

    return template;
  },
});

export type { CreatorTemplate, CreatorTemplateId };
