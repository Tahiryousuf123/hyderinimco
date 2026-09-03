import http from 'http';
import fs from 'fs';
import path from 'path';
import url, { fileURLToPath } from 'url';
import { generateAIResponse, generateAIResponseAsync } from './ai_engine.js';
import { handleWhatsAppIncoming } from './whatsapp_ai.js';
import { startWhatsAppService, getWhatsAppStatus, disconnectWhatsApp, notifyOwnerNewOrder, setAiAutoReply, isAiAutoReplyEnabled, setAiFollowUp, isAiFollowUpEnabled, sendMassBroadcast } from './whatsapp_service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// Read JSON Data Helper
function readData(filename, defaultVal = []) {
  try {
    const fp = path.join(DATA_DIR, filename);
    if (!fs.existsSync(fp)) {
      writeData(filename, defaultVal);
      return defaultVal;
    }
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return defaultVal;
  }
}

// Write JSON Data Helper
function writeData(filename, data) {
  try {
    const fp = path.join(DATA_DIR, filename);
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
    return false;
  }
}

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({ raw: body });
      }
    });
  });
}

// Helper to send JSON response with CORS
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Helper to save base64 slip or product image
function saveBase64Image(base64Str) {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) return null;
  const parts = base64Str.split(';base64,');
  if (parts.length !== 2) return null;

  let ext = '.jpg';
  if (parts[0].includes('png')) ext = '.png';
  else if (parts[0].includes('webp')) ext = '.webp';
  else if (parts[0].includes('gif')) ext = '.gif';

  try {
    const buffer = Buffer.from(parts[1], 'base64');
    const filename = `img-${Date.now()}-${Math.floor(Math.random() * 100000)}${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filepath, buffer);

    // Save copy in public/images for static file serving
    try {
      const publicImgDir = path.join(PUBLIC_DIR, 'images');
      if (!fs.existsSync(publicImgDir)) fs.mkdirSync(publicImgDir, { recursive: true });
      const publicPath = path.join(publicImgDir, filename);
      fs.writeFileSync(publicPath, buffer);
    } catch (err2) {
      console.error('Error saving public image copy:', err2);
    }

    return `/images/${filename}`;
  } catch (e) {
    console.error('Failed to write base64 image:', e);
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // 0. GET /api/health (Health check & keep-alive ping)
  if (pathname === '/api/health' && method === 'GET') {
    return sendJson(res, 200, {
      status: 'online',
      service: 'Hyderi Nimco & Frozen Cloud Server',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  }

  // 1. GET /api/settings
  if (pathname === '/api/settings' && method === 'GET') {
    const settings = readData('settings.json', {});
    const { adminPassword, adminPin, superAdmin, manager, ...publicSettings } = settings;
    return sendJson(res, 200, { success: true, settings: publicSettings });
  }

  // 2. POST /api/admin/login (Dual Role: SuperAdmin Developer vs Store Owner)
  if (pathname === '/api/admin/login' && method === 'POST') {
    const body = await parseBody(req);
    const settings = readData('settings.json', {});
    const superAdmin = settings.superAdmin || { pin: '7860', password: 'superadmin7860', username: 'developer' };
    const manager = settings.manager || { pin: '1970', password: 'hyderi1970', username: 'owner' };

    const cred = (body.pin || body.password || '').toString().trim();
    const user = (body.username || '').toString().trim().toLowerCase();

    // Check SuperAdmin (Developer Master Access)
    if (
      cred === superAdmin.pin ||
      cred === superAdmin.password ||
      (user === superAdmin.username && cred === superAdmin.password) ||
      cred === settings.adminPin
    ) {
      return sendJson(res, 200, {
        success: true,
        role: 'superadmin',
        label: 'Super Admin (Developer Master Access)',
        token: 'superadmin-token-' + Date.now(),
        permissions: ['all', 'sales', 'orders', 'menu', 'settings']
      });
    }

    // Check Store Owner / Manager Access
    if (
      cred === manager.pin ||
      cred === manager.password ||
      (user === manager.username && cred === manager.password)
    ) {
      return sendJson(res, 200, {
        success: true,
        role: 'manager',
        label: 'Store Owner / Operations Manager',
        token: 'manager-token-' + Date.now(),
        permissions: ['sales', 'orders', 'menu']
      });
    }

    return sendJson(res, 401, {
      success: false,
      message: 'Invalid authorized PIN code. Access denied.'
    });
  }

  // 3. POST /api/admin/settings (SuperAdmin only)
  if (pathname === '/api/admin/settings' && method === 'POST') {
    const body = await parseBody(req);
    const current = readData('settings.json', {});
    const updated = { ...current, ...body };
    writeData('settings.json', updated);
    return sendJson(res, 200, { success: true, message: 'Settings updated successfully', settings: updated });
  }

  // 4.5. POST /api/products/batch (Restore catalog backup JSON)
  if (pathname === '/api/products/batch' && method === 'POST') {
    const body = await parseBody(req);
    if (body.products && Array.isArray(body.products) && body.products.length > 0) {
      writeData('products.json', body.products);
      return sendJson(res, 200, { success: true, count: body.products.length });
    }
    return sendJson(res, 400, { error: 'Invalid products array' });
  }

  // 4. GET /api/products
  if (pathname === '/api/products' && method === 'GET') {
    const products = readData('products.json', []);
    return sendJson(res, 200, { success: true, products });
  }

  // 5. POST /api/products (Add product)
  if (pathname === '/api/products' && method === 'POST') {
    const body = await parseBody(req);
    const products = readData('products.json', []);
    
    let imageUrl = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80';
    const rawImg = body.imageBase64 || body.image || body.imageUrl;
    if (rawImg && typeof rawImg === 'string' && rawImg.trim()) {
      if (rawImg.startsWith('data:image')) {
        const saved = saveBase64Image(rawImg);
        if (saved) {
          imageUrl = saved;
        }
      } else {
        imageUrl = rawImg;
      }
    }

    const prodId = body.id || ('prod-' + Date.now());
    const catLabel = body.categoryLabel || (body.category ? body.category.toUpperCase() : 'SAMOSA');

    const newProduct = {
      id: prodId,
      name: body.name || 'New Item',
      nameUrdu: body.nameUrdu || '',
      category: body.category || 'samosa',
      categoryLabel: catLabel,
      packQuantity: body.packQuantity || '12 pcs',
      price: Number(body.price) || 0,
      rating: body.rating ? Number(body.rating) : 5.0,
      reviewCount: body.reviewCount ? Number(body.reviewCount) : 1,
      image: imageUrl,
      badge: body.badge || '',
      description: body.description || '',
      isAvailable: body.isAvailable !== false && body.isAvailable !== 'false',
      featured: body.featured === true || body.featured === 'true'
    };

    const existingIdx = products.findIndex(p => p.id === prodId);
    if (existingIdx !== -1) {
      products[existingIdx] = newProduct;
    } else {
      products.unshift(newProduct);
    }

    writeData('products.json', products);
    return sendJson(res, 200, { success: true, product: newProduct });
  }

  // 6. PUT /api/products/:id (Update product)
  if (pathname.startsWith('/api/products/') && method === 'PUT') {
    const id = pathname.replace('/api/products/', '');
    const body = await parseBody(req);
    const products = readData('products.json', []);
    let idx = products.findIndex(p => p.id === id);

    let finalImage = idx !== -1 ? products[idx].image : 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80';
    const rawImg = body.imageBase64 || body.image || body.imageUrl;
    if (rawImg && typeof rawImg === 'string' && rawImg.trim()) {
      if (rawImg.startsWith('data:image')) {
        const saved = saveBase64Image(rawImg);
        if (saved) {
          finalImage = saved;
        }
      } else {
        finalImage = rawImg;
      }
    }

    const catLabel = body.categoryLabel || (body.category ? body.category.toUpperCase() : (idx !== -1 ? products[idx].categoryLabel : 'SAMOSA'));

    if (idx === -1) {
      const newProduct = {
        id: id,
        name: body.name || 'New Item',
        nameUrdu: body.nameUrdu || '',
        category: body.category || 'samosa',
        categoryLabel: catLabel,
        packQuantity: body.packQuantity || '12 pcs',
        price: Number(body.price) || 0,
        rating: 5.0,
        reviewCount: 1,
        image: finalImage,
        badge: body.badge || '',
        description: body.description || '',
        isAvailable: body.isAvailable !== false && body.isAvailable !== 'false',
        featured: body.featured === true || body.featured === 'true'
      };
      products.unshift(newProduct);
      writeData('products.json', products);
      return sendJson(res, 200, { success: true, product: newProduct });
    }

    products[idx] = {
      ...products[idx],
      name: body.name !== undefined ? body.name : products[idx].name,
      nameUrdu: body.nameUrdu !== undefined ? body.nameUrdu : products[idx].nameUrdu,
      category: body.category !== undefined ? body.category : products[idx].category,
      categoryLabel: catLabel,
      packQuantity: body.packQuantity !== undefined ? body.packQuantity : products[idx].packQuantity,
      price: body.price !== undefined ? Number(body.price) : products[idx].price,
      badge: body.badge !== undefined ? body.badge : products[idx].badge,
      description: body.description !== undefined ? body.description : products[idx].description,
      isAvailable: body.isAvailable !== undefined ? (body.isAvailable === true || body.isAvailable === 'true') : products[idx].isAvailable,
      featured: body.featured !== undefined ? (body.featured === true || body.featured === 'true') : products[idx].featured,
      image: finalImage
    };

    writeData('products.json', products);
    return sendJson(res, 200, { success: true, product: products[idx] });
  }

  // 7. DELETE /api/products/:id
  if (pathname.startsWith('/api/products/') && method === 'DELETE') {
    const id = pathname.replace('/api/products/', '');
    let products = readData('products.json', []);
    products = products.filter(p => p.id !== id);
    writeData('products.json', products);
    return sendJson(res, 200, { success: true, message: 'Product deleted' });
  }

  // 8. GET /api/orders
  if (pathname === '/api/orders' && method === 'GET') {
    const orders = readData('orders.json', []);
    return sendJson(res, 200, { success: true, orders });
  }

  // 9. GET /api/orders/:orderRef
  if (pathname.startsWith('/api/orders/') && !pathname.endsWith('/status') && method === 'GET') {
    const ref = decodeURIComponent(pathname.replace('/api/orders/', ''));
    const orders = readData('orders.json', []);
    const order = orders.find(o => o.orderRef?.toLowerCase() === ref.toLowerCase() || o.id === ref);
    if (!order) {
      return sendJson(res, 404, { success: false, message: 'Order reference not found' });
    }
    return sendJson(res, 200, { success: true, order });
  }

  // 10. POST /api/orders (Create pre-paid order)
  if (pathname === '/api/orders' && method === 'POST') {
    const body = await parseBody(req);
    const orders = readData('orders.json', []);

    let paymentSlipUrl = body.paymentSlipUrl || null;
    if (body.paymentSlipBase64) {
      paymentSlipUrl = saveBase64Image(body.paymentSlipBase64);
    }

    const orderDate = new Date();
    const orderRef = 'HYD-' + Math.floor(100000 + Math.random() * 900000);

    const newOrder = {
      id: 'ord-' + Date.now(),
      orderRef: orderRef,
      createdAt: orderDate.toISOString(),
      formattedDate: orderDate.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      customer: body.customer || {},
      items: body.items || [],
      subtotal: Number(body.subtotal) || 0,
      deliveryFee: Number(body.deliveryFee) || 0,
      totalAmount: Number(body.totalAmount) || 0,
      paymentMethod: body.paymentMethod || 'bank_transfer',
      paymentDetails: {
        bankName: body.bankName || '',
        senderAccountName: body.senderAccountName || '',
        transactionId: body.transactionId || '',
        paymentSlipUrl: paymentSlipUrl
      },
      status: 'pending_verification',
      notes: body.notes || ''
    };

    orders.unshift(newOrder);
    writeData('orders.json', orders);

    // Instant real-time WhatsApp alert to shop owner
    notifyOwnerNewOrder(newOrder).catch(err => console.error('Error notifying owner on WhatsApp:', err));

    return sendJson(res, 200, { success: true, message: 'Order placed successfully', order: newOrder });
  }

  // 12. POST /api/chat (Hyderi AI Customer Assistant Chatbot)
  if (pathname === '/api/chat' && method === 'POST') {
    const body = await parseBody(req);
    const message = body.message || '';
    const history = body.history || [];
    const aiResult = await generateAIResponseAsync(message, history);
    return sendJson(res, 200, { success: true, ...aiResult });
  }

  // 13. GET /api/whatsapp/webhook (Meta WhatsApp Webhook Verification)
  if (pathname === '/api/whatsapp/webhook' && method === 'GET') {
    const mode = parsedUrl.query['hub.mode'];
    const token = parsedUrl.query['hub.verify_token'];
    const challenge = parsedUrl.query['hub.challenge'];
    if (mode === 'subscribe' && (token === 'hyderi_whatsapp_token_786' || token === '7860')) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end(challenge || 'VERIFIED');
    }
    return sendJson(res, 403, { error: 'Forbidden' });
  }

  // 14. POST /api/whatsapp/webhook (Meta WhatsApp Cloud API / Twilio Incoming Messages)
  if (pathname === '/api/whatsapp/webhook' && method === 'POST') {
    const body = await parseBody(req);
    let from = '923362438422';
    let messageText = '';

    if (body.entry && body.entry[0]?.changes[0]?.value?.messages) {
      const m = body.entry[0].changes[0].value.messages[0];
      from = m.from;
      messageText = m.text?.body || '';
    } else if (body.From && body.Body) {
      from = body.From;
      messageText = body.Body;
    } else {
      from = body.from || from;
      messageText = body.message || body.text || '';
    }

    const autoReply = await handleWhatsAppIncoming(from, messageText);
    return sendJson(res, 200, { success: true, autoReply });
  }

  // 15. POST /api/whatsapp/simulate (Admin Live WhatsApp AI Bot Simulator)
  if (pathname === '/api/whatsapp/simulate' && method === 'POST') {
    const body = await parseBody(req);
    const from = body.from || '923362438422';
    const messageText = body.message || 'Assalam o Alaikum';
    const autoReply = await handleWhatsAppIncoming(from, messageText);
    return sendJson(res, 200, { success: true, autoReply });
  }

  // 14.8. GET /api/whatsapp/status (Live QR Code & Connection Status)
  if (pathname === '/api/whatsapp/status' && method === 'GET') {
    return sendJson(res, 200, { success: true, ...getWhatsAppStatus() });
  }

  // 14.85. POST /api/whatsapp/toggle-ai (Turn AI Auto-Reply ON or OFF without unlinking)
  if (pathname === '/api/whatsapp/toggle-ai' && method === 'POST') {
    const body = await parseBody(req);
    const enabled = body.enabled !== undefined ? !!body.enabled : !isAiAutoReplyEnabled();
    const result = setAiAutoReply(enabled);
    return sendJson(res, 200, { success: true, ...result });
  }

  // 14.86. POST /api/whatsapp/toggle-followup (Turn Automated 3-Hour AI Follow-up ON or OFF)
  if (pathname === '/api/whatsapp/toggle-followup' && method === 'POST') {
    const body = await parseBody(req);
    const enabled = body.enabled !== undefined ? !!body.enabled : !isAiFollowUpEnabled();
    const result = setAiFollowUp(enabled);
    return sendJson(res, 200, { success: true, ...result });
  }

  // 14.87. POST /api/whatsapp/broadcast (Send Mass WhatsApp Broadcast for New Deals / Launch)
  if (pathname === '/api/whatsapp/broadcast' && method === 'POST') {
    const body = await parseBody(req);
    const message = body.message;
    let recipients = body.recipients;

    if (!message || !message.trim()) {
      return sendJson(res, 400, { success: false, error: 'Broadcast message content is required.' });
    }

    // If recipients not explicitly passed, extract unique customer phones from orders.json
    if (!Array.isArray(recipients) || recipients.length === 0) {
      const orders = readData('orders.json', []);
      const phoneSet = new Set();
      orders.forEach(o => {
        if (o.customer?.phone) {
          let p = String(o.customer.phone).replace(/[^0-9]/g, '');
          if (p) phoneSet.add(p);
        }
      });
      recipients = Array.from(phoneSet);
    }

    // Add default admin test phones if no past orders yet
    if (recipients.length === 0) {
      recipients = ['923362438422', '923252747343'];
    }

    let imageUrl = body.imageUrl || null;
    if (body.imageBase64) {
      imageUrl = saveBase64Image(body.imageBase64);
    }

    const result = await sendMassBroadcast(recipients, message, imageUrl);
    return sendJson(res, 200, result);
  }

  // 14.9. POST /api/whatsapp/disconnect (Log out & reset session)
  if (pathname === '/api/whatsapp/disconnect' && method === 'POST') {
    const result = await disconnectWhatsApp();
    return sendJson(res, 200, result);
  }

  // 15.5. PATCH /api/orders/:id/status (Update order status)
  if (pathname.startsWith('/api/orders/') && pathname.endsWith('/status') && (method === 'PATCH' || method === 'POST')) {
    const id = pathname.replace('/api/orders/', '').replace('/status', '');
    const body = await parseBody(req);
    const orders = readData('orders.json', []);
    const idx = orders.findIndex(o => o.id === id || o.orderRef === id);
    if (idx === -1) {
      return sendJson(res, 404, { success: false, message: 'Order not found' });
    }
    orders[idx].status = body.status || orders[idx].status;
    orders[idx].updatedAt = new Date().toISOString();
    writeData('orders.json', orders);
    return sendJson(res, 200, { success: true, message: 'Order status updated', order: orders[idx] });
  }

  // 16. DELETE /api/orders/:id (Delete order or delete all)
  if (pathname.startsWith('/api/orders/') && method === 'DELETE') {
    const id = pathname.replace('/api/orders/', '');
    if (id === 'all') {
      writeData('orders.json', []);
      return sendJson(res, 200, { success: true, message: 'All orders cleared successfully' });
    }
    let orders = readData('orders.json', []);
    orders = orders.filter(o => o.id !== id && o.orderRef !== id);
    writeData('orders.json', orders);
    return sendJson(res, 200, { success: true, message: 'Order deleted successfully' });
  }

  // Serve static uploads
  if (pathname.startsWith('/uploads/')) {
    const filename = pathname.replace('/uploads/', '');
    const filepath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filepath)) {
      const ext = path.extname(filepath).toLowerCase();
      fs.readFile(filepath, (err, data) => {
        if (err) {
          res.writeHead(500);
          return res.end('Error loading file');
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      });
      return;
    }
  }

  // Serve public static files or index.html
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading asset');
      }
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    });
    return;
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(`  🥟 NEW HYDERI NIMCO & FROZEN SERVER RUNNING`);
  console.log(`  📍 North Nazimabad, Karachi (Since 1970)`);
  console.log(`  🌐 Storefront & API: http://localhost:${PORT}`);
  console.log(`========================================================`);
  startWhatsAppService();

  // 24/7 Render Keep-Alive Self-Ping Engine
  // Prevents Render Free Tier from going to sleep after inactivity
  const pingUrl = process.env.RENDER_EXTERNAL_URL || 'https://hyderinimco-frozen.com';
  console.log(`🚀 [KeepAlive] 24/7 Active Ping configured for: ${pingUrl}`);
  setInterval(() => {
    try {
      const urlToPing = `${pingUrl}/api/health`;
      http.get(urlToPing, (res) => {
        // success keep-alive
      }).on('error', () => {
        // fallback to direct https fetch
        try {
          fetch(urlToPing).catch(() => {});
        } catch (e) {}
      });
    } catch (err) {}
  }, 8 * 60 * 1000); // pings every 8 minutes (Render sleeps at 15 mins)
});
