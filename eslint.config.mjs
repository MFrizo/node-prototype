import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    ignores: ['dist/**', '**/*.js', '.yarn/sdks/**', '.pnp.cjs'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        console: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-extraneous-class': [
        'error',
        {
          allowStaticOnly: true,
        },
      ],
      '@typescript-eslint/no-empty-object-type': [
        'error',
        {
          allowInterfaces: 'always',
        },
      ],
    },
  },
  {
    files: ['src/__tests__/**/*.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
        console: 'readonly',
      },
    },
  },
];
