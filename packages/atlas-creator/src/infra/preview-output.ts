export const clampPreviewMessage = (content: string, maxLength: number): string => {
  if (content.length <= maxLength) {
    return content;
  }

  return `${content.slice(0, maxLength - 22)}\n\n... (preview truncado)`;
};
