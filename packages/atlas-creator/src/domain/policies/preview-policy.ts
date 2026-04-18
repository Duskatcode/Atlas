export interface CreatorPolicy {
  mode: 'preview-only' | 'safe-apply';
  allowsApply: boolean;
  allowsDestructiveChanges: boolean;
  duplicateStrategy: 'skip-existing';
  confirmationRequiredForApply: boolean;
}

export const CREATOR_PREVIEW_POLICY: CreatorPolicy = {
  mode: 'preview-only',
  allowsApply: false,
  allowsDestructiveChanges: false,
  duplicateStrategy: 'skip-existing',
  confirmationRequiredForApply: true,
};
