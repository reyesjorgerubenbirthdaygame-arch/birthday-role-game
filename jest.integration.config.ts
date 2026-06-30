import type { Config } from 'jest'

const config: Config = {
  displayName: 'integration',
  testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
  testEnvironment: 'node',
  preset: 'ts-jest',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: true } }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
}

export default config
