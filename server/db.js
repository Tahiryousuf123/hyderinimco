import mongoose from 'mongoose';

let isConnected = false;
let isConnecting = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[MongoDB] MONGODB_URI environment variable is not defined.');
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
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      heartbeatFrequencyMS: 10000,
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

// Mongoose Connection Event Handlers for Connection Health Monitoring
mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection lost. Attempting auto-reconnect...');
  isConnected = false;
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Connection restored to MongoDB Atlas.');
  isConnected = true;
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error:', err.message);
  isConnected = false;
});

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

// Auto-reconnect periodic check every 20s
const reconnectTimer = setInterval(() => {
  if (process.env.MONGODB_URI && mongoose.connection.readyState !== 1 && !isConnecting) {
    console.log('[MongoDB] Connection inactive. Attempting auto-reconnect...');
    connectDB().catch(() => {});
  }
}, 20000);
reconnectTimer.unref?.();

/**
 * Robust DB Query Executor with Automatic Retry Loop and Backoff
 */
export async function executeDBQuery(queryFn, maxRetries = 2, timeoutMs = 15000) {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!isDBConnected()) {
        const connected = await connectDB();
        if (!connected) {
          throw new Error('MongoDB Atlas connection unavailable');
        }
      }

      const timerPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Query timed out after ${timeoutMs}ms (attempt ${attempt}/${maxRetries})`)), timeoutMs)
      );

      const result = await Promise.race([queryFn(), timerPromise]);
      return result;
    } catch (err) {
      lastError = err;
      console.warn(`[MongoDB] Query attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise(res => setTimeout(res, attempt * 500)); // Exponential backoff delay
      }
    }
  }
  throw lastError;
}

export function withTimeout(promise, ms = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
    promise
      .then(res => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
