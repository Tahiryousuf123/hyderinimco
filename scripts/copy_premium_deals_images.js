import fs from 'fs';
import path from 'path';

const userDir = 'C:/Users/CBM/.gemini/antigravity/brain/f937e2b2-114f-4bbd-ae75-917c6552a711/.user_uploaded';
const publicImgDir = './public/images';

if (!fs.existsSync(publicImgDir)) {
  fs.mkdirSync(publicImgDir, { recursive: true });
}

// Latest 5 images in order of prompt attachment:
// Image 1: Premium Deal 2 (Rs. 2,550)
// Image 2: Premium Deal 3 (Rs. 2,800)
// Image 3: Premium Deal 5 (Rs. 2,650)
// Image 4: Premium Deal 1 (Rs. 2,600)
// Image 5: Premium Deal 4 (Rs. 3,100)

const mapping = [
  { file: 'media__1788319006826.jpg', dest: 'premium_deal_2_poster.jpg' },
  { file: 'media__1788319012443.jpg', dest: 'premium_deal_3_poster.jpg' },
  { file: 'media__1788319039590.jpg', dest: 'premium_deal_5_poster.jpg' },
  { file: 'media__1788319081049.jpg', dest: 'premium_deal_1_poster.jpg' },
  { file: 'media__1788319097286.jpg', dest: 'premium_deal_4_poster.jpg' }
];

mapping.forEach(m => {
  const srcPath = path.join(userDir, m.file);
  const destPath = path.join(publicImgDir, m.dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${m.file} -> ${m.dest}`);
  } else {
    console.error(`File missing: ${srcPath}`);
  }
});
