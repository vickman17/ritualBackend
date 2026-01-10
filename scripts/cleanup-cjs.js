const fs = require('fs');
const path = require('path');

const CJS_BUILD_DIR = path.resolve(__dirname, '..', '.cjs-build');

function rmDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) rmDir(p);
    else fs.unlinkSync(p);
  }
  fs.rmdirSync(dir);
}

rmDir(CJS_BUILD_DIR);
console.log('Cleaned', CJS_BUILD_DIR);

