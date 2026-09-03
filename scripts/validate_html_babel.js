import fs from 'fs';

const html = fs.readFileSync('./public/index.html', 'utf8');
const scriptMatch = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);

if (scriptMatch && scriptMatch[1]) {
  const code = scriptMatch[1];
  const lines = code.split('\n');
  let errCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // Check for unclosed single quotes or unterminated string literals
    if ((l.startsWith("'") || l.includes("= '")) && !l.endsWith("';") && !l.endsWith("',") && !l.endsWith("' +") && !l.endsWith("'") && !l.endsWith(");")) {
      console.error(`Line ${i+1}: Invalid string literal ending -> ${l}`);
      errCount++;
    }
  }
  if (errCount === 0) {
    console.log('✅ String literals in index.html are clean!');
  }
}
