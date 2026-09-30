import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import pluginQuery from '@tanstack/eslint-plugin-query';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      '**/coverage/**',
      '**/routeTree.gen.ts',
      '**/generated/**',
      'graphify-out/**',
    ],
  },
  eslint.configs.recommended,
  eslintPluginPrettierRecommended,
  ...tseslint.configs.recommended,
  ...pluginQuery.configs['flat/recommended'],
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.{ts,js,mjs}'],
    rules: {
      'max-lines-per-function': [
        'error',
        {
          max: 80,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
    },
  },
  {
    files: ['**/*.{tsx,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'react/no-multi-comp': ['error', { ignoreStateless: false }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react/self-closing-comp': 'error',
      'react/jsx-no-useless-fragment': 'error',
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
      'react/no-array-index-key': 'warn',
      'max-lines-per-function': [
        'error',
        {
          max: 200,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
    },
  },
  {
    files: ['**/components/ui/**', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'react/no-multi-comp': 'off',
    },
  },
  {
    files: [
      '**/*.test.{ts,tsx,js,mjs}',
      '**/*.spec.{ts,tsx,js,mjs}',
      '**/*.e2e-spec.{ts,tsx,js,mjs}',
      '**/tests/**',
      '**/testing/**',
      '**/*.config.*',
      '**/openapi.ts',
    ],
    rules: {
      'max-lines-per-function': 'off',
    },
  },
);
