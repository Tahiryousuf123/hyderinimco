import fs from 'fs';

let content = fs.readFileSync('scripts/build_luxury_theme.js', 'utf8');

// Normalize CRLF to LF
content = content.replace(/\r\n/g, '\n');

const search = `<div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            <div className="flex justify-between items-center border-b pb-3">`;

const replace = `<div className="flex justify-between items-center border-b pb-3">`;

if (content.includes(search)) {
  content = content.replace(search, replace);
  console.log('✅ Cleaned up extra div in OrderTrackingModal');
} else {
  console.log('⚠️ Search string not matched directly');
}

// Convert back to CRLF
content = content.replace(/\n/g, '\r\n');
fs.writeFileSync('scripts/build_luxury_theme.js', content, 'utf8');
