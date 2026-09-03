const fs = require('fs');
const parser = require('@babel/parser');

const html = fs.readFileSync('public/index.html', 'utf8');
const scriptMatch = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('No Babel script found in public/index.html');
  process.exit(1);
}

try {
  parser.parse(scriptMatch[1], {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log('✅ public/index.html Babel syntax parsed cleanly with 0 errors.');
} catch (err) {
  console.error('❌ Babel Parse Error at line:', err.loc?.line, 'col:', err.loc?.column);
  console.error(err.message);
  process.exit(1);
}
