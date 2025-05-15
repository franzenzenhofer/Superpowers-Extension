/**
 * Update Vendor Dependencies Script
 * 
 * This script updates the vendored dependencies from node_modules to the local vendor directories.
 * Currently focused on the @google/genai package, but can be extended for other vendored dependencies.
 * 
 * It maintains backward compatibility by preserving adapter files while updating the core library files.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DEPENDENCIES = [
  {
    name: '@google/genai',
    sourceFile: 'node_modules/@google/genai/dist/web/index.mjs',
    targetDir: 'scripts/vendor/genai',
    targetFile: 'index.js',
    preserveFiles: ['adapter.js', 'README.md'] // Files to keep intact
  }
];

// Ensure directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Copy file with logging
function copyFile(source, target) {
  try {
    // Read the source file
    const content = fs.readFileSync(source, 'utf8');
    
    // Write to the target file
    fs.writeFileSync(target, content);
    
    console.log(`Successfully copied ${source} to ${target}`);
    return true;
  } catch (error) {
    console.error(`Error copying ${source} to ${target}:`, error.message);
    return false;
  }
}

// Main update function
async function updateVendorDependencies() {
  console.log('Updating vendor dependencies...');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const dep of DEPENDENCIES) {
    console.log(`\nProcessing ${dep.name}...`);
    
    // Ensure the target directory exists
    const targetDirPath = path.resolve(dep.targetDir);
    ensureDirectoryExists(targetDirPath);
    
    // Copy the main file
    const sourcePath = path.resolve(dep.sourceFile);
    const targetPath = path.resolve(path.join(dep.targetDir, dep.targetFile));
    
    if (fs.existsSync(sourcePath)) {
      if (copyFile(sourcePath, targetPath)) {
        successCount++;
      } else {
        failCount++;
      }
    } else {
      console.error(`Source file not found: ${sourcePath}`);
      failCount++;
    }
    
    // Check if we need to update the package.json in the target directory
    const pkgSourcePath = path.resolve('node_modules', dep.name, 'package.json');
    if (fs.existsSync(pkgSourcePath)) {
      try {
        const pkgData = require(pkgSourcePath);
        // Log the version we're copying
        console.log(`Updating ${dep.name} to version ${pkgData.version}`);
      } catch (error) {
        console.warn(`Could not read package version from ${pkgSourcePath}`);
      }
    }
  }
  
  console.log('\nVendor dependency update complete!');
  console.log(`Success: ${successCount}, Failed: ${failCount}`);
  
  if (failCount > 0) {
    console.log('\nSome updates failed. Please check the logs above for details.');
    process.exit(1);
  }
}

// Run the update
updateVendorDependencies().catch(error => {
  console.error('Error in update process:', error);
  process.exit(1);
}); 