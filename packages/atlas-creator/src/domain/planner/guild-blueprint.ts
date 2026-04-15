export interface CreatorRoleBlueprint {
  name: string;
  reason: string;
  permissions: string[];
}

export interface CreatorCategoryBlueprint {
  key: string;
  name: string;
  reason: string;
}

export type CreatorChannelKind = 'text' | 'voice';

export interface CreatorChannelBlueprint {
  name: string;
  type: CreatorChannelKind;
  categoryKey: string;
  reason: string;
}

export interface CreatorGuildBlueprint {
  roles: CreatorRoleBlueprint[];
  categories: CreatorCategoryBlueprint[];
  channels: CreatorChannelBlueprint[];
}
