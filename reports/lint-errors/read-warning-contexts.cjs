const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('any-warnings.json', 'utf8'));
const basePath = 'C:\\Users\\evan\\Desktop\\Odysseus\\odysseus-app\\client\\src\\';

// Read file content and extract context around warning lines
function getContext(filePath, lineNumber, contextLines = 5) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const start = Math.max(0, lineNumber - contextLines - 1);
    const end = Math.min(lines.length, lineNumber + contextLines);

    return {
      before: lines.slice(start, lineNumber - 1),
      target: lines[lineNumber - 1],
      after: lines.slice(lineNumber, end)
    };
  } catch (err) {
    return null;
  }
}

// Categorize based on patterns
function categorize(context, filePath) {
  const target = context?.target || '';
  const fullPath = filePath.toLowerCase();

  // Error handling patterns
  if (target.includes('catch') || target.includes('error:') || target.includes('Error') ||
      fullPath.includes('error') || target.includes('originalError')) {
    return 'error-handling';
  }

  // Generic type parameters
  if (target.includes('<T = any>') || target.includes('T = any') || target.includes('Record<string, any>')) {
    return 'generic-types';
  }

  // API/Response transformers
  if (target.includes('data: any') || target.includes('response: any') ||
      fullPath.includes('transformer') || fullPath.includes('api')) {
    return 'api-responses';
  }

  // Field resolvers
  if (fullPath.includes('fieldresolver') || fullPath.includes('field') && target.includes('any')) {
    return 'field-resolvers';
  }

  // Event handlers
  if (target.includes('event:') || target.includes('handler') || target.includes('onChange') ||
      target.includes('onClick') || target.includes('onSubmit')) {
    return 'event-handlers';
  }

  // Query/Cache related
  if (fullPath.includes('query') || fullPath.includes('cache') || fullPath.includes('optimistic')) {
    return 'query-cache';
  }

  // Configuration/settings
  if (fullPath.includes('config') || fullPath.includes('setting')) {
    return 'configuration';
  }

  // Type definitions
  if (fullPath.includes('types.ts') || target.includes('interface') || target.includes('type ')) {
    return 'type-definitions';
  }

  // Utility functions
  if (fullPath.includes('util') || fullPath.includes('helper')) {
    return 'utilities';
  }

  return 'other';
}

// Analyze all warnings
const categories = {};
const fileAnalysis = {};

data.warnings.forEach(warning => {
  const context = getContext(warning.file, warning.line);
  const category = categorize(context, warning.file);

  if (!categories[category]) {
    categories[category] = [];
  }

  categories[category].push({
    file: warning.file.replace(basePath, ''),
    line: warning.line,
    code: context?.target?.trim() || 'N/A'
  });

  const shortFile = warning.file.replace(basePath, '');
  if (!fileAnalysis[shortFile]) {
    fileAnalysis[shortFile] = {
      count: 0,
      lines: [],
      categories: new Set()
    };
  }
  fileAnalysis[shortFile].count++;
  fileAnalysis[shortFile].lines.push(warning.line);
  fileAnalysis[shortFile].categories.add(category);
});

// Convert sets to arrays for JSON
Object.keys(fileAnalysis).forEach(file => {
  fileAnalysis[file].categories = Array.from(fileAnalysis[file].categories);
});

console.log('\n=== CATEGORY BREAKDOWN ===\n');
Object.entries(categories).sort((a, b) => b[1].length - a[1].length).forEach(([cat, items]) => {
  console.log(`${cat}: ${items.length} warnings`);
});

console.log('\n=== TOP FILES BY CATEGORY ===\n');
Object.entries(categories).forEach(([cat, items]) => {
  const byFile = {};
  items.forEach(item => {
    if (!byFile[item.file]) byFile[item.file] = 0;
    byFile[item.file]++;
  });
  const sorted = Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`\n${cat.toUpperCase()}:`);
  sorted.forEach(([file, count]) => {
    console.log(`  ${count} - ${file}`);
  });
});

// Save detailed analysis
fs.writeFileSync('warning-analysis.json', JSON.stringify({
  categories,
  fileAnalysis,
  summary: Object.fromEntries(
    Object.entries(categories).map(([k, v]) => [k, v.length])
  )
}, null, 2));

console.log('\n\nDetailed analysis saved to warning-analysis.json');
