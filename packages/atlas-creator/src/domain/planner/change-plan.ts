import type {
  CreatorCategoryBlueprint,
  CreatorChannelBlueprint,
  CreatorRoleBlueprint,
} from './guild-blueprint.js';

export interface CreatorChangePlan {
  templateId: string;
  templateName: string;
  communityName: string;
  dryRun: true;
  rolesToCreate: CreatorRoleBlueprint[];
  categoriesToCreate: CreatorCategoryBlueprint[];
  channelsToCreate: CreatorChannelBlueprint[];
  warnings: string[];
}
