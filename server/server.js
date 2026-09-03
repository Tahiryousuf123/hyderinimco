import http from 'http';
import fs from 'fs';
import path from 'path';
import url, { fileURLToPath } from 'url';
import { connectDB, isDBConnected, executeDBQuery, withTimeout } from './db.js';
import { Product } from './models/Product.js';
import { Order } from './models/Order.js';
import { Setting } from './models/Setting.js';
import { generateAIResponse, generateAIResponseAsync } from './ai_engine.js';
import { handleWhatsAppIncoming } from './whatsapp_ai.js';
import { startWhatsAppService, getWhatsAppStatus, disconnectWhatsApp, notifyOwnerNewOrder, setAiAutoReply, isAiAutoReplyEnabled, setAiFollowUp, isAiFollowUpEnabled, sendMassBroadcast } from './whatsapp_service.js';

// In-memory catalog cache accelerator (prevents hammering MongoDB on rapid client polling)
let productCache = null;
let productCacheTime = 0;
const PRODUCT_CACHE_TTL = 15000; // 15 seconds

function invalidateProductsCache() {
  productCache = null;
  productCacheTime = 0;
}

/**
 * MongoDB Single Source of Truth Startup Initializer
 * Requirement: Application startup must NEVER blindly replace MongoDB data with local files.
 * 1. Connect to MongoDB.
 * 2. If MongoDB Atlas has documents: MongoDB is authoritative. Update local cache as passive read-only snapshot.
 * 3. Automatically convert any legacy bloated Base64 strings to clean static image files.
 * 4. Only if MongoDB is completely empty (fresh setup) does it seed initial catalog once.
 * 5. Never automatically restore deleted or stale local data over MongoDB.
 */
async function initializeDatabaseOnStartup() {
  const connected = await connectDB();
  if (connected) {
    try {
      const dbProducts = await executeDBQuery(() => Product.find({}, { _id: 0, __v: 0 }).lean(), 2, 20000);
      if (Array.isArray(dbProducts) && dbProducts.length > 0) {
        console.log(`[MongoDB Startup] Successfully loaded ${dbProducts.length} authoritative products from MongoDB Atlas.`);
        
        // Cleanse any legacy bloated base64 images in MongoDB Atlas to lightweight file paths
        let cleansedCount = 0;
        for (const p of dbProducts) {
          if (p.image && typeof p.image === 'string' && p.image.startsWith('data:image')) {
            const savedPath = saveBase64Image(p.image);
            if (savedPath) {
              p.image = savedPath;
              await executeDBQuery(() => Product.updateOne({ id: p.id }, { $set: { image: savedPath } }), 1, 5000).catch(() => {});
              cleansedCount++;
            }
          }
        }
        if (cleansedCount > 0) {
          console.log(`[MongoDB Startup] Cleaned ${cleansedCount} bloated base64 images in MongoDB Atlas to lightweight file paths.`);
        }

        productCache = dbProducts;
        productCacheTime = Date.now();
        // Update local products.json as a passive read-only snapshot of MongoDB
        writeData('products.json', dbProducts);
      } else {
        console.log('[MongoDB Startup] MongoDB Atlas product collection is empty. Checking local products.json for initial seed...');
        const local = readData('products.json', []);
        if (local.length > 0) {
          for (const p of local) {
            await executeDBQuery(() => Product.updateOne({ id: p.id }, { $set: p }, { upsert: true }), 2, 5000);
          }
          console.log(`[MongoDB Startup] Seeded initial ${local.length} products to empty MongoDB Atlas collection.`);
          productCache = local;
          productCacheTime = Date.now();
        }
      }

      // Settings synchronization
      const dbSettings = await executeDBQuery(() => Setting.findOne({ key: 'store_config' }, { _id: 0, __v: 0 }).lean(), 2, 5000);
      if (dbSettings && dbSettings.value && Object.keys(dbSettings.value).length > 0) {
        console.log('[MongoDB Startup] Loaded authoritative store settings from MongoDB Atlas.');
        writeData('settings.json', dbSettings.value);
      } else {
        const localSettings = readData('settings.json', {});
        if (Object.keys(localSettings).length > 0) {
          await executeDBQuery(() => Setting.updateOne({ key: 'store_config' }, { $set: { key: 'store_config', value: localSettings } }, { upsert: true }), 2, 5000);
          console.log('[MongoDB Startup] Seeded initial store settings to empty MongoDB Atlas collection.');
        }
      }
    } catch (err) {
      console.error('[MongoDB Startup] Initialization error:', err.message);
    }
  } else {
    console.warn('[MongoDB Startup] MongoDB Atlas connection not established. Local files will act as offline read-only fallback.');
  }
}

initializeDatabaseOnStartup().catch(err => console.error('[MongoDB Startup] Error:', err.message));

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
    let settings = readData('settings.json', {});
    if (isDBConnected()) {
      try {
        const dbSettings = await executeDBQuery(() => Setting.findOne({ key: 'store_config' }, { _id: 0, __v: 0 }).lean(), 2, 4000);
        if (dbSettings?.value && typeof dbSettings.value === 'object') { settings = dbSettings.value; writeData('settings.json', settings); }
      } catch (e) { console.warn('[MongoDB] GET /api/settings fallback to local:', e.message); }
    }
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
    let current = null;
    if (isDBConnected()) {
      try {
        const doc = await executeDBQuery(() => Setting.findOne({ key: 'store_config' }, { _id: 0, __v: 0 }).lean(), 2, 4000);
        if (doc?.value) current = doc.value;
      } catch (e) {}
    }
    if (!current) current = readData('settings.json', {});
    const updated = { ...current, ...body, _updatedAt: Date.now() };

    if (isDBConnected()) {
      try {
        await executeDBQuery(
          () => Setting.findOneAndUpdate({ key: 'store_config' }, { $set: { key: 'store_config', value: updated } }, { upsert: true, new: true }),
          2,
          5000
        );
      } catch (e) {
        console.error('[MongoDB] Settings update error:', e.message);
      }
    }
    writeData('settings.json', updated);
    return sendJson(res, 200, { success: true, message: 'Settings updated successfully', settings: updated });
  }

  // 4.5. POST /api/products/batch (Explicit bulk catalog import to MongoDB)
  if (pathname === '/api/products/batch' && method === 'POST') {
    const body = await parseBody(req);
    if (!body.products || !Array.isArray(body.products) || body.products.length === 0) {
      return sendJson(res, 400, { success: false, error: 'Invalid or empty products array' });
    }

    if (!isDBConnected()) {
      const connected = await connectDB();
      if (!connected) {
        return sendJson(res, 503, { success: false, error: 'MongoDB connection unavailable. Batch update cannot be processed.' });
      }
    }

    try {
      const now = new Date().toISOString();
      let upsertedCount = 0;
      for (const prod of body.products) {
        if (!prod.id) continue;
        if (prod.image && typeof prod.image === 'string' && prod.image.startsWith('data:image')) {
          const savedPath = saveBase64Image(prod.image);
          if (savedPath) prod.image = savedPath;
        }
        await executeDBQuery(
          () => Product.updateOne({ id: prod.id }, { $set: { ...prod, updatedAt: prod.updatedAt || now } }, { upsert: true }),
          2,
          5000
        );
        upsertedCount++;
      }

      // Refresh passive local snapshot
      const fresh = await executeDBQuery(() => Product.find({}, { _id: 0, __v: 0 }).lean(), 2, 15000);
      if (Array.isArray(fresh)) {
        productCache = fresh;
        productCacheTime = Date.now();
        writeData('products.json', fresh);
      } else {
        invalidateProductsCache();
      }

      return sendJson(res, 200, { success: true, count: upsertedCount, totalInDB: fresh?.length || 0, source: 'mongodb' });
    } catch (err) {
      console.error('[MongoDB Error] Batch product sync failed:', err.message);
      return sendJson(res, 500, { success: false, error: `Batch import to MongoDB failed: ${err.message}` });
    }
  }

  // 4. GET /api/products (MongoDB Single Source of Truth with Cache Accelerator)
  if (pathname === '/api/products' && method === 'GET') {
    // Serve from fast memory cache if recent to prevent connection saturation
    if (productCache && (Date.now() - productCacheTime < PRODUCT_CACHE_TTL)) {
      return sendJson(res, 200, { success: true, products: productCache, source: 'mongodb' });
    }

    if (isDBConnected()) {
      try {
        const dbProducts = await executeDBQuery(() => Product.find({}, { _id: 0, __v: 0 }).lean(), 2, 15000);
        if (Array.isArray(dbProducts)) {
          productCache = dbProducts;
          productCacheTime = Date.now();
          writeData('products.json', dbProducts); // passive cache snapshot
          return sendJson(res, 200, { success: true, products: dbProducts, source: 'mongodb' });
        }
      } catch (dbErr) {
        console.error('[MongoDB] GET /api/products query error:', dbErr.message);
      }
    }
    const fallbackProducts = productCache || readData('products.json', []);
    return sendJson(res, 200, { success: true, products: fallbackProducts, source: 'local_fallback', warning: 'MongoDB slow or offline' });
  }

  // 5. POST /api/products (Create product in MongoDB)
  // Strict Flow: CLIENT -> API -> VALIDATE -> MONGODB -> VERIFY SUCCESS -> RETURN AUTHORITATIVE DOCUMENT
  if (pathname === '/api/products' && method === 'POST') {
    const body = await parseBody(req);
    if (!body.name || body.price === undefined) {
      return sendJson(res, 400, { success: false, error: 'Product name and price are required.' });
    }

    if (!isDBConnected()) {
      const connected = await connectDB();
      if (!connected) {
        return sendJson(res, 503, { success: false, error: 'MongoDB database is not connected. Product cannot be saved.' });
      }
    }

    const prodId = (body.id && String(body.id).trim()) || ('prod-' + Date.now() + '-' + Math.floor(Math.random() * 10000));
    let rawImg = body.imageBase64 || body.image || body.imageUrl || '';
    if (rawImg && typeof rawImg === 'string' && rawImg.startsWith('data:image')) {
      const savedPath = saveBase64Image(rawImg);
      if (savedPath) rawImg = savedPath;
    }
    const now = new Date().toISOString();

    const newProductData = {
      ...body,
      id: prodId,
      name: String(body.name).trim(),
      nameUrdu: body.nameUrdu ? String(body.nameUrdu).trim() : '',
      category: body.category ? String(body.category).trim() : 'samosa',
      categoryLabel: body.categoryLabel || (body.category ? String(body.category).toUpperCase() : 'SAMOSA'),
      packQuantity: body.packQuantity || '12 pcs',
      price: Number(body.price) || 0,
      rating: body.rating !== undefined ? Number(body.rating) : 5,
      reviewCount: body.reviewCount !== undefined ? Number(body.reviewCount) : 1,
      image: rawImg,
      badge: body.badge || '',
      description: body.description || '',
      isAvailable: body.isAvailable !== false && body.isAvailable !== 'false',
      featured: body.featured === true || body.featured === 'true',
      createdAt: now,
      updatedAt: now
    };

    try {
      // Atomic MongoDB write (Primary Source of Truth)
      const savedDoc = await executeDBQuery(
        () => Product.findOneAndUpdate({ id: prodId }, { $set: newProductData }, { upsert: true, new: true, lean: true, projection: { _id: 0, __v: 0 } }),
        2,
        15000
      );

      if (!savedDoc) {
        throw new Error('MongoDB save succeeded but document retrieval failed.');
      }

      invalidateProductsCache();

      // Update passive local snapshot
      const local = readData('products.json', []);
      const idx = local.findIndex(p => p.id === prodId);
      if (idx >= 0) local[idx] = savedDoc;
      else local.unshift(savedDoc);
      writeData('products.json', local);

      console.log(`[MongoDB Authoritative] Created product ${prodId} (${savedDoc.name})`);
      return sendJson(res, 201, { success: true, product: savedDoc, source: 'mongodb' });
    } catch (err) {
      console.error('[MongoDB Error] POST /api/products failed:', err.message);
      return sendJson(res, 500, { success: false, error: `MongoDB save failed: ${err.message}` });
    }
  }

  // 6. PUT /api/products/:id (ID-based atomic update in MongoDB)
  if (pathname.startsWith('/api/products/') && method === 'PUT') {
    const id = pathname.replace('/api/products/', '').trim();
    if (!id) {
      return sendJson(res, 400, { success: false, error: 'Product ID is required for update.' });
    }

    if (!isDBConnected()) {
      const connected = await connectDB();
      if (!connected) {
        return sendJson(res, 503, { success: false, error: 'MongoDB database is not connected. Product cannot be updated.' });
      }
    }

    const body = await parseBody(req);
    const now = new Date().toISOString();
    let finalImage = body.imageBase64 || body.image || body.imageUrl;
    if (finalImage && typeof finalImage === 'string' && finalImage.startsWith('data:image')) {
      const savedPath = saveBase64Image(finalImage);
      if (savedPath) finalImage = savedPath;
    }

    const updateFields = {
      ...body,
      id: id, // Strict immutable product ID
      updatedAt: now
    };

    if (body.price !== undefined) updateFields.price = Number(body.price) || 0;
    if (body.isAvailable !== undefined) updateFields.isAvailable = (body.isAvailable === true || body.isAvailable === 'true');
    if (body.featured !== undefined) updateFields.featured = (body.featured === true || body.featured === 'true');
    if (finalImage !== undefined && finalImage !== null) updateFields.image = finalImage;
    if (body.category !== undefined && !body.categoryLabel) updateFields.categoryLabel = String(body.category).toUpperCase();

    try {
      // Atomic MongoDB update strictly by ID
      const updatedDoc = await executeDBQuery(
        () => Product.findOneAndUpdate({ id }, { $set: updateFields }, { new: true, lean: true, projection: { _id: 0, __v: 0 } }),
        2,
        15000
      );

      if (!updatedDoc) {
        return sendJson(res, 404, { success: false, error: `Product with ID "${id}" was not found in MongoDB.` });
      }

      invalidateProductsCache();

      // Update passive local snapshot
      const local = readData('products.json', []);
      const idx = local.findIndex(p => p.id === id);
      if (idx >= 0) local[idx] = updatedDoc;
      else local.unshift(updatedDoc);
      writeData('products.json', local);

<<<<<<< HEAD
    const updatedProduct = {
      id: id,
      name: body.name !== undefined ? body.name : (existing ? existing.name : 'Item'),
      nameUrdu: body.nameUrdu !== undefined ? body.nameUrdu : (existing ? existing.nameUrdu : ''),
      category: body.category !== undefined ? body.category : (existing ? existing.category : 'samosa'),
      categoryLabel: catLabel,
      packQuantity: body.packQuantity !== undefined ? body.packQuantity : (existing ? existing.packQuantity : '12 pcs'),
      price: body.price !== undefined ? Number(body.price) : (existing ? existing.price : 0),
      badge: body.badge !== undefined ? body.badge : (existing ? existing.badge : ''),
      description: body.description !== undefined ? body.description : (existing ? existing.description : ''),
      isAvailable: body.isAvailable !== undefined ? (body.isAvailable === true || body.isAvailable === 'true') : (existing ? existing.isAvailable : true),
      featured: body.featured !== undefined ? (body.featured === true || body.featured === 'true') : (existing ? existing.featured : false),
      image: finalImage || (existing ? existing.image : '')
    };

    try {
      // Step 1: Write to MongoDB Atlas (Authoritative Source of Truth) with retries
      await executeDBQuery(() => Product.updateOne({ id }, { $set: updatedProduct }, { upsert: true }), 3, 15000);
      
      // Step 2: Verify write in MongoDB Atlas
      const verified = await executeDBQuery(() => Product.findOne({ id }, { _id: 0, __v: 0 }).lean(), 3, 10000);
      if (!verified || (finalImage && verified.image !== finalImage)) {
        throw new Error('Verification read-back failed in MongoDB Atlas');
      }

      // Step 3: Update local products.json cache only after verified DB write
      const products = readData('products.json', []);
      const idx = products.findIndex(p => p.id === id);
      if (idx !== -1) {
        products[idx] = verified;
      } else {
        products.unshift(verified);
      }
      writeData('products.json', products);

      console.log(`[Production Verified] Updated product ${id} (${verified.name}) in MongoDB Atlas`);
      return sendJson(res, 200, { success: true, product: verified, source: 'mongodb' });
    } catch (dbErr) {
      console.error('[MongoDB Error] PUT /api/products failed to update in MongoDB Atlas:', dbErr.message);
      return sendJson(res, 500, { success: false, error: `Production update failed: MongoDB Atlas write error: ${dbErr.message}` });
=======
      console.log(`[MongoDB Authoritative] Updated product ${id} (${updatedDoc.name})`);
      return sendJson(res, 200, { success: true, product: updatedDoc, source: 'mongodb' });
    } catch (err) {
      console.error('[MongoDB Error] PUT /api/products/:id failed:', err.message);
      return sendJson(res, 500, { success: false, error: `MongoDB update failed: ${err.message}` });
>>>>>>> 1671b7f (Enforce MongoDB single source of truth, optimize payload to lightweight images, and add memory cache accelerator)
    }
  }

  // 7. DELETE /api/products/:id (ID-based deletion in MongoDB)
  if (pathname.startsWith('/api/products/') && method === 'DELETE') {
    const id = pathname.replace('/api/products/', '').trim();
    if (!id) {
      return sendJson(res, 400, { success: false, error: 'Product ID is required for deletion.' });
    }

    if (!isDBConnected()) {
      const connected = await connectDB();
      if (!connected) {
        return sendJson(res, 503, { success: false, error: 'MongoDB database is not connected. Product cannot be deleted.' });
      }
    }

    try {
      const delResult = await executeDBQuery(() => Product.deleteOne({ id }), 2, 10000);

      invalidateProductsCache();

      // Remove from passive local snapshot
      let local = readData('products.json', []);
      local = local.filter(p => p.id !== id);
      writeData('products.json', local);

      console.log(`[MongoDB Authoritative] Deleted product ${id} from MongoDB (deletedCount: ${delResult.deletedCount})`);
      return sendJson(res, 200, { success: true, message: `Product ${id} successfully deleted from MongoDB.`, id });
    } catch (err) {
      console.error('[MongoDB Error] DELETE /api/products/:id failed:', err.message);
      return sendJson(res, 500, { success: false, error: `MongoDB delete failed: ${err.message}` });
    }
  }

  // 8. GET /api/orders (Authoritative from MongoDB)
  if (pathname === '/api/orders' && method === 'GET') {
    if (isDBConnected()) {
      try {
        const dbOrders = await withTimeout(Order.find({}, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean(), 5000);
        if (Array.isArray(dbOrders)) {
          writeData('orders.json', dbOrders);
          return sendJson(res, 200, { success: true, orders: dbOrders, source: 'mongodb' });
        }
      } catch (dbErr) {
        console.error('[MongoDB] GET /api/orders error:', dbErr.message);
      }
    }
    const localOrders = readData('orders.json', []);
    return sendJson(res, 200, { success: true, orders: localOrders, source: 'local_fallback', warning: 'MongoDB offline' });
  }

  // 9. GET /api/orders/:orderRef
  if (pathname.startsWith('/api/orders/') && !pathname.endsWith('/status') && method === 'GET') {
    const ref = decodeURIComponent(pathname.replace('/api/orders/', ''));
    if (isDBConnected()) {
      try {
        const dbOrder = await withTimeout(Order.findOne({ $or: [{ id: ref }, { orderRef: ref }] }, { _id: 0, __v: 0 }).lean(), 3000);
        if (dbOrder) {
          return sendJson(res, 200, { success: true, order: dbOrder, source: 'mongodb' });
        }
      } catch (dbErr) {
        console.error('[MongoDB] GET /api/orders/:ref error:', dbErr);
      }
    }
    const orders = readData('orders.json', []);
    const order = orders.find(o => o.orderRef?.toLowerCase() === ref.toLowerCase() || o.id === ref);
    if (!order) {
      return sendJson(res, 404, { success: false, message: 'Order reference not found' });
    }
    return sendJson(res, 200, { success: true, order });
  }

  // 10. POST /api/orders (Create order)
  if (pathname === '/api/orders' && method === 'POST') {
    const body = await parseBody(req);
    const orders = readData('orders.json', []);

    let paymentSlipUrl = body.paymentSlipUrl || null;
    if (body.paymentSlipBase64) {
      paymentSlipUrl = saveBase64Image(body.paymentSlipBase64);
    }

    const orderDate = new Date();
    const orderRef = 'HYD-' + Math.floor(100000 + Math.random() * 900000);
    const orderId = 'ord-' + Date.now();

    const newOrder = {
      id: orderId,
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
      notes: body.notes || '',
      updatedAt: orderDate.toISOString()
    };

    orders.unshift(newOrder);
    writeData('orders.json', orders);
    if (isDBConnected()) {
      try { await executeDBQuery(() => Order.updateOne({ id: orderId }, { $set: newOrder }, { upsert: true }), 2, 6000); console.log(`[MongoDB] Created order ${orderRef} in MongoDB Atlas`); }
      catch (e) { console.error('[MongoDB] POST /api/orders deferred sync:', e.message); }
    }

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

  // 15.5. PATCH /api/orders/:id/status (Update order status in MongoDB)
  if (pathname.startsWith('/api/orders/') && pathname.endsWith('/status') && (method === 'PATCH' || method === 'POST')) {
    const id = pathname.replace('/api/orders/', '').replace('/status', '').trim();
    const body = await parseBody(req);
    const now = new Date().toISOString();

    let updatedDoc = null;
    if (isDBConnected()) {
      try {
        updatedDoc = await executeDBQuery(
          () => Order.findOneAndUpdate({ $or: [{ id }, { orderRef: id }] }, { $set: { status: body.status, updatedAt: now } }, { new: true, lean: true, projection: { _id: 0, __v: 0 } }),
          2,
          5000
        );
      } catch (dbErr) {
        console.error('[MongoDB] PATCH /api/orders/:id/status error:', dbErr.message);
      }
    }

    const orders = readData('orders.json', []);
    const idx = orders.findIndex(o => o.id === id || o.orderRef === id);
    if (idx >= 0) {
      orders[idx].status = body.status || orders[idx].status;
      orders[idx].updatedAt = now;
      writeData('orders.json', orders);
    }

    if (!updatedDoc && idx === -1) {
      return sendJson(res, 404, { success: false, message: 'Order not found' });
    }

    return sendJson(res, 200, { success: true, message: 'Order status updated', order: updatedDoc || orders[idx] });
  }

  // 16. DELETE /api/orders/:id (Delete order in MongoDB)
  if (pathname.startsWith('/api/orders/') && method === 'DELETE') {
    const id = pathname.replace('/api/orders/', '').trim();
    if (id === 'all') {
      if (isDBConnected()) {
        try { await executeDBQuery(() => Order.deleteMany({}), 2, 7000); }
        catch (e) { console.error('[MongoDB] Delete all orders error:', e.message); }
      }
      writeData('orders.json', []);
      return sendJson(res, 200, { success: true, message: 'All orders cleared successfully' });
    }

    if (isDBConnected()) {
      try { await executeDBQuery(() => Order.deleteOne({ $or: [{ id }, { orderRef: id }] }), 2, 7000); }
      catch (e) { console.error('[MongoDB] Delete order error:', e.message); }
    }
    let orders = readData('orders.json', []);
    orders = orders.filter(o => o.id !== id && o.orderRef !== id);
    writeData('orders.json', orders);
    return sendJson(res, 200, { success: true, message: 'Order deleted successfully' });
  }

  // Serve static uploads with low-memory streaming
  if (pathname.startsWith('/uploads/')) {
    const filename = pathname.replace('/uploads/', '');
    const filepath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filepath)) {
      const ext = path.extname(filepath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      const stream = fs.createReadStream(filepath);
      stream.on('error', () => { if (!res.headersSent) res.writeHead(500); res.end('Error loading file'); });
      stream.pipe(res);
      return;
    }
  }

  // Serve public static files or index.html with low-memory streaming pipe
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => { if (!res.headersSent) res.writeHead(500); res.end('Error loading asset'); });
    stream.pipe(res);
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
