import type {Config} from '@jest/types'

export default <Config.InitialOptions>{
  roots: ['<rootDir>/src'],
  transform: {'\\.tsx?$': 'ts-jest'},
}
