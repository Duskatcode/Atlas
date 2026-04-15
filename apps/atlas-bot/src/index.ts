import { bootstrapAtlasBot } from './bootstrap/index.js';

bootstrapAtlasBot().catch((error) => {
  console.error('❌ Error iniciando Atlas:', error);
  process.exitCode = 1;
});
