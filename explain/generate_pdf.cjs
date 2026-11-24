/* eslint-disable */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const htmlPath = path.join(__dirname, 'voxelle_guide.html');
const pdfPath = path.join(__dirname, 'Voxelle_Project_Explanation_Guide.pdf');

// Chrome executable paths on macOS
const chromePaths = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

const chromeExec = chromePaths.find((p) => fs.existsSync(p));

if (!chromeExec) {
  console.error('Error: No supported Chromium browser found to generate the PDF.');
  process.exit(1);
}

console.log(`Using browser engine: ${chromeExec}`);
console.log(`Compiling HTML: ${htmlPath}`);
console.log(`Destination PDF: ${pdfPath}`);

const command = `"${chromeExec}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "file://${htmlPath}"`;

try {
  execSync(command, { stdio: 'inherit' });
  if (fs.existsSync(pdfPath)) {
    const stats = fs.statSync(pdfPath);
    console.log(`\n✅ PDF successfully generated!`);
    console.log(`File: ${pdfPath}`);
    console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);
  } else {
    console.error('Error: PDF file was not created.');
    process.exit(1);
  }
} catch (error) {
  console.error('Error executing Chrome headless print command:', error);
  process.exit(1);
}
