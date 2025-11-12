const fs = require('fs');
const data = JSON.parse(fs.readFileSync('any-warnings.json', 'utf8'));

const byFile = {};
data.warnings.forEach(w => {
  const file = w.file;
  if (!byFile[file]) byFile[file] = [];
  byFile[file].push(w.line);
});

const sorted = Object.entries(byFile).sort((a, b) => b[1].length - a[1].length);

console.log('Files by warning count:');
sorted.forEach(([file, lines]) => {
  const shortPath = file.replace('C:\\Users\\evan\\Desktop\\Odysseus\\odysseus-app\\client\\src\\', '');
  const count = lines.length.toString().padStart(3);
  console.log(`${count} - ${shortPath}`);
});

const output = {};
sorted.forEach(([file, lines]) => {
  const shortPath = file.replace('C:\\Users\\evan\\Desktop\\Odysseus\\odysseus-app\\client\\src\\', '');
  output[shortPath] = lines;
});

fs.writeFileSync('warnings-by-file.json', JSON.stringify(output, null, 2));
