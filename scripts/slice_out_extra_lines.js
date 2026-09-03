import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');
let lines = content.split('\n');

console.log('Line 922:', lines[922]);
console.log('Line 923:', lines[923]);
console.log('Line 941:', lines[941]);
console.log('Line 942:', lines[942]);

// Filter out lines that match the leftover block
lines = lines.filter(line => {
  if (line.includes('flex gap-2 overflow-x-auto no-scrollbar py-0.5')) return false;
  if (line.includes('{CATEGORIES.map(cat => (') && !line.includes('Integrated Category Navigation Bar')) return false;
  if (line.includes('activeCategory === cat.id && !searchQuery') && line.includes('bg-white text-emeraldBrand-950')) return false;
  return true;
});

fs.writeFileSync('./scripts/build_luxury_theme.js', lines.join('\n'), 'utf8');
console.log('SUCCESS: Filtered out leftover lines!');
