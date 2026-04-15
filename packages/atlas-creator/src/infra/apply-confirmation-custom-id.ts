const applyPrefix = 'creator:apply';

type CreatorApplyAction = 'confirm' | 'cancel';

const actionSet = new Set<CreatorApplyAction>(['confirm', 'cancel']);

export interface CreatorApplyCustomId {
  action: CreatorApplyAction;
  requestId: string;
}

export const buildCreatorApplyCustomId = (
  action: CreatorApplyAction,
  requestId: string,
): string => `${applyPrefix}:${action}:${requestId}`;

export const parseCreatorApplyCustomId = (
  customId: string,
): CreatorApplyCustomId | undefined => {
  const [prefix, scope, action, requestId] = customId.split(':');
  if (`${prefix}:${scope}` !== applyPrefix) {
    return undefined;
  }

  if (!actionSet.has(action as CreatorApplyAction)) {
    return undefined;
  }

  if (!requestId || requestId.length < 8) {
    return undefined;
  }

  return {
    action: action as CreatorApplyAction,
    requestId,
  };
};

export const creatorApplyButtonMatcher = /^creator:apply:(confirm|cancel):[a-z0-9]{8,}$/i;
