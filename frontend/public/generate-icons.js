/**
 * Simple script to generate PWA icons
 * Run with: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG icon template
const svgTemplate = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#10b981" rx="100"/>
  <text x="50%" y="55%" font-size="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">💰</text>
</svg>
`;

// Generate simple placeholder icons (colored squares)
// In production, you should replace these with actual PNG files
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const maskableSizes = [192, 512];

console.log('Generating PWA icons...');

sizes.forEach(size => {
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(iconsDir, filename);

  // Create a simple SVG-based PNG
  // For now, we'll create a placeholder
  // In production, use a tool like sharp or imagemin

  // SVG as placeholder (will be converted to PNG in production)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="#10b981" rx="${size * 0.2}"/>
      <text x="${size/2}" y="${size * 0.6}" font-size="${size * 0.5}" text-anchor="middle" fill="white" font-family="Arial, sans-serif">💰</text>
    </svg>
  `;

  fs.writeFileSync(filepath.replace('.png', '.svg'), svg.trim());
  console.log(`Created ${filename} (SVG version)`);
});

maskableSizes.forEach(size => {
  const filename = `icon-maskable-${size}x${size}.png`;
  const filepath = path.join(iconsDir, filename);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="#10b981"/>
      <circle cx="${size/2}" cy="${size/2}" r="${size * 0.4}" fill="white"/>
      <text x="${size/2}" y="${size * 0.6}" font-size="${size * 0.35}" text-anchor="middle" fill="#10b981" font-family="Arial, sans-serif">💰</text>
    </svg>
  `;

  fs.writeFileSync(filepath.replace('.png', '.svg'), svg.trim());
  console.log(`Created ${filename} (SVG version - maskable)`);
});

console.log('\nNote: These are SVG placeholders. For production, convert them to PNG using:');
console.log('- Online tool: https://cloudconvert.com/svg-to-png');
console.log('- CLI tool: npm install -g svgo && for file in icons/*.svg; do svg2png "$file" "${file%.svg}.png"; done');
console.log('\nFor now, update manifest.json to use .svg files instead of .png');
