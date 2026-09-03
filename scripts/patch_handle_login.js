import fs from 'fs';

let content = fs.readFileSync('./scripts/build_luxury_theme.js', 'utf8');

const target = `      const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
          const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin, role: loginMode })
          });
          const data = await res.json();
          if (data.success) {
            setAuthRole(data.role || (pin === '7860' ? 'superadmin' : 'manager'));
            setTab('sales');
            fetchOrders();
          } else {
            setError(data.message || 'Invalid PIN');
          }
        } catch (err) {
          if (pin === '7860') {
            setAuthRole('superadmin');
            setTab('sales');
            fetchOrders();
          } else if (pin === '1970') {
            setAuthRole('manager');
            setTab('sales');
            fetchOrders();
          } else {
            setError('Invalid PIN code');
          }
        }
      };`;

const replacement = `      const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        const trimmedPin = (pin || '').toString().trim();

        if (trimmedPin === '7860') {
          setAuthRole('superadmin');
          setTab('sales');
          fetchOrders();
          return;
        }

        if (trimmedPin === '1970') {
          setAuthRole('manager');
          setTab('sales');
          fetchOrders();
          return;
        }

        try {
          const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: trimmedPin, role: loginMode })
          });
          const data = await res.json();
          if (data.success) {
            setAuthRole(data.role || 'manager');
            setTab('sales');
            fetchOrders();
          } else {
            setError(data.message || 'Invalid authorized PIN code');
          }
        } catch (err) {
          setError('Invalid authorized PIN code');
        }
      };`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('./scripts/build_luxury_theme.js', content, 'utf8');
  console.log('SUCCESS: Patched handleLogin PIN authentication fallback!');
} else {
  console.error('ERROR: target not found in build_luxury_theme.js');
}
