import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const readJsonFile = async (filePath: string): Promise<unknown> => {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

export const writeJsonFile = async (
  filePath: string,
  payload: unknown,
): Promise<void> => {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  await writeFile(filePath, JSON.stringify(payload, null, 2));
};

export const writeTextFile = async (filePath: string, content: string): Promise<void> => {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  await writeFile(filePath, content, 'utf8');
};
