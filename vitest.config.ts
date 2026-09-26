import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/*.integration.test.ts',
    ],
  },
});