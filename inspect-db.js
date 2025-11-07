const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'odysseus.sqlite');
const db = new Database(dbPath, { readonly: true });

console.log('=== DATABASE INSPECTION ===\n');

try {
  // First, list all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables in database:', tables.map(t => t.name).join(', '));
  console.log('\n');

  // Check configuration_current first (the active config)
  let configTableName = 'configuration_current';
  let row = null;

  try {
    row = db.prepare(`SELECT * FROM ${configTableName} LIMIT 1`).get();
    console.log(`Using table: ${configTableName} (ACTIVE CONFIGURATION)\n`);
  } catch (e) {
    // Fall back to configuration_versions
    configTableName = 'configuration_versions';
    row = db.prepare(`SELECT * FROM ${configTableName} ORDER BY version DESC LIMIT 1`).get();
    console.log(`Using table: ${configTableName} (LATEST VERSION)\n`);
  }

  if (!row) {
    console.log('No configuration found in database');
    db.close();
    process.exit(0);
  }

  console.log('RAW ROW DATA:');
  console.log(JSON.stringify(row, null, 2));
  console.log('\n');

  // Parse the config field (try different column names)
  const configField = row.config_json || row.data || row.configuration;
  if (!configField) {
    console.log('No configuration data field found');
    console.log('Available fields:', Object.keys(row).join(', '));
    db.close();
    process.exit(0);
  }

  const configData = JSON.parse(configField);
  console.log('PARSED CONFIGURATION:');
  console.log(JSON.stringify(configData, null, 2));
  console.log('\n');

  // Inspect tanks
  if (configData.tanks && configData.tanks.length > 0) {
    console.log('=== TANK INSPECTION ===');
    configData.tanks.forEach((tank, i) => {
      console.log(`\nTank ${i + 1}: ${tank.name} (${tank.id})`);
      console.log(`  Racks: ${tank.racks.length}`);

      tank.racks.forEach((rack, j) => {
        console.log(`\n  Rack ${j + 1}: ${rack.name} (ID: ${rack.id})`);
        console.log(`    Capacity: ${rack.capacity || rack.maxBoxes}`);
        console.log(`    Boxes: ${rack.boxes ? rack.boxes.length : 0}`);

        if (rack.boxes && rack.boxes.length > 0) {
          console.log(`    Box names: ${rack.boxes.map(b => b.name).join(', ')}`);
        } else {
          console.log(`    ⚠️  NO BOXES IN THIS RACK!`);
        }
      });
    });
  }

} catch (err) {
  console.error('Error:', err);
} finally {
  db.close();
}
