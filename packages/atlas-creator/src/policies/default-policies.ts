import type { CreatorPolicy } from './types.js';

export const preventManagedDeletePolicy: CreatorPolicy = {
  id: 'prevent-managed-delete',
  description: 'Evita eliminar recursos marcados como managed en el snapshot.',
  evaluate: (change, context) => {
    if (change.action !== 'delete') {
      return { decision: 'allow' };
    }

    if (change.resource === 'role') {
      const role = context.snapshot.roles.find((item) => item.name === change.target);
      if (role?.managed) {
        return {
          decision: 'deny',
          reason: `No se elimina rol managed: ${change.target}`,
        };
      }
    }

    if (change.resource === 'channel') {
      const channel = context.snapshot.channels.find((item) => item.name === change.target);
      if (channel?.managed) {
        return {
          decision: 'deny',
          reason: `No se elimina canal managed: ${change.target}`,
        };
      }
    }

    return { decision: 'allow' };
  },
};

export const defaultCreatorPolicies: CreatorPolicy[] = [preventManagedDeletePolicy];
