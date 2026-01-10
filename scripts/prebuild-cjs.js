const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '..', 'src');
const CJS_BUILD_DIR = path.resolve(__dirname, '..', '.cjs-build');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function sanitizeTsForCjs(filePath) {
  if (!filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const before = content;
  content = content
    // remove ESM-only url helper import
    .replace(/^\s*import\s*\{\s*fileURLToPath\s*\}\s*from\s*['"]url['"];\s*/gm, '')
    // remove __filename/__dirname derived from import.meta.url
    .replace(/^\s*const\s+__filename\s*=\s*fileURLToPath\(\s*import\.meta\.url\s*\);\s*$/gm, '')
    .replace(/^\s*const\s+__dirname\s*=\s*path\.dirname\(\s*__filename\s*\);\s*$/gm, '')
    // if any import.meta.url remains, replace with __filename
    .replace(/import\.meta\.url/g, '__filename');

  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function walkAndSanitize(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkAndSanitize(p);
    else if (entry.isFile()) sanitizeTsForCjs(p);
  }
}

// 1) copy src -> .cjs-build
copyDir(SRC_DIR, CJS_BUILD_DIR);
// 2) sanitize ESM-only patterns for CommonJS runtime
walkAndSanitize(CJS_BUILD_DIR);

console.log('Prepared CommonJS build sources in', CJS_BUILD_DIR);

