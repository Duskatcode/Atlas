import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

export interface ConfirmationInput {
  prompt: string;
  expectedValue: string;
}

export const requestExplicitConfirmation = async ({
  prompt,
  expectedValue,
}: ConfirmationInput): Promise<boolean> => {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error(
      'No hay terminal interactiva para confirmar apply. Usa --yes si deseas confirmar explícitamente por flag.',
    );
  }

  const readline = createInterface({
    input: stdin,
    output: stdout,
  });

  try {
    const answer = await readline.question(`${prompt} `);
    return answer.trim() === expectedValue;
  } finally {
    readline.close();
  }
};
