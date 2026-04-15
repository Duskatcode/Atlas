import { randomUUID } from 'node:crypto';

import type { CreatorTemplateInput } from '../domain/templates/template-contract.js';

export interface PendingCreatorApplyRequest {
  id: string;
  userId: string;
  guildId: string;
  templateId: string;
  input: CreatorTemplateInput;
  createdAt: number;
  expiresAt: number;
}

export interface ApplyConfirmationService {
  createRequest: (input: {
    userId: string;
    guildId: string;
    templateId: string;
    templateInput: CreatorTemplateInput;
  }) => PendingCreatorApplyRequest;
  getRequest: (requestId: string) => PendingCreatorApplyRequest | undefined;
  consumeRequest: (requestId: string) => PendingCreatorApplyRequest | undefined;
  cancelRequest: (requestId: string) => PendingCreatorApplyRequest | undefined;
  isExpired: (request: PendingCreatorApplyRequest, now?: number) => boolean;
  clearExpired: (now?: number) => void;
}

interface CreateApplyConfirmationServiceOptions {
  ttlMs: number;
}

export const createApplyConfirmationService = (
  options: CreateApplyConfirmationServiceOptions,
): ApplyConfirmationService => {
  const requests = new Map<string, PendingCreatorApplyRequest>();

  const clearExpired = (now = Date.now()): void => {
    for (const [requestId, request] of requests.entries()) {
      if (request.expiresAt <= now) {
        requests.delete(requestId);
      }
    }
  };

  return {
    createRequest: ({ userId, guildId, templateId, templateInput }) => {
      clearExpired();
      const createdAt = Date.now();
      const request: PendingCreatorApplyRequest = {
        id: randomUUID().replace(/-/g, ''),
        userId,
        guildId,
        templateId,
        input: templateInput,
        createdAt,
        expiresAt: createdAt + options.ttlMs,
      };

      requests.set(request.id, request);
      return request;
    },
    getRequest: (requestId) => {
      clearExpired();
      return requests.get(requestId);
    },
    consumeRequest: (requestId) => {
      clearExpired();
      const request = requests.get(requestId);
      if (!request) {
        return undefined;
      }

      requests.delete(requestId);
      return request;
    },
    cancelRequest: (requestId) => {
      clearExpired();
      const request = requests.get(requestId);
      if (!request) {
        return undefined;
      }

      requests.delete(requestId);
      return request;
    },
    isExpired: (request, now = Date.now()) => request.expiresAt <= now,
    clearExpired,
  };
};
