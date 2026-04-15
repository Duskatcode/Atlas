export type CreatorTemplateResourceKind =
  | 'role'
  | 'category'
  | 'text-channel'
  | 'voice-channel';

export interface CreatorTemplateResource {
  kind: CreatorTemplateResourceKind;
  name: string;
  description: string;
  parentName?: string;
}

export interface CreatorTemplate {
  id: string;
  name: string;
  description: string;
  plannedResources: CreatorTemplateResource[];
}
