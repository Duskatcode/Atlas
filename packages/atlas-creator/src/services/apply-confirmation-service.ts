import { randomUUID } from 'node:crypto';
import { ATLAS_CREATOR_APPLY_CONFIRMATION_TTL_MS } from '../config/index.js';

export interface CreatorApplyConfirmation {
  id: string;
  templateId: string;
  guildId: string;
  requestedByUserId: string;
  createdAt: number;
  expiresAt: number;
}

const pendingConfirmations = new Map<string, CreatorApplyConfirmation>();
const confirmationTimers = new Map<string, ReturnType<typeof setTimeout>>();

const clearConfirmationTimer = (confirmationId: string) => {
  const timer = confirmationTimers.get(confirmationId);
  if (!timer) return;
  clearTimeout(timer);
  confirmationTimers.delete(confirmationId);
};

const removeConfirmation = (confirmationId: string) => {
  clearConfirmationTimer(confirmationId);
  pendingConfirmations.delete(confirmationId);
};

const hasExpired = (confirmation: CreatorApplyConfirmation): boolean =>
  confirmation.expiresAt <= Date.now();

const getLiveConfirmation = (confirmationId: string) => {
  const pending = pendingConfirmations.get(confirmationId);
  if (!pending) {
    return null;
  }

  if (hasExpired(pending)) {
    removeConfirmation(confirmationId);
    return null;
  }

  return pending;
};

export const createCreatorApplyConfirmation = (input: {
  templateId: string;
  guildId: string;
  requestedByUserId: string;
}): CreatorApplyConfirmation => {
  const now = Date.now();
  const confirmation: CreatorApplyConfirmation = {
    id: randomUUID(),
    templateId: input.templateId,
    guildId: input.guildId,
    requestedByUserId: input.requestedByUserId,
    createdAt: now,
    expiresAt: now + ATLAS_CREATOR_APPLY_CONFIRMATION_TTL_MS,
  };

  pendingConfirmations.set(confirmation.id, confirmation);

  const timer = setTimeout(() => {
    removeConfirmation(confirmation.id);
  }, ATLAS_CREATOR_APPLY_CONFIRMATION_TTL_MS);
  timer.unref?.();
  confirmationTimers.set(confirmation.id, timer);

  return confirmation;
};

export const getCreatorApplyConfirmation = (confirmationId: string) =>
  getLiveConfirmation(confirmationId);

export const consumeCreatorApplyConfirmation = (confirmationId: string) => {
  const confirmation = getLiveConfirmation(confirmationId);
  if (!confirmation) {
    return null;
  }

  removeConfirmation(confirmationId);
  return confirmation;
};

export const cancelCreatorApplyConfirmation = (confirmationId: string) => {
  const confirmation = getLiveConfirmation(confirmationId);
  if (!confirmation) {
    return false;
  }

  removeConfirmation(confirmationId);
  return true;
};
