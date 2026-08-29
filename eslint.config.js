const { defineConfig, globalIgnores } = require('eslint/config');
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig(
  globalIgnores(['dist/**', 'node_modules/**', 'eslint.config.js']),
  js.configs.recommended,
  tseslint.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);
