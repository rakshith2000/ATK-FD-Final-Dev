//  @ts-check

// import { tanstackConfig } from '@tanstack/eslint-config';
import tseslint from 'typescript-eslint';

export default [
    // ...tanstackConfig,
    ...tseslint.configs.recommended,
    {
        ignores: ['dist/**', 'build/**', 'node_modules/**', '*.config.js', '*.test.{js,ts,tsx}'],
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
            'sort-imports': 'off',
            'import/consistent-type-specifier-style': 'off',
            '@typescript-eslint/no-unnecessary-condition': 'off',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/consistent-type-imports': 'error',
            'no-console': 'error',
        },
    },
    {
        files: ['**/*.{css,scss}'],
        ignores: ['**/*.{css,scss}'],
        rules: {
            'scss/unknown-at-rule': 'off',
        },
    },
];
