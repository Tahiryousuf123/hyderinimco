import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const scriptMatch = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
const code = scriptMatch[1];

// Find any comments inside ternary branches like ": ({/*" or "? ({/*"
const suspicious = [];
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes(') : (') || line.includes('? (') || line.includes(': (')) {
    if (lines[idx + 1] && lines[idx + 1].trim().startsWith('{/*')) {
      suspicious.push({ line: idx + 2, text: lines[idx + 1] });
    }
  }
});

console.log('Suspicious comments:', suspicious);
