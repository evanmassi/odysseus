import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stylesDir = join(root, 'client/src/shared/styles');
const sourcePath = join(root, 'docs/mockups/workbench-builder-study.html');
const outputPath = join(root, 'docs/mockups/dist/workbench.html');
const GRIDSTACK = 'https://cdn.jsdelivr.net/npm/gridstack@10.3.1/dist';

const APP_KEYS = [
  [/const STORAGE_KEY = '[^']+';/, "const STORAGE_KEY = 'odysseus-workbench-app';"],
  [
    /const LAB_MEMORY_KEY = '[^']+';/,
    "const LAB_MEMORY_KEY = 'odysseus-workbench-app-lab-memory';",
  ],
];

function replaceOnce(html, pattern, replacement) {
  const matches = html.split(pattern).length - 1;
  if (matches !== 1) throw new Error(`Expected one match for ${pattern}, found ${matches}`);
  return html.replace(pattern, () => replacement);
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.text();
}

function inlineFonts() {
  const fontsDir = join(stylesDir, 'fonts');
  return readFileSync(join(fontsDir, 'fonts.css'), 'utf8').replace(
    /url\('\.\/([^']+\.ttf)'\)/g,
    (_, file) => {
      const data = readFileSync(join(fontsDir, file)).toString('base64');
      return `url('data:font/ttf;base64,${data}')`;
    }
  );
}

const style = css => `<style>\n${css}\n</style>`;
const script = js => `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`;

let html = readFileSync(sourcePath, 'utf8');
html = replaceOnce(
  html,
  '<link rel="stylesheet" href="../../client/src/shared/styles/fonts/fonts.css" />',
  style(inlineFonts())
);
html = replaceOnce(
  html,
  '<link rel="stylesheet" href="../../client/src/shared/styles/base/variables.css" />',
  style(readFileSync(join(stylesDir, 'base/variables.css'), 'utf8'))
);
html = replaceOnce(
  html,
  `<link rel="stylesheet" href="${GRIDSTACK}/gridstack.min.css" />`,
  style(await fetchText(`${GRIDSTACK}/gridstack.min.css`))
);
html = replaceOnce(
  html,
  `<script src="${GRIDSTACK}/gridstack-all.js"></script>`,
  script(await fetchText(`${GRIDSTACK}/gridstack-all.js`))
);
for (const [pattern, replacement] of APP_KEYS) html = replaceOnce(html, pattern, replacement);

const leftovers = html.match(/(?:href|src)="(?:\.\.\/|https?:)[^"]*"/g);
if (leftovers) throw new Error(`Still loads outside files: ${leftovers.join(', ')}`);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html);
console.log(`Built ${outputPath} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB)`);
