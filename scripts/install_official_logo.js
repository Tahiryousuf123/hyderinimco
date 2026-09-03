import fs from 'fs';
import path from 'path';

const srcPath = 'C:\\Users\\CBM\\.gemini\\antigravity\\brain\\f937e2b2-114f-4bbd-ae75-917c6552a711\\.user_uploaded\\media__1788321039174.png';
const targetLogo = './public/images/hyderi_official_logo.png';
const targetFavicon = './public/favicon.png';

fs.copyFileSync(srcPath, targetLogo);
fs.copyFileSync(srcPath, targetFavicon);

console.log('SUCCESS: Copied official logo to public/images/hyderi_official_logo.png and public/favicon.png');
