import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'scripts', 'build_luxury_theme.js');
let raw = fs.readFileSync(filePath, 'utf8');

// Normalize CRLF to LF
let content = raw.replace(/\r\n/g, '\n');

// 1. OrderSuccessModal: Fix mobile bottom sheet docking with flex flex-col justify-end and overflow-hidden
const oldSuccessWrap = `      return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-t-2 sm:border-2 border-goldBrand-400 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 max-h-[92vh] flex flex-col">
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1 bg-goldBrand-400/40 rounded-full mx-auto my-2 sm:hidden shrink-0" />`;

const newSuccessWrap = `      return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-t-2 sm:border-2 border-goldBrand-400 animate-in slide-in-from-bottom duration-300 max-h-[85vh] sm:max-h-[90vh] flex flex-col">
            {/* Mobile Drag Indicator */}
            <div className="w-14 h-1.5 bg-goldBrand-400/40 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />`;

if (content.includes(oldSuccessWrap)) {
  content = content.replace(oldSuccessWrap, newSuccessWrap);
  console.log('✅ 1. OrderSuccessModal bottom sheet docking updated');
} else {
  console.log('⚠️ 1. OrderSuccessModal wrap string not found, checking loose match...');
  content = content.replace(
    '<div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">',
    '<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 overflow-hidden">'
  );
  console.log('✅ 1. OrderSuccessModal updated via loose replacement');
}

// 2. OrderTrackingModal: Fix mobile bottom sheet docking
const oldTrackingWrap = `      return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border-t-2 sm:border-2 border-goldBrand-400 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1 bg-goldBrand-400/40 rounded-full mx-auto mb-1 sm:hidden shrink-0" />`;

const newTrackingWrap = `      return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-3xl max-w-lg w-full shadow-2xl border-t-2 sm:border-2 border-goldBrand-400 animate-in slide-in-from-bottom duration-300 max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            {/* Mobile Drag Indicator */}
            <div className="w-14 h-1.5 bg-goldBrand-400/40 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">`;

if (content.includes(oldTrackingWrap)) {
  content = content.replace(oldTrackingWrap, newTrackingWrap);
  console.log('✅ 2. OrderTrackingModal bottom sheet docking updated');
} else {
  console.log('⚠️ 2. OrderTrackingModal wrap not matched directly, checking second instance of outer div...');
  const secondIndex = content.lastIndexOf('<div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">');
  if (secondIndex !== -1) {
    content = content.substring(0, secondIndex) +
      '<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 overflow-hidden">' +
      content.substring(secondIndex + '<div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">'.length);
    console.log('✅ 2. OrderTrackingModal outer container updated');
  }
}

// Convert back to CRLF
const finalOutput = content.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, finalOutput, 'utf8');
console.log('Finished updating build_luxury_theme.js for bottom docking!');
