// Script to generate PWA icons
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create base SVG icon
const svgIcon = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0D9488;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#14B8A6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="256" cy="256" r="240" fill="url(#grad1)"/>
  
  <!-- Wrench icon -->
  <g transform="translate(256, 256)">
    <!-- Main wrench body -->
    <rect x="-80" y="-20" width="160" height="40" fill="white" rx="20"/>
    
    <!-- Wrench head -->
    <circle cx="-80" cy="0" r="35" fill="white"/>
    <circle cx="-80" cy="0" r="20" fill="url(#grad1)"/>
    
    <!-- Wrench teeth -->
    <rect x="60" y="-30" width="30" height="15" fill="white"/>
    <rect x="60" y="15" width="30" height="15" fill="white"/>
    
    <!-- Handle grip lines -->
    <line x1="-40" y1="-15" x2="-40" y2="15" stroke="url(#grad1)" stroke-width="3"/>
    <line x1="-20" y1="-15" x2="-20" y2="15" stroke="url(#grad1)" stroke-width="3"/>
    <line x1="0" y1="-15" x2="0" y2="15" stroke="url(#grad1)" stroke-width="3"/>
    <line x1="20" y1="-15" x2="20" y2="15" stroke="url(#grad1)" stroke-width="3"/>
  </g>
  
  <!-- Text "Fix" below -->
  <text x="256" y="380" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white">Fixly</text>
</svg>
`;

// Ensure public directory exists
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate icons
async function generateIcons() {
  try {
    console.log('🎨 Generating PWA icons...');
    
    const svgBuffer = Buffer.from(svgIcon);
    
    // Generate different sizes
    const sizes = [
      { size: 16, name: 'favicon-16x16.png' },
      { size: 32, name: 'favicon-32x32.png' },
      { size: 180, name: 'apple-touch-icon.png' },
      { size: 192, name: 'icon-192x192.png' },
      { size: 512, name: 'icon-512x512.png' }
    ];
    
    for (const { size, name } of sizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png({ quality: 100 })
        .toFile(path.join(publicDir, name));
      
      console.log(`✅ Generated ${name} (${size}x${size})`);
    }
    
    // Generate favicon.ico (multi-size)
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));
    
    console.log('✅ Generated favicon.ico');
    
    // Generate SVG favicon
    fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgIcon);
    console.log('✅ Generated favicon.svg');
    
    console.log('🎉 All PWA icons generated successfully!');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();