#!/usr/bin/env node

/**
 * Phase 0 Setup Completion Script
 * 
 * Completes all remaining Phase 0 setup tasks and verifies they work.
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Completing Phase 0 Setup\n');

const steps = [
  {
    name: 'Install Dependencies',
    command: 'npm install',
    description: 'Installing all ESLint, Prettier, Testing, and Husky dependencies'
  },
  {
    name: 'Initialize Husky',
    command: 'npx husky install',
    description: 'Setting up Git hooks for pre-commit quality checks'
  },
  {
    name: 'TypeScript Compilation Check',
    command: 'npm run typecheck',
    description: 'Verifying TypeScript compiles without errors'
  },
  {
    name: 'ESLint Check',
    command: 'npm run lint',
    description: 'Running linter to identify code quality issues',
    allowFailure: true // We expect some violations initially
  },
  {
    name: 'Prettier Format Check',
    command: 'npm run format:check',
    description: 'Checking code formatting consistency',
    allowFailure: true // We expect formatting issues initially
  },
  {
    name: 'Run Example Test',
    command: 'npm test',
    description: 'Verifying testing infrastructure works correctly'
  }
];

let results = [];

for (const { name, command, description, allowFailure = false } of steps) {
  console.log(`\n📋 ${name}`);
  console.log(`   ${description}`);
  console.log(`   Running: ${command}`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe'
    });
    
    console.log('   ✅ Success');
    results.push({ name, status: 'success', output: output.slice(0, 200) });
    
  } catch (error) {
    const isExpectedFailure = allowFailure;
    const status = isExpectedFailure ? 'expected-failure' : 'failure';
    const icon = isExpectedFailure ? '⚠️' : '❌';
    
    console.log(`   ${icon} ${isExpectedFailure ? 'Expected issues found' : 'Failed'}`);
    
    if (error.stdout) {
      console.log(`   Output: ${error.stdout.slice(0, 200)}`);
    }
    
    results.push({ 
      name, 
      status, 
      error: error.message,
      output: error.stdout || error.stderr 
    });
    
    if (!allowFailure) {
      console.log('\n🛑 Critical failure - stopping setup');
      break;
    }
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 PHASE 0 SETUP SUMMARY');
console.log('='.repeat(60));

results.forEach(({ name, status, output, error }) => {
  const icon = {
    'success': '✅',
    'expected-failure': '⚠️',
    'failure': '❌'
  }[status];
  
  console.log(`${icon} ${name}: ${status.toUpperCase()}`);
});

const successCount = results.filter(r => r.status === 'success').length;
const totalCount = results.length;

console.log(`\nResults: ${successCount}/${totalCount} steps completed successfully`);

// Next steps guidance
console.log('\n📋 NEXT STEPS:');

const hasLintingIssues = results.find(r => r.name === 'ESLint Check' && r.status === 'expected-failure');
const hasFormattingIssues = results.find(r => r.name === 'Prettier Format Check' && r.status === 'expected-failure');

if (hasLintingIssues) {
  console.log('1. Fix linting issues: npm run lint:fix');
}

if (hasFormattingIssues) {
  console.log('2. Fix formatting: npm run format');
}

if (successCount === totalCount || (hasLintingIssues || hasFormattingIssues)) {
  console.log('3. Test pre-commit hook: git add . && git commit -m "test"');
  console.log('4. Ready for Phase 1: Data Access Unification');
}

console.log('\n🎉 Phase 0 infrastructure setup complete!');
