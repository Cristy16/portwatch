// vitest.integration.config.ts
import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ['**/*.integration.test.ts'],
  },
});