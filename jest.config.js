/**
 * Jest config for Scasi-AI.
 *
 * Setup:  npm install --save-dev jest @testing-library/jest-dom
 * Run:    npx jest
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest')({ dir: './' });

/** @type {import('jest').Config} */
const config = {
    testEnvironment: 'jsdom',
    testMatch: ['**/__tests__/**/*.test.(ts|tsx|js)'],
};

module.exports = nextJest(config);
