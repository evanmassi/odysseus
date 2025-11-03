// Test script to verify configuration includes position display
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'odysseus.sqlite');
const db = new Database(dbPath, { readonly: true });

try {
  const row = db.prepare('SELECT config_json FROM configuration_current WHERE id = 1').get();

  if (!row) {
    console.error('❌ No configuration found');
    process.exit(1);
  }

  const config = JSON.parse(row.config_json);

  console.log('✅ Configuration loaded successfully');
  console.log('\n📋 Raw Config Keys:', Object.keys(config));

  if (!config.tanks) {
    console.error('❌ config.tanks is undefined');
    console.log('Config structure:', JSON.stringify(config, null, 2).substring(0, 500));
    process.exit(1);
  }

  console.log('\n📊 Configuration Structure:');
  console.log(`   Tanks: ${config.tanks.length}`);

  if (config.tanks.length > 0) {
    const tank = config.tanks[0];
    console.log(`   Tank[0]: ${tank.name} (${tank.id})`);
    console.log(`   Racks: ${tank.racks.length}`);

    if (tank.racks.length > 0) {
      const rack = tank.racks[0];
      console.log(`   Rack[0]: ${rack.name} (ID: ${rack.id})`);
      console.log(`   Boxes: ${rack.boxes.length}`);

      if (rack.boxes.length > 0) {
        const box = rack.boxes[0];
        console.log(`\n📦 Box[0] Details:`);
        console.log(`   Name: ${box.name}`);
        console.log(`   Grid Config: ${box.gridConfig.rows}x${box.gridConfig.cols}`);
        console.log(`   Max Positions: ${box.maxPositions}`);
        console.log(`   Position Display: ${box.positionDisplay ? JSON.stringify(box.positionDisplay, null, 2) : 'undefined'}`);

        if (box.positionDisplay) {
          console.log('\n✅ Position display configuration found!');
          console.log(`   Format: ${box.positionDisplay.format}`);
          if (box.positionDisplay.alphanumericConfig) {
            console.log(`   Row Labels: ${box.positionDisplay.alphanumericConfig.rowLabels.slice(0, 5).join(', ')}...`);
            console.log(`   Col Labels: ${box.positionDisplay.alphanumericConfig.colLabels.slice(0, 5).join(', ')}...`);
            console.log(`   Label Format: ${box.positionDisplay.alphanumericConfig.format}`);
          }
        } else {
          console.log('\n⚠️  Position display configuration is undefined');
        }
      }
    }
  }

  db.close();
  console.log('\n✅ Test completed successfully');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
