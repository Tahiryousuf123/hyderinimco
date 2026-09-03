import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

// Insert getApiBase definition near top of main script
const apiBaseHelper = `
    const getApiBase = () => {
      if (typeof window === 'undefined') return '';
      const host = window.location.hostname;
      if (host.includes('github.io') || host.includes('hyderinimco-frozen.com')) {
        return 'https://hyderinimco.onrender.com';
      }
      return '';
    };
`;

// Replace fetch('/api/ with fetch(getApiBase() + '/api/
content = content.replaceAll("fetch('/api/", "fetch(getApiBase() + '/api/");
content = content.replaceAll('fetch(`/api/', 'fetch(getApiBase() + `/api/');

// Make sure getApiBase function is defined in App component scope
if (!content.includes('const getApiBase = () =>')) {
  content = content.replace('function App() {', 'function App() {\n' + apiBaseHelper);
}

fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
console.log('✅ SUCCESS: Added getApiBase routing to all API endpoints in build_luxury_theme.js!');
