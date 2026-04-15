export interface CreatorPreviewPolicyInput {
  applyRequested?: boolean;
}

export const assertPreviewPolicy = (input: CreatorPreviewPolicyInput): void => {
  if (input.applyRequested) {
    throw new Error(
      'La aplicación real de cambios aún no está habilitada. Usa solo preview.',
    );
  }
};
