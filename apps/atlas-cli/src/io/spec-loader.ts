import { validateCreatorSpec, type CreatorSpec } from '@atlas/creator';

import { readJsonFile } from './files.js';

export const loadSpec = async (filePath: string): Promise<CreatorSpec> => {
  const payload = await readJsonFile(filePath);
  const validation = validateCreatorSpec(payload);

  if (!validation.valid || !validation.spec) {
    const details = validation.issues
      .map((issue) => `- ${issue.path}: ${issue.message}`)
      .join('\n');
    throw new Error(`Spec inválida en ${filePath}.\n${details}`);
  }

  return validation.spec;
};
