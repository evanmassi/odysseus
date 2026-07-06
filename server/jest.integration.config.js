const base = require('./jest.config');

module.exports = {
  ...base,
  testMatch: ['**/tests/integration/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  // Shared odysseus_test DB: run serially so suites don't TRUNCATE each other's rows.
  maxWorkers: 1,
  testTimeout: 30000,
};
