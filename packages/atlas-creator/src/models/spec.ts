import { z } from 'zod';

export const creatorRoleSpecSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  position: z.number().int().min(0).optional(),
  permissions: z.array(z.string().min(1)).optional(),
  hoist: z.boolean().optional(),
  mentionable: z.boolean().optional(),
});

export const creatorPermissionOverwriteSpecSchema = z.object({
  targetType: z.enum(['role', 'member']),
  target: z.string().min(1),
  allow: z.array(z.string().min(1)).default([]),
  deny: z.array(z.string().min(1)).default([]),
});

export const creatorForumTagSpecSchema = z.object({
  name: z.string().min(1),
  moderated: z.boolean().optional(),
  emoji: z.string().min(1).optional(),
});

const creatorChannelTypeSchema = z.enum(['text', 'voice', 'category', 'forum']);

export const creatorChannelSpecSchema = z.object({
  name: z.string().min(1),
  type: creatorChannelTypeSchema.default('text'),
  position: z.number().int().min(0).optional(),
  topic: z.string().optional(),
  nsfw: z.boolean().optional(),
  bitrate: z.number().int().min(0).optional(),
  userLimit: z.number().int().min(0).optional(),
  parent: z.string().optional(),
  forumTags: z.array(creatorForumTagSpecSchema).default([]),
  permissionOverwrites: z.array(creatorPermissionOverwriteSpecSchema).default([]),
}).superRefine((channel, context) => {
  if (channel.type === 'category') {
    if (channel.parent) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['parent'],
        message: 'Una categoría no puede tener parent.',
      });
    }

    if (channel.topic !== undefined || channel.nsfw !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['topic'],
        message: 'Una categoría no usa topic/nsfw.',
      });
    }

    if (channel.bitrate !== undefined || channel.userLimit !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bitrate'],
        message: 'Una categoría no usa bitrate/userLimit.',
      });
    }

    if (channel.forumTags.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['forumTags'],
        message: 'Una categoría no admite forumTags.',
      });
    }

    return;
  }

  if (channel.type === 'text') {
    if (channel.bitrate !== undefined || channel.userLimit !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bitrate'],
        message: 'Un canal de texto no usa bitrate/userLimit.',
      });
    }

    if (channel.forumTags.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['forumTags'],
        message: 'Un canal de texto no admite forumTags.',
      });
    }

    return;
  }

  if (channel.type === 'voice') {
    if (channel.topic !== undefined || channel.nsfw !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['topic'],
        message: 'Un canal de voz no usa topic/nsfw.',
      });
    }

    if (channel.forumTags.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['forumTags'],
        message: 'Un canal de voz no admite forumTags.',
      });
    }

    return;
  }

  if (channel.type === 'forum' && (channel.bitrate !== undefined || channel.userLimit !== undefined)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['bitrate'],
      message: 'Un foro no usa bitrate/userLimit.',
    });
  }
});

export const creatorGuildSpecSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
});

export const creatorSpecSchema = z.object({
  version: z.literal('1'),
  guild: creatorGuildSpecSchema,
  roles: z.array(creatorRoleSpecSchema).default([]),
  channels: z.array(creatorChannelSpecSchema).default([]),
  metadata: z.record(z.unknown()).optional(),
});

export type CreatorRoleSpec = z.infer<typeof creatorRoleSpecSchema>;
export type CreatorPermissionOverwriteSpec = z.infer<typeof creatorPermissionOverwriteSpecSchema>;
export type CreatorForumTagSpec = z.infer<typeof creatorForumTagSpecSchema>;
export type CreatorChannelSpec = z.infer<typeof creatorChannelSpecSchema>;
export type CreatorChannelType = z.infer<typeof creatorChannelTypeSchema>;
export type CreatorGuildSpec = z.infer<typeof creatorGuildSpecSchema>;
export type CreatorSpec = z.infer<typeof creatorSpecSchema>;

export interface SpecValidationIssue {
  path: string;
  message: string;
}

export interface SpecValidationResult {
  valid: boolean;
  spec?: CreatorSpec;
  issues: SpecValidationIssue[];
}

export const validateCreatorSpec = (candidate: unknown): SpecValidationResult => {
  const parsed = creatorSpecSchema.safeParse(candidate);
  if (parsed.success) {
    const issues: SpecValidationIssue[] = [];

    const roleNameCount = new Map<string, number>();
    for (const role of parsed.data.roles) {
      roleNameCount.set(role.name, (roleNameCount.get(role.name) ?? 0) + 1);
    }

    for (const [roleName, count] of roleNameCount.entries()) {
      if (count > 1) {
        issues.push({
          path: 'roles',
          message: `Nombre de rol duplicado: ${roleName}`,
        });
      }
    }

    const categoryNames = new Set(
      parsed.data.channels
        .filter((channel) => channel.type === 'category')
        .map((channel) => channel.name),
    );

    const channelKeyCount = new Map<string, number>();
    parsed.data.channels.forEach((channel, index) => {
      const key = `${channel.type}:${channel.name}`;
      channelKeyCount.set(key, (channelKeyCount.get(key) ?? 0) + 1);

      if (channel.parent && !categoryNames.has(channel.parent)) {
        issues.push({
          path: `channels.${index}.parent`,
          message: `Categoría parent no encontrada en la spec: ${channel.parent}`,
        });
      }

      const tagNameCount = new Map<string, number>();
      channel.forumTags.forEach((tag) => {
        tagNameCount.set(tag.name, (tagNameCount.get(tag.name) ?? 0) + 1);
      });

      for (const [tagName, count] of tagNameCount.entries()) {
        if (count > 1) {
          issues.push({
            path: `channels.${index}.forumTags`,
            message: `Forum tag duplicado en ${channel.name}: ${tagName}`,
          });
        }
      }

      const overwriteKeyCount = new Map<string, number>();
      channel.permissionOverwrites.forEach((overwrite) => {
        const overwriteKey = `${overwrite.targetType}:${overwrite.target}`;
        overwriteKeyCount.set(overwriteKey, (overwriteKeyCount.get(overwriteKey) ?? 0) + 1);
      });

      for (const [overwriteKey, count] of overwriteKeyCount.entries()) {
        if (count > 1) {
          issues.push({
            path: `channels.${index}.permissionOverwrites`,
            message: `Permission overwrite duplicado en ${channel.name}: ${overwriteKey}`,
          });
        }
      }
    });

    for (const [channelKey, count] of channelKeyCount.entries()) {
      if (count > 1) {
        issues.push({
          path: 'channels',
          message: `Canal duplicado por tipo/nombre: ${channelKey}`,
        });
      }
    }

    if (issues.length > 0) {
      return {
        valid: false,
        issues,
      };
    }

    return {
      valid: true,
      spec: parsed.data,
      issues,
    };
  }

  const issues = parsed.error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));

  return {
    valid: false,
    issues,
  };
};
