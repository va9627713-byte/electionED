module.exports = {
  testEnvironment: 'node',
  testEnvironmentOptions: {},
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'server.js',
    '!node_modules/**'
  ],
  testTimeout: 15000,
  verbose: true,
  forceExit: true,
  testEnvironment: 'node',
  // Set NODE_ENV=test so server.js does not bind a port during tests
  globalSetup: undefined,
  setupFiles: ['<rootDir>/jest.setup.js']
};