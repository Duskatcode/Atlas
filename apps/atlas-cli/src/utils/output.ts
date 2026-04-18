export const printJson = (payload: unknown): void => {
  console.log(JSON.stringify(payload, null, 2));
};

export const printText = (content: string): void => {
  process.stdout.write(content);
};

export const printHelp = (): void => {
  console.log(`Atlas CLI\n\nComandos:\n  atlas snapshot --guild <id> [--out <path>] [--format json|yaml]\n  atlas validate --spec <path>\n  atlas plan --spec <path> [--snapshot <path>] [--source memory|discord] [--out <path>]\n  atlas apply --spec <path> --plan <path> [--snapshot <path>] [--dry-run]\n  atlas sync --spec <path> [--source memory|discord] [--dry-run] [--out <path>]\n`);
};
