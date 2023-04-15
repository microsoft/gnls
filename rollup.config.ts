import type { RollupOptions } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';

const rollupConfig: RollupOptions = {
  input: ['src/index.ts', 'src/server.ts'],

  output: {
    dir: 'build',
    format: 'cjs',
    sourcemap: true,
  },

  plugins: [
    /* Resolve node modules */
    resolve({
      browser: false,
      preferBuiltins: true,
    }),

    /* Convert CommonJS modules to ES6 */
    commonjs(),

    /* Compile TypeScript */
    typescript({
      module: 'esnext',
      target: 'es2019',
      lib: ['es2019', 'DOM'],
      sourceMap: true,
    }),

    /* Minify JavaScript in production */
    isProduction && terser(),
  ],

  /* Specify external dependencies */
  external: ['vscode'],

  /* Watch for changes */
  watch: {
    include: 'src/**',
    clearScreen: false,
  },

  /* Customize the Rollup cache */
  cache: {
    // Specify the maximum number of items that can be retained in the cache
    maxEntries: 1000,

    // Specify the maximum size of the cache in bytes
    maxBytes: 100 * 1024 * 1024,
  },
};

export default rollupConfig;
