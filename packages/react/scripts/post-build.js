const fs = require('fs');
const path = require('path');

const distinctFiles = ['dist/index.js', 'dist/index.mjs'];

distinctFiles.forEach((file) => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.startsWith('"use client";')) {
      fs.writeFileSync(filePath, '"use client";\n' + content);
      console.log(`Prepended "use client"; to ${file}`);
    }
  }
});
