import path from 'path'
import process from 'process'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import {terser} from 'rollup-plugin-terser'

/**
 * @param {string} file
 * @returns {import('rollup').RollupOptions}
 */
function config(file) {
  const production = process.env.NODE_ENV == 'production'
  return {
    input: path.join('src', `${file}.ts`),
    output: {
      file: path.join('build', `${file}.js`),
      format: 'commonjs',
      sourcemap: true,
    },
    plugins: [
      resolve({preferBuiltins: true}),
      commonjs(),
      typescript({module: 'esnext'}),
      production && terser(),
    ].filter(Boolean),
    external: ['vscode'],
  }
}

export default ['index', 'server'].map(config)
