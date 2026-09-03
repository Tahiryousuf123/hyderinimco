import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[MongoDB] MONGODB_URI environment variable is not defined. Falling back to local JSON data.');
    return false;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  try {
    console.log('[MongoDB] Connecting to MongoDB Atlas with low-memory pool limits (maxPoolSize: 5)...');
    await mongoose.connect(uri, {
      maxPoolSize: 5,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: false, // Prevent index creation overhead at runtime
    });

    isConnected = true;
    console.log('[MongoDB] Successfully connected to MongoDB Atlas database!');
    return true;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error.message);
    isConnected = false;
    return false;
  }
}

export function isDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}
