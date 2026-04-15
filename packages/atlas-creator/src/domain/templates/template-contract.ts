import type { CreatorGuildBlueprint } from '../planner/guild-blueprint.js';

export type CreatorTemplateId = 'basic-community' | (string & {});

export interface CreatorTemplateInput {
  communityName?: string;
}

export interface CreatorTemplateMetadata {
  id: CreatorTemplateId;
  name: string;
  summary: string;
}

export interface CreatorTemplate {
  metadata: CreatorTemplateMetadata;
  buildBlueprint: (input: CreatorTemplateInput) => CreatorGuildBlueprint;
}
