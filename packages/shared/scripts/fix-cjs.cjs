const fs = require('fs');
const path = require('path');

const distCjsDir = path.join(__dirname, '..', 'dist-cjs');
const distDir = path.join(__dirname, '..', 'dist');

// Read all files in dist-cjs
const files = fs.readdirSync(distCjsDir);

files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(distCjsDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace .js with .cjs in requires
    content = content.replace(/require\("(\.\/[^"]+)\.js"\)/g, 'require("$1.cjs")');
    content = content.replace(/from "(\.\/[^"]+)\.js"/g, 'from "$1.cjs"');
    
    // Write to dist with .cjs extension
    const newFile = file.replace('.js', '.cjs');
    const newPath = path.join(distDir, newFile);
    fs.writeFileSync(newPath, content, 'utf-8');
    
    console.log(`Created ${newFile}`);
  }
});

console.log('CommonJS build completed!');

