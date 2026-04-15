import { bootstrapAtlasBot } from './bootstrap/index.js';

bootstrapAtlasBot().catch((error) => {
  console.error('❌ Error arrancando Atlas:', error);
  process.exit(1);
});
