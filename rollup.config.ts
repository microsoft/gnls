import type {RollupOptions} from 'rollup'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'

const production = process.env.NODE_ENV == 'production'

export default {
  input: ['src/index.ts', 'src/server.ts'],
  output: {
    dir: 'build',
    format: 'cjs',
    sourcemap: true,
  },
  plugins: [
    // this comment prevents prettier from formatting this array into a single line
    resolve(),
    commonjs(),
    typescript({module: 'esnext'}),
    production && terser(),
  ].filter(Boolean),
  external: ['vscode'],
} as RollupOptions
