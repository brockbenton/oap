import { defineConfig } from 'vitest/config';
import { TEST_ENV } from './test/testEnv';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globalSetup: ['./test/globalSetup.ts'],
    env: TEST_ENV,
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 90000,
  },
});
