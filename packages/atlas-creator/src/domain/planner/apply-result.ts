export interface CreatorApplySummary {
  roles: string[];
  categories: string[];
  channels: string[];
}

export interface CreatorApplyResult {
  templateId: string;
  templateName: string;
  communityName: string;
  created: CreatorApplySummary;
  skipped: CreatorApplySummary;
  errors: string[];
  warnings: string[];
}
