import type { CreatorPlan } from '@atlas/creator';

import { readJsonFile } from './files.js';

export const loadPlan = async (filePath: string): Promise<CreatorPlan> => {
  const payload = await readJsonFile(filePath);
  return payload as CreatorPlan;
};
