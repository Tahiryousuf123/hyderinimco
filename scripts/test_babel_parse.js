import fs from 'fs';
import * as babelParser from '@babel/parser';

const html = fs.readFileSync('public/index.html', 'utf8');
const startTag = '<script type="text/babel">';
const endTag = '</script>';

const s = html.indexOf(startTag) + startTag.length;
const e = html.lastIndexOf(endTag);
const code = html.substring(s, e);

try {
  babelParser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log('✅ AST PARSED SUCCESSFULLY WITH ZERO SYNTAX ERRORS!');
} catch (err) {
  console.error('❌ Babel Syntax Error:', err.message, 'at line', err.loc);
  const lines = code.split('\n');
  const lineNum = err.loc.line;
  console.log('--- SURROUNDING LINES ---');
  for (let i = Math.max(0, lineNum - 5); i <= Math.min(lines.length - 1, lineNum + 5); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
  process.exit(1);
}
