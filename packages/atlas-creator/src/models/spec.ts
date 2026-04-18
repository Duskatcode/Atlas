import { z } from 'zod';

export const creatorRoleSpecSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  hoist: z.boolean().optional(),
  mentionable: z.boolean().optional(),
});

export const creatorChannelSpecSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['text', 'voice', 'category']).default('text'),
  topic: z.string().optional(),
  parent: z.string().optional(),
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
export type CreatorChannelSpec = z.infer<typeof creatorChannelSpecSchema>;
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
    return {
      valid: true,
      spec: parsed.data,
      issues: [],
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
