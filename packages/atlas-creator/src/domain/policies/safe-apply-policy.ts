import type { CreatorPolicy } from './preview-policy.js';

export const CREATOR_SAFE_APPLY_POLICY: CreatorPolicy = {
  mode: 'safe-apply',
  allowsApply: true,
  allowsDestructiveChanges: false,
  duplicateStrategy: 'skip-existing',
  confirmationRequiredForApply: true,
};
