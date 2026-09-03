import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

const targetStr = `{ en: "Other Karachi Area", ur: "دیگر کراچی ایریاز" }`;
const replacementStr = `{ en: "Bahria Town Karachi (Express Chilled Delivery - Rs. 1500-2000)", ur: "بحریہ ٹاؤن کراچی (ایکسپریس چلیڈ ڈیلیوری - ۱۵۰۰ سے ۲۰۰۰ روپے)" },\n      ` + targetStr;

if (!content.includes(targetStr)) {
  console.error('Target not found');
  process.exit(1);
}

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
console.log('SUCCESS: Added Bahria Town Karachi to KARACHI_AREAS!');
