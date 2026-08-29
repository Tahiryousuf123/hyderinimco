import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const scriptMatch = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);

if (!scriptMatch) {
  console.error('No script tag found!');
  process.exit(1);
}

const code = scriptMatch[1];
console.log('Script length:', code.length);

const pairs = [
  ['{', '}'],
  ['(', ')'],
  ['[', ']']
];

pairs.forEach(([open, close]) => {
  const oCount = code.split(open).length - 1;
  const cCount = code.split(close).length - 1;
  console.log(`Pair ${open} ${close}: Open=${oCount}, Close=${cCount}, Balanced=${oCount === cCount}`);
});
