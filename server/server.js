import http from 'http';
import fs from 'fs';
import path from 'path';
import url, { fileURLToPath } from 'url';
import { connectDB, isDBConnected, executeDBQuery, withTimeout } from './db.js';
import { Product } from './models/Product.js';
import { ProductImage } from './models/ProductImage.js';
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
 * Automatically cleanses bloated legacy Base64 images in MongoDB Atlas to lightweight static paths.
 * Queries ONLY product IDs to avoid streaming megabytes over the network.
 */
async function autoCleanseBloatedAtlasImages() {
  try {
    const bloatedDocs = await Product.find({ image: /^data:image/ }, { id: 1 }).lean();
    if (bloatedDocs && bloatedDocs.length > 0) {
      console.log(`[MongoDB Cleanser] Detected ${bloatedDocs.length} bloated Base64 records in MongoDB Atlas. Sanitizing to lightweight paths...`);
      for (const doc of bloatedDocs) {
        const cleanUrl = `/api/products/${doc.id}/image`;
        await Product.updateOne({ id: doc.id }, { $set: { image: cleanUrl } });
      }
      console.log(`[MongoDB Cleanser] Successfully sanitized ${bloatedDocs.length} products in MongoDB Atlas to lightweight URLs.`);
      invalidateProductsCache();
    }
    // Cleanse any legacy imageBase64 fields stored directly in Product collection
    await Product.updateMany(
      { $or: [{ imageBase64: { $exists: true } }, { rawImg: { $exists: true } }, { imageData: { $exists: true } }] },
      { $unset: { imageBase64: 1, rawImg: 1, imageData: 1 } }
    ).catch(() => {});
  } catch (err) {
    console.warn('[MongoDB Cleanser] Warning:', err.message);
  }
}

/**
 * Safe Migration: Migrates existing static product images into persistent ProductImage binary storage in MongoDB Atlas.
 * Product by product, verified strictly by product ID.
 */
async function migrateExistingImagesToMongoDB() {
  try {
    const products = await Product.find({}, { id: 1, name: 1, image: 1 }).lean();
    if (!products || products.length === 0) return;

    let migrated = 0;
    const targetProductIds = ['special-13', 'special-14', 'special-15', 'special-12', 'special-6'];
    for (const prod of products) {
      const isTargetProduct = targetProductIds.includes(prod.id);
      // Check if product already has an image stored in ProductImage collection
      const existingImg = await ProductImage.findOne({ productId: prod.id }, { _id: 1 }).lean();
      if (existingImg && !isTargetProduct) {
        if (!prod.image || !prod.image.startsWith(`/api/products/${prod.id}/image`)) {
          await Product.updateOne({ id: prod.id }, { $set: { image: `/api/products/${prod.id}/image` } });
        }
        continue;
      }

      // Explicit authentic image file mapping based strictly on verified product ID
      let localFilePath = null;

      if (prod.id === 'special-13') {
        localFilePath = path.join(PUBLIC_DIR, 'images', 'samosa_patti.jpg');
      } else if (prod.id === 'special-14') {
        localFilePath = path.join(PUBLIC_DIR, 'images', 'paratha_real.jpg');
      } else if (prod.id === 'special-15') {
        localFilePath = path.join(PUBLIC_DIR, 'images', 'plain_puri.jpg');
      } else if (prod.id === 'special-12') {
        localFilePath = path.join(PUBLIC_DIR, 'images', 'roll_patti.jpg');
      } else if (prod.id === 'special-6') {
        localFilePath = path.join(PUBLIC_DIR, 'images', 'chicken_donuts.jpg');
      } else if (prod.image && prod.image.startsWith('/images/')) {
        const directPath = path.join(PUBLIC_DIR, prod.image);
        if (fs.existsSync(directPath)) {
          localFilePath = directPath;
        }
      }

      // Check prod-{id}.jpg or prod-{id}.png fallback on disk
      if (!localFilePath || !fs.existsSync(localFilePath)) {
        for (const ext of ['.jpg', '.png', '.webp']) {
          const candidate = path.join(PUBLIC_DIR, 'images', `prod-${prod.id}${ext}`);
          if (fs.existsSync(candidate)) {
            localFilePath = candidate;
            break;
          }
        }
      }

      // If a valid authentic file exists on disk, read binary and save to ProductImage
      if (localFilePath && fs.existsSync(localFilePath)) {
        const buffer = fs.readFileSync(localFilePath);
        const ext = path.extname(localFilePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'image/jpeg';

        await ProductImage.updateOne(
          { productId: prod.id },
          {
            $set: {
              productId: prod.id,
              contentType: contentType,
              data: buffer,
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );

        // Update product record to point to authoritative image endpoint
        await Product.updateOne({ id: prod.id }, { $set: { image: `/api/products/${prod.id}/image` } });
        migrated++;
      }
    }

    if (migrated > 0) {
      console.log(`[MongoDB Migration] Successfully migrated ${migrated} product images into persistent ProductImage binary storage in Atlas.`);
      invalidateProductsCache();
    }
  } catch (err) {
    console.warn('[MongoDB Migration] Image migration warning:', err.message);
  }
}

/**
 * MongoDB Single Source of Truth Startup Initializer
 * Requirement: Startup connects to MongoDB Atlas and verifies connection.
 * Startup NEVER imports products.json into MongoDB, nor does it overwrite MongoDB data.
 */
async function initializeDatabaseOnStartup() {
  console.log('[MongoDB Startup] Initializing connection to MongoDB Atlas...');
  const connected = await connectDB();
  if (connected) {
    console.log('[MongoDB Startup] MongoDB Atlas is online and verified as the single source of truth.');
    await autoCleanseBloatedAtlasImages().catch(() => {});
    await migrateExistingImagesToMongoDB().catch((err) => console.warn('[MongoDB Image Migration] Error:', err.message));
  } else {
    console.warn('[MongoDB Startup] MongoDB Atlas connection not established. API mutation requests will return HTTP 503.');
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

/**
 * Saves a base64-encoded product image directly into MongoDB Atlas ProductImage collection.
 * Product document only stores the lightweight API URL: /api/products/:id/image?v=...
 */
async function saveProductImageToMongoDB(productId, base64Str) {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) {
    return null;
  }

  const parts = base64Str.split(';base64,');
  if (parts.length !== 2) return null;

  const header = parts[0].toLowerCase();
  let contentType = 'image/jpeg';
  if (header.includes('png')) contentType = 'image/png';
  else if (header.includes('webp')) contentType = 'image/webp';
  else if (header.includes('gif')) contentType = 'image/gif';
  else if (header.includes('jpeg') || header.includes('jpg')) contentType = 'image/jpeg';
  else {
    throw new Error('Unsupported image format. Allowed formats: JPEG, PNG, WEBP, GIF.');
  }

  const buffer = Buffer.from(parts[1], 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('Image file is too large. Maximum allowed size is 5MB.');
  }

  // Atomic upsert into MongoDB ProductImage collection (using updateOne to avoid downloading large buffer back)
  await executeDBQuery(
    () => ProductImage.updateOne(
      { productId: productId },
      {
        $set: {
          productId: productId,
          contentType: contentType,
          data: buffer,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    ),
    2,
    25000
  );

  return `/api/products/${productId}/image?v=${Date.now()}`;
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

  // 0.1. GET /api/debug/db (Database Diagnostic Tool)
  if (pathname === '/api/debug/db' && method === 'GET') {
    let mongoState = null;
    try {
      const mongooseMod = await import('mongoose');
      const m = mongooseMod.default || mongooseMod;
      const conn = m.connection;
      const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
      const diag = {
        readyState: conn.readyState,
        stateName: stateNames[conn.readyState] || 'unknown',
        hasUri: !!process.env.MONGODB_URI,
        uriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
        host: conn.host,
        port: conn.port,
        name: conn.name,
      };

      if (conn.readyState === 1 && conn.db) {
        try {
          const t0 = Date.now();
          diag.ping = await conn.db.command({ ping: 1 });
          diag.pingMs = Date.now() - t0;
        } catch (pe) {
          diag.pingError = pe.message;
        }

        try {
          const t1 = Date.now();
          const colls = await conn.db.listCollections().toArray();
          diag.collections = colls.map(c => c.name);
          diag.listCollectionsMs = Date.now() - t1;
        } catch (ce) {
          diag.collectionsError = ce.message;
        }

        try {
          const t2 = Date.now();
          diag.productCount = await Product.countDocuments();
          diag.countMs = Date.now() - t2;
        } catch (cde) {
          diag.countError = cde.message;
        }

        try {
          diag.productImageCount = await ProductImage.countDocuments();
        } catch (pie) {
          diag.productImageError = pie.message;
        }

        try {
          const t3 = Date.now();
          const firstProd = await Product.findOne({}, { _id: 1, id: 1, name: 1 }).lean().maxTimeMS(5000);
          diag.sampleProduct = firstProd;
          diag.sampleMs = Date.now() - t3;
        } catch (fe) {
          diag.sampleError = fe.message;
        }
      }

      return sendJson(res, 200, { success: true, diag });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message, stack: err.stack });
    }
  }

  // 0.2. GET /api/admin/cleanse-db (Manual trigger to purge bloated base64 images from Atlas)
  if (pathname === '/api/admin/cleanse-db' && method === 'GET') {
    try {
      const bloated = await Product.find({ image: /^data:image/ }, { id: 1 }).lean();
      let updated = 0;
      if (bloated && bloated.length > 0) {
        for (const doc of bloated) {
          await Product.updateOne({ id: doc.id }, { $set: { image: `/images/prod-${doc.id}.jpg` } });
          updated++;
        }
        invalidateProductsCache();
      }
      return sendJson(res, 200, { success: true, sanitized: updated, totalBloated: bloated?.length || 0 });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
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
    let current = {};
    if (isDBConnected()) {
      try {
        const doc = await executeDBQuery(() => Setting.findOne({ key: 'store_config' }, { _id: 0, __v: 0 }).lean(), 2, 5000);
        if (doc?.value) current = doc.value;
      } catch (e) {}
    }
    if (Object.keys(current).length === 0) current = readData('settings.json', {});
    const updated = { ...current, ...body, _updatedAt: Date.now() };

    if (!isDBConnected()) {
      const connected = await connectDB();
      if (!connected) {
        return sendJson(res, 503, { success: false, error: 'MongoDB database is not connected. Settings cannot be updated.' });
      }
    }

    try {
      await executeDBQuery(
        () => Setting.findOneAndUpdate({ key: 'store_config' }, { $set: { key: 'store_config', value: updated } }, { upsert: true, returnDocument: 'after' }),
        2,
        5000
      );
      console.log('[MongoDB Authoritative] Updated store settings in MongoDB Atlas');
      return sendJson(res, 200, { success: true, message: 'Settings updated successfully in MongoDB', settings: updated });
    } catch (e) {
      console.error('[MongoDB Error] Settings update error:', e.message);
      return sendJson(res, 500, { success: false, error: `Failed to save settings to MongoDB: ${e.message}` });
    }
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

      invalidateProductsCache();
      const count = await executeDBQuery(() => Product.countDocuments(), 2, 5000);
      return sendJson(res, 200, { success: true, count: upsertedCount, totalInDB: count || 0, source: 'mongodb' });
    } catch (err) {
      console.error('[MongoDB Error] Batch product sync failed:', err.message);
      return sendJson(res, 500, { success: false, error: `Batch import to MongoDB failed: ${err.message}` });
    }
  }

  // 3.9. GET /api/products/:id/image (Persistent MongoDB Binary Image Stream)
  if (pathname.startsWith('/api/products/') && pathname.endsWith('/image') && method === 'GET') {
    const id = pathname.replace('/api/products/', '').replace('/image', '').trim();
    if (!id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Product ID is required' }));
    }

    if (!isDBConnected()) {
      await connectDB();
    }

    try {
      // 1. Fetch binary image from MongoDB Atlas ProductImage collection
      const imgDoc = await executeDBQuery(
        () => ProductImage.findOne({ productId: id }, { data: 1, contentType: 1 }).lean().exec(),
        2,
        25000
      );

      if (imgDoc && imgDoc.data) {
        let buffer;
        if (Buffer.isBuffer(imgDoc.data)) {
          buffer = imgDoc.data;
        } else if (imgDoc.data.buffer) {
          buffer = Buffer.from(imgDoc.data.buffer);
        } else if (typeof imgDoc.data === 'string') {
          buffer = Buffer.from(imgDoc.data, 'base64');
        } else {
          buffer = Buffer.from(imgDoc.data);
        }
        res.writeHead(200, {
          'Content-Type': imgDoc.contentType || 'image/jpeg',
          'Content-Length': buffer.length,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(buffer);
      }

      // 2. Check local disk static fallback if present
      for (const ext of ['.jpg', '.png', '.webp', '.jpeg']) {
        const diskPath = path.join(PUBLIC_DIR, 'images', `prod-${id}${ext}`);
        if (fs.existsSync(diskPath)) {
          const fileBuf = fs.readFileSync(diskPath);
          res.writeHead(200, {
            'Content-Type': MIME_TYPES[ext] || 'image/jpeg',
            'Content-Length': fileBuf.length,
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*'
          });
          return res.end(fileBuf);
        }
      }

      // 3. Return clean 404 (NEVER index.html)
      res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: `Image not found for product ${id}` }));
    } catch (err) {
      console.error(`[MongoDB] Error serving image for product ${id}:`, err.message);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Failed to retrieve product image' }));
    }
  }

  // 4. GET /api/products (Authoritative MongoDB Read with Cache Accelerator)
  if (pathname === '/api/products' && method === 'GET') {
    // Serve from fast memory cache if recent (<15s) to prevent hammering MongoDB
    if (productCache && (Date.now() - productCacheTime < PRODUCT_CACHE_TTL)) {
      return sendJson(res, 200, { success: true, products: productCache, source: 'mongodb' });
    }

    if (!isDBConnected()) {
      const connected = await connectDB();
      if (!connected) {
        return sendJson(res, 503, {
          success: false,
          error: 'MongoDB Atlas database is currently offline or unreachable.',
          source: 'mongodb_error'
        });
      }
    }

    try {
      const dbProducts = await executeDBQuery(
        () => Product.find({}, { _id: 0, __v: 0 }).lean().exec(),
        2,
        25000
      );
      if (Array.isArray(dbProducts)) {
        for (const p of dbProducts) {
          if (p.image && typeof p.image === 'string' && p.image.startsWith('data:image')) {
            p.image = `/images/prod-${p.id}.jpg`;
          }
        }
        productCache = dbProducts;
        productCacheTime = Date.now();
        return sendJson(res, 200, { success: true, products: dbProducts, source: 'mongodb' });
      }
      return sendJson(res, 500, {
        success: false,
        error: 'Failed to retrieve products from MongoDB Atlas.',
        source: 'mongodb_error'
      });
    } catch (dbErr) {
      console.error('[MongoDB] GET /api/products query error:', dbErr.message);
      return sendJson(res, 503, {
        success: false,
        error: `MongoDB database query failed: ${dbErr.message}`,
        source: 'mongodb_error'
      });
    }
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
      try {
        const savedUrl = await saveProductImageToMongoDB(prodId, rawImg);
        if (savedUrl) rawImg = savedUrl;
      } catch (imgErr) {
        return sendJson(res, 400, { success: false, error: imgErr.message });
      }
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
    // Ensure product document NEVER stores raw Base64 data (Requirement 3)
    delete newProductData.imageBase64;
    delete newProductData.rawImg;
    delete newProductData.imageData;

    try {
      // Atomic MongoDB write (Primary Source of Truth)
      const savedDoc = await executeDBQuery(
        () => Product.findOneAndUpdate({ id: prodId }, { $set: newProductData }, { upsert: true, returnDocument: 'after', lean: true, projection: { _id: 0, __v: 0 } }),
        2,
        25000
      );

      if (!savedDoc) {
        throw new Error('MongoDB save succeeded but document retrieval failed.');
      }

      invalidateProductsCache();
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
      try {
        const savedUrl = await saveProductImageToMongoDB(id, finalImage);
        if (savedUrl) finalImage = savedUrl;
      } catch (imgErr) {
        return sendJson(res, 400, { success: false, error: imgErr.message });
      }
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

    // Ensure product document NEVER stores raw Base64 data (Requirement 3)
    delete updateFields.imageBase64;
    delete updateFields.rawImg;
    delete updateFields.imageData;

    try {
      // Atomic MongoDB update strictly by ID
      const updatedDoc = await executeDBQuery(
        () => Product.findOneAndUpdate({ id }, { $set: updateFields }, { returnDocument: 'after', lean: true, projection: { _id: 0, __v: 0 } }),
        2,
        15000
      );

      if (!updatedDoc) {
        return sendJson(res, 404, { success: false, error: `Product with ID "${id}" was not found in MongoDB.` });
      }

      invalidateProductsCache();
      console.log(`[MongoDB Authoritative] Updated product ${id} (${updatedDoc.name})`);
      return sendJson(res, 200, { success: true, product: updatedDoc, source: 'mongodb' });
    } catch (err) {
      console.error('[MongoDB Error] PUT /api/products/:id failed:', err.message);
      return sendJson(res, 500, { success: false, error: `MongoDB update failed: ${err.message}` });
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
      await executeDBQuery(() => ProductImage.deleteOne({ productId: id }), 2, 5000).catch(() => {});

      invalidateProductsCache();
      console.log(`[MongoDB Authoritative] Deleted product ${id} from MongoDB (deletedCount: ${delResult.deletedCount})`);
      return sendJson(res, 200, { success: true, message: `Product ${id} successfully deleted from MongoDB.`, id });
    } catch (err) {
      console.error('[MongoDB Error] DELETE /api/products/:id failed:', err.message);
      return sendJson(res, 500, { success: false, error: `MongoDB delete failed: ${err.message}` });
    }
  }

  // 8. GET /api/orders (Authoritative from MongoDB)
  if (pathname === '/api/orders' && method === 'GET') {
    if (!isDBConnected()) {
      const connected = await connectDB();
      if (!connected) {
        return sendJson(res, 503, { success: false, error: 'MongoDB database is offline.', source: 'mongodb_error' });
      }
    }
    try {
      const dbOrders = await executeDBQuery(
        () => Order.find({}, { _id: 0, __v: 0, 'paymentDetails.paymentSlipBase64': 0 }).sort({ _id: -1 }).lean().exec(),
        2,
        25000
      );
      return sendJson(res, 200, { success: true, orders: dbOrders || [], source: 'mongodb' });
    } catch (dbErr) {
      console.error('[MongoDB] GET /api/orders error:', dbErr.message);
      return sendJson(res, 503, { success: false, error: `MongoDB query failed: ${dbErr.message}`, source: 'mongodb_error' });
    }
  }

  // 9. GET /api/orders/:orderRef
  if (pathname.startsWith('/api/orders/') && !pathname.endsWith('/status') && method === 'GET') {
    const ref = decodeURIComponent(pathname.replace('/api/orders/', '')).trim();
    if (!isDBConnected()) {
      await connectDB();
    }
    try {
      const dbOrder = await executeDBQuery(() => Order.findOne({ $or: [{ id: ref }, { orderRef: ref }] }, { _id: 0, __v: 0 }).lean().exec(), 2, 5000);
      if (dbOrder) {
        return sendJson(res, 200, { success: true, order: dbOrder, source: 'mongodb' });
      }
      return sendJson(res, 404, { success: false, message: 'Order reference not found in database.' });
    } catch (dbErr) {
      console.error('[MongoDB] GET /api/orders/:ref error:', dbErr.message);
      return sendJson(res, 503, { success: false, error: `Database error: ${dbErr.message}` });
    }
  }

  // 10. POST /api/orders (Create order in MongoDB)
  if (pathname === '/api/orders' && method === 'POST') {
    const body = await parseBody(req);
    if (!isDBConnected()) {
      const connected = await connectDB();
      if (!connected) {
        return sendJson(res, 503, { success: false, error: 'MongoDB database is not connected. Order could not be placed.' });
      }
    }

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

    try {
      const savedOrder = await executeDBQuery(
        () => Order.findOneAndUpdate({ id: orderId }, { $set: newOrder }, { upsert: true, returnDocument: 'after', lean: true, projection: { _id: 0, __v: 0 } }),
        2,
        8000
      );

      console.log(`[MongoDB Authoritative] Created order ${orderRef} (${orderId}) in MongoDB Atlas`);
      // Instant real-time WhatsApp alert to shop owner
      notifyOwnerNewOrder(newOrder).catch(err => console.error('Error notifying owner on WhatsApp:', err));

      return sendJson(res, 200, { success: true, message: 'Order placed successfully', order: savedOrder || newOrder });
    } catch (e) {
      console.error('[MongoDB Error] POST /api/orders failed:', e.message);
      return sendJson(res, 500, { success: false, error: `Failed to save order to MongoDB: ${e.message}` });
    }
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

    if (!isDBConnected()) {
      const connected = await connectDB();
      if (!connected) {
        return sendJson(res, 503, { success: false, error: 'MongoDB database is not connected. Order status cannot be updated.' });
      }
    }

    try {
      const updatedDoc = await executeDBQuery(
        () => Order.findOneAndUpdate({ $or: [{ id }, { orderRef: id }] }, { $set: { status: body.status, updatedAt: now } }, { returnDocument: 'after', lean: true, projection: { _id: 0, __v: 0 } }),
        2,
        8000
      );

      if (!updatedDoc) {
        return sendJson(res, 404, { success: false, message: 'Order not found in MongoDB.' });
      }

      console.log(`[MongoDB Authoritative] Updated order ${id} status to ${body.status}`);
      return sendJson(res, 200, { success: true, message: 'Order status updated', order: updatedDoc });
    } catch (dbErr) {
      console.error('[MongoDB Error] PATCH /api/orders/:id/status failed:', dbErr.message);
      return sendJson(res, 500, { success: false, error: `Failed to update order in MongoDB: ${dbErr.message}` });
    }
  }

  // 16. DELETE /api/orders/:id (Delete order in MongoDB)
  if (pathname.startsWith('/api/orders/') && method === 'DELETE') {
    const id = pathname.replace('/api/orders/', '').trim();

    if (!isDBConnected()) {
      const connected = await connectDB();
      if (!connected) {
        return sendJson(res, 503, { success: false, error: 'MongoDB database is not connected. Order cannot be deleted.' });
      }
    }

    if (id === 'all') {
      try {
        const delResult = await executeDBQuery(() => Order.deleteMany({}), 2, 8000);
        console.log(`[MongoDB Authoritative] Cleared all orders from MongoDB (deletedCount: ${delResult.deletedCount})`);
        return sendJson(res, 200, { success: true, message: 'All orders cleared successfully from MongoDB', deletedCount: delResult.deletedCount });
      } catch (e) {
        console.error('[MongoDB Error] Delete all orders error:', e.message);
        return sendJson(res, 500, { success: false, error: `Failed to clear orders in MongoDB: ${e.message}` });
      }
    }

    try {
      const delResult = await executeDBQuery(() => Order.deleteOne({ $or: [{ id }, { orderRef: id }] }), 2, 8000);
      if (delResult.deletedCount === 0) {
        return sendJson(res, 404, { success: false, message: 'Order not found in MongoDB.' });
      }
      console.log(`[MongoDB Authoritative] Deleted order ${id} from MongoDB`);
      return sendJson(res, 200, { success: true, message: 'Order deleted successfully from MongoDB', id });
    } catch (e) {
      console.error('[MongoDB Error] Delete order error:', e.message);
      return sendJson(res, 500, { success: false, error: `Failed to delete order in MongoDB: ${e.message}` });
    }
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

  // Serve public static files or return 404 for missing assets (never return index.html for images)
  const pathnameExt = path.extname(pathname).toLowerCase();
  const isAssetRequest = pathname.startsWith('/images/') || 
                         pathname.startsWith('/uploads/') || 
                         pathname.startsWith('/api/') || 
                         ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico', '.css', '.js', '.json', '.map', '.woff', '.woff2', '.ttf'].includes(pathnameExt);

  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    if (isAssetRequest) {
      res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Asset not found', path: pathname }));
    }
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
