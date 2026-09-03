import fs from 'fs';

const html = fs.readFileSync('./public/index.html', 'utf8');

const match = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);

if (!match) {
  console.error('No script type="text/babel" found!');
  process.exit(1);
}

const code = match[1];
console.log('Script length:', code.length);

// Check if any string literal contains unescaped newlines or backticks
const lines = code.split('\n');
lines.forEach((l, i) => {
  if (l.includes('\\n') && !l.includes('\\\\n')) {
    // Check if \\n became \n inside a JS string
    if (l.includes("= '") || l.includes(":'")) {
      console.log(`Line ${i+1}: Potential raw newline issue -> ${l.slice(0, 80)}`);
    }
  }
});

console.log('Finished scan.');
