import type { CreatorSnapshot } from '@atlas/creator';

import { readJsonFile } from './files.js';

export const loadSnapshot = async (filePath: string): Promise<CreatorSnapshot> => {
  const payload = await readJsonFile(filePath);
  return payload as CreatorSnapshot;
};
