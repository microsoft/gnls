import type {Config} from 'jest'

export default {
  roots: ['<rootDir>/src'],
  transform: {'\\.tsx?$': 'ts-jest'},
} as Config
