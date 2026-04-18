import type { CreatorPolicy } from './types.js';

export const flagManagedConflictPolicy: CreatorPolicy = {
  id: 'flag-managed-conflict',
  description: 'Marca conflictos potenciales cuando hay recursos managed con diferencias.',
  evaluate: (change, context) => {
    if (change.action !== 'potential-conflict') {
      return { decision: 'allow' };
    }

    if (change.resource === 'role') {
      const roleName = change.target.replace('role:', '');
      const role = context.snapshot.roles.find((item) => item.name === roleName);
      if (role?.managed) {
        return {
          decision: 'warn',
          reason: `Conflicto sobre rol managed detectado: ${change.target}`,
        };
      }
    }

    if (['category', 'text-channel', 'voice-channel', 'forum-channel'].includes(change.resource)) {
      const [, channelName] = change.target.split(':', 2);
      const channel = context.snapshot.channels.find((item) => item.name === channelName);
      if (channel?.managed) {
        return {
          decision: 'warn',
          reason: `Conflicto sobre canal managed detectado: ${change.target}`,
        };
      }
    }

    return { decision: 'allow' };
  },
};

export const defaultCreatorPolicies: CreatorPolicy[] = [flagManagedConflictPolicy];
