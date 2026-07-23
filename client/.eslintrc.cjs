module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:@tanstack/query/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: ['./tsconfig.json'],
  },
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    'jsx-a11y',
    '@tanstack/query',
    'import',
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        moduleDirectory: ['node_modules', 'src'],
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off', // Not needed in React 18+
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react-hooks/exhaustive-deps': 'error', // Critical for hook dependencies

    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',

    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
          'type',
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
        pathGroups: [
          {
            pattern: 'react',
            group: 'external',
            position: 'before',
          },
          {
            pattern: '@/**',
            group: 'internal',
          },
        ],
        pathGroupsExcludedImportTypes: ['react'],
      },
    ],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',

    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/no-static-element-interactions': 'error',

    '@tanstack/query/exhaustive-deps': 'error',
    '@tanstack/query/stable-query-client': 'error',

    'no-console': 'error', // Enforce structured logging via ClientLogger
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',

    // Typography system: forbid arbitrary font sizes — use the semantic tokens
    // (text-body/body-sm/caption, text-label-*, text-data-*, text-title*, text-display).
    // See docs/typography-refactor-plan.md.
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/text-\\[[0-9]/]',
        message:
          'Arbitrary font size (text-[Npx]) is not allowed — use a semantic typography token (text-body/body-sm/caption, text-label-*, text-data-*, text-title*). See docs/typography-refactor-plan.md. For genuine physical/print sizing, disable this rule on the line with a reason.',
      },
      {
        selector: 'TemplateElement[value.cooked=/text-\\[[0-9]/]',
        message:
          'Arbitrary font size (text-[Npx]) is not allowed — use a semantic typography token (text-body/body-sm/caption, text-label-*, text-data-*, text-title*). See docs/typography-refactor-plan.md.',
      },
    ],
  },
  overrides: [
    {
      // Logger implementation needs console access
      files: ['**/shared/infrastructure/logger/**/*', '**/ClientLogger.ts'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      // Test files can be less strict
      files: ['**/__tests__/**/*', '**/*.test.*', '**/*.spec.*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
    {
      // Config files can use require
      files: ['*.config.*', '.eslintrc.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      // Barcode/print components render printed output at physical px sizes
      files: ['**/BarcodeSheetPreview.tsx'],
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
  ],
};
