/**
 * Simple script to generate PWA icons
 * Run with: node generate-icons.cjs
 */

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate simple placeholder icons (colored squares)
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const maskableSizes = [192, 512];

console.log('Generating PWA icons...');

sizes.forEach(size => {
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#10b981" rx="${size * 0.2}"/>
  <text x="${size/2}" y="${size * 0.65}" font-size="${size * 0.4}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">💰</text>
</svg>`;

  fs.writeFileSync(filepath, svg);
  console.log(`Created ${filename}`);
});

maskableSizes.forEach(size => {
  const filename = `icon-maskable-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#10b981"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.4}" fill="white"/>
  <text x="${size/2}" y="${size * 0.58}" font-size="${size * 0.28}" text-anchor="middle" fill="#10b981" font-family="Arial, sans-serif" font-weight="bold">💰</text>
</svg>`;

  fs.writeFileSync(filepath, svg);
  console.log(`Created ${filename} (maskable)`);
});

console.log('\n✓ All PWA icons generated successfully!');
