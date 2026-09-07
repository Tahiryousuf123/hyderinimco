import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'scripts', 'build_luxury_theme.js');
let raw = fs.readFileSync(filePath, 'utf8');

// Normalize CRLF to LF
let content = raw.replace(/\r\n/g, '\n');

// 1. Revert header button to clean bike logo only (no text)
const oldHeaderBtn = `                  {/* Order Tracking & Cancel Button */}
                  <button
                    onClick={() => setIsTrackingOpen(true)}
                    className="inline-flex items-center gap-1.5 bg-emeraldBrand-950/80 hover:bg-emeraldBrand-950 text-goldBrand-200 border border-goldBrand-400/50 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:border-goldBrand-300"
                    title={isUrdu ? 'آرڈر ٹریک یا کینسل کریں' : 'Track or Cancel Order'}
                  >
                    <span>🛵</span>
                    <span className="text-[11px] sm:text-xs">{isUrdu ? 'ٹریک / کینسل' : 'Track / Cancel Order'}</span>
                  </button>`;

const newHeaderBtn = `                  {/* Order Tracking Button (Icon Only - Clean & Professional) */}
                  <button
                    onClick={() => setIsTrackingOpen(true)}
                    className="inline-flex items-center justify-center bg-emeraldBrand-950/80 hover:bg-emeraldBrand-950 text-goldBrand-300 border border-goldBrand-500/30 w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-base transition-all shadow-sm hover:border-goldBrand-400 hover:scale-105 active:scale-95"
                    title={isUrdu ? 'آرڈر ٹریک کریں' : 'Track Order'}
                    aria-label="Track Order"
                  >
                    <span>🛵</span>
                  </button>`;

if (content.includes(oldHeaderBtn)) {
  content = content.replace(oldHeaderBtn, newHeaderBtn);
  console.log('✅ 1. Header Tracking button reverted to clean bike logo icon only');
} else {
  console.log('⚠️ 1. Header Tracking button not matched');
}

// 2. Mobile Popups: Position at bottom of screen (bottom sheet style) instead of top
const oldSuccessModalWrap = `        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-goldBrand-400 animate-in zoom-in-95">`;

const newSuccessModalWrap = `        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-t-2 sm:border-2 border-goldBrand-400 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 max-h-[92vh] flex flex-col">
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1 bg-goldBrand-400/40 rounded-full mx-auto my-2 sm:hidden shrink-0" />`;

if (content.includes(oldSuccessModalWrap)) {
  content = content.replace(oldSuccessModalWrap, newSuccessModalWrap);
  console.log('✅ 2. OrderSuccessModal mobile positioning updated to bottom sheet');
} else {
  console.log('⚠️ 2. OrderSuccessModal wrapper not matched');
}

// 3. Tracking Modal: Also position at bottom of screen on mobile
const oldTrackingModalWrap = `        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border-2 border-goldBrand-400 animate-in zoom-in-95">`;

const newTrackingModalWrap = `        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border-t-2 sm:border-2 border-goldBrand-400 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1 bg-goldBrand-400/40 rounded-full mx-auto mb-1 sm:hidden shrink-0" />`;

if (content.includes(oldTrackingModalWrap)) {
  content = content.replace(oldTrackingModalWrap, newTrackingModalWrap);
  console.log('✅ 3. OrderTrackingModal mobile positioning updated to bottom sheet');
} else {
  console.log('⚠️ 3. OrderTrackingModal wrapper not matched');
}

// Write back with CRLF
const finalOutput = content.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, finalOutput, 'utf8');
console.log('Finished updating scripts/build_luxury_theme.js');
