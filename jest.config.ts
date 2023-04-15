import type { Config } from '@jest/types';

const jestConfig: Config.InitialOptions = {
  /* Specify the test runner */
  testRunner: 'jest-circus/runner',

  /* Specify the root directory of the project */
  roots: ['<rootDir>/src'],

  /* Specify the file extensions to include in the tests */
  testMatch: ['**/*.test.(ts|tsx)'],

  /* Transform TypeScript files using ts-jest */
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },

  /* Map module names to paths, to avoid importing mocks and stubs */
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/test/$1',
  },

  /* Ignore files and directories when searching for tests */
  testPathIgnorePatterns: ['<rootDir>/node_modules/'],

  /* Display coverage information */
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['lcov', 'text-summary'],

  /* Specify the test environment */
  testEnvironment: 'node',

  /* Customize the output of test results */
  verbose: true,
  maxWorkers: 4,

  /* Watch for changes */
  watchPathIgnorePatterns: ['/node_modules/', '/.git/'],

  /* Clear the cache between test runs */
  clearMocks: true,
};

export default jestConfig;
