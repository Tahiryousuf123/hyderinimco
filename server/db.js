import mongoose from 'mongoose';

let isConnected = false;
let isConnecting = false;
let lastDBErrorTime = 0;
const DB_OFFLINE_COOLDOWN_MS = 60000; // 60s cooldown after error/timeout to avoid blocking requests

export function markDBError() {
  lastDBErrorTime = Date.now();
  isConnected = false;
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[MongoDB] MONGODB_URI environment variable is not defined. Falling back to local JSON data.');
    return false;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  if (isConnecting) return false;
  isConnecting = true;

  try {
    console.log('[MongoDB] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, {
      maxPoolSize: 5,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000, // 5s for fast failover
      socketTimeoutMS: 15000,
      autoIndex: false,
    });

    isConnected = true;
    isConnecting = false;
    lastDBErrorTime = 0; // reset error timer on clean connect
    console.log('[MongoDB] Successfully connected to MongoDB Atlas database!');
    return true;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error.message);
    markDBError();
    isConnecting = false;
    return false;
  }
}

export function isDBConnected() {
  if (Date.now() - lastDBErrorTime < DB_OFFLINE_COOLDOWN_MS) {
    return false;
  }
  const ready = mongoose.connection.readyState === 1;
  if (!ready && !isConnecting) {
    isConnected = false;
    connectDB().catch(() => {});
  } else if (ready) {
    isConnected = true;
  }
  return isConnected && ready;
}

// Auto-reconnect periodic check every 30s
setInterval(() => {
  if (process.env.MONGODB_URI && mongoose.connection.readyState !== 1 && !isConnecting && (Date.now() - lastDBErrorTime >= DB_OFFLINE_COOLDOWN_MS)) {
    console.log('[MongoDB] Connection inactive. Attempting auto-reconnect...');
    connectDB().catch(() => {});
  }
}, 30000);

export function withTimeout(promise, ms = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      markDBError();
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
    promise
      .then(res => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(err => {
        clearTimeout(timer);
        markDBError();
        reject(err);
      });
  });
}



