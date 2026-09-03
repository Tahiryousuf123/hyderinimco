import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');
let lines = content.split('\n');

// Find index of lines containing CATEGORIES.map
let idx = -1;
for (let i = 800; i < lines.length; i++) {
  if (lines[i].includes('flex gap-2 overflow-x-auto no-scrollbar py-0.5') && lines[i+1]?.includes('CATEGORIES.map')) {
    idx = i;
    break;
  }
}

if (idx > 0) {
  // Remove 20 lines starting from idx
  lines.splice(idx, 20);
  fs.writeFileSync('./scripts/build_luxury_theme.js', lines.join('\n'), 'utf8');
  console.log('SUCCESS: Sliced 20 lines starting from line', idx);
} else {
  console.error('ERROR: Could not find target line');
}
