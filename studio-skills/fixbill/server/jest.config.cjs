/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: { module: 'NodeNext', moduleResolution: 'NodeNext', types: ['node', 'jest'] } }],
  },
  testMatch: ['**/tests/**/*.test.ts'],
  testTimeout: 30000,
};
