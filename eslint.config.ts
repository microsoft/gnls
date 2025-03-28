import js from '@eslint/js'
import typescript from 'typescript-eslint'

export default typescript.config(
  js.configs.recommended,
  ...typescript.configs.strictTypeChecked,
  ...typescript.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
  {
    files: ['**/*.js'],
    ...typescript.configs.disableTypeChecked,
  },
  {
    ignores: ['build', 'addon/gn'],
  },
)
