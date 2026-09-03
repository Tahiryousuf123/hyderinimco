import mongoose from 'mongoose';

let isConnected = false;
let isConnecting = false;

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
      serverSelectionTimeoutMS: 15000, // 15s for Render cold start network delay
      socketTimeoutMS: 45000,
      autoIndex: false,
    });

    isConnected = true;
    isConnecting = false;
    console.log('[MongoDB] Successfully connected to MongoDB Atlas database!');
    return true;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error.message);
    isConnected = false;
    isConnecting = false;
    return false;
  }
}

export function isDBConnected() {
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
  if (process.env.MONGODB_URI && mongoose.connection.readyState !== 1 && !isConnecting) {
    console.log('[MongoDB] Connection inactive. Attempting auto-reconnect...');
    connectDB().catch(() => {});
  }
}, 30000);

