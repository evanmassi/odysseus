#!/usr/bin/env node

/**
 * Phase 0 Setup Verification Script
 * 
 * Systematically verifies that all Phase 0 components are working correctly
 * before proceeding to Phase 1.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Phase 0 Setup Verification\n');

const checks = [
  {
    name: 'Package.json Dependencies',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      const required = [
        'eslint',
        'prettier', 
        '@typescript-eslint/parser',
        '@testing-library/react',
        'vitest',
        'husky',
        'lint-staged'
      ];
      
      const missing = required.filter(dep => 
        !pkg.devDependencies[dep] && !pkg.dependencies[dep]
      );
      
      if (missing.length > 0) {
        throw new Error(`Missing dependencies: ${missing.join(', ')}`);
      }
      return '✅ All required dependencies present';
    }
  },
  {
    name: 'Configuration Files',
    check: () => {
      const requiredFiles = [
        '.eslintrc.js',
        '.prettierrc.js', 
        '.prettierignore',
        '.eslintignore',
        'vitest.config.ts',
        'src/__tests__/setup.ts'
      ];
      
      const missing = requiredFiles.filter(file => !fs.existsSync(file));
      
      if (missing.length > 0) {
        throw new Error(`Missing config files: ${missing.join(', ')}`);
      }
      return '✅ All configuration files present';
    }
  },
  {
    name: 'TypeScript Configuration',
    check: () => {
      const tsconfig = JSON.parse(fs.readFileSync('./tsconfig.json', 'utf8'));
      
      if (!tsconfig.compilerOptions.strict) {
        throw new Error('TypeScript strict mode not enabled');
      }
      
      if (!tsconfig.compilerOptions.exactOptionalPropertyTypes) {
        throw new Error('exactOptionalPropertyTypes not enabled');
      }
      
      return '✅ TypeScript strict configuration verified';
    }
  },
  {
    name: 'NPM Scripts',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      const requiredScripts = [
        'lint',
        'format', 
        'typecheck',
        'test',
        'pre-commit'
      ];
      
      const missing = requiredScripts.filter(script => !pkg.scripts[script]);
      
      if (missing.length > 0) {
        throw new Error(`Missing scripts: ${missing.join(', ')}`);
      }
      return '✅ All required npm scripts present';
    }
  }
];

// Run all checks
let passed = 0;
let failed = 0;

for (const { name, check } of checks) {
  try {
    const result = check();
    console.log(`${name}: ${result}`);
    passed++;
  } catch (error) {
    console.log(`${name}: ❌ ${error.message}`);
    failed++;
  }
}

console.log(`\n📊 Summary: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('\n⚠️  Fix the above issues before proceeding to installation checks.');
  process.exit(1);
} else {
  console.log('\n✅ Configuration verification complete! Ready for installation checks.');
}
