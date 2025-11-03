const path = require('path');
const { execSync } = require('child_process');

exports.default = async function(context) {
  const appDir = context.appOutDir;
  const electronVersion = context.electronVersion;
  
  console.log('🔨 Rebuilding native modules for Electron...');
  console.log('   App dir:', appDir);
  console.log('   Electron version:', electronVersion);
  
  try {
    // Use electron-rebuild to rebuild better-sqlite3 for the correct Electron version
    const rebuildCmd = `npx electron-rebuild -v ${electronVersion} -f -m ${path.join(appDir, 'resources', 'app.asar.unpacked', 'node_modules')} -o better-sqlite3`;
    
    console.log('   Command:', rebuildCmd);
    execSync(rebuildCmd, { 
      cwd: context.packager.projectDir,
      stdio: 'inherit'
    });
    
    console.log('✅ Native modules rebuilt successfully');
  } catch (error) {
    console.error('❌ Failed to rebuild native modules:', error.message);
    console.error('   This may cause runtime errors. Install Visual Studio Build Tools if issues persist.');
  }
};
