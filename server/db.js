import mongoose from 'mongoose';

// Disable Mongoose query buffering globally so queries fail immediately with descriptive errors
// instead of hanging silently in memory when the connection is unavailable or restarting.
mongoose.set('bufferCommands', false);

let connectionPromise = null;

/**
 * Safely extract database name from URI, defaulting to 'hyderinimco'
 */
function getDatabaseName(uri) {
  try {
    const url = new URL(uri.replace(/^mongodb\+srv:\/\//, 'http://').replace(/^mongodb:\/\//, 'http://'));
    const db = url.pathname.replace(/^\//, '').split('?')[0].trim();
    return db || 'hyderinimco';
  } catch (e) {
    return 'hyderinimco';
  }
}

/**
 * Mask credentials in URI for safe diagnostic logging
 */
function getSafeUriForLogs(uri) {
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@').split('?')[0];
  } catch (e) {
    return '[Protected URI]';
  }
}

/**
 * Diagnostic Connection Event Listeners
 */
mongoose.connection.on('connecting', () => {
  console.log('[MongoDB State] Connecting to MongoDB Atlas...');
});

mongoose.connection.on('connected', () => {
  console.log('[MongoDB State] Socket connected to MongoDB Atlas.');
});

mongoose.connection.on('open', () => {
  console.log('[MongoDB State] Connection opened and ready for queries.');
});

mongoose.connection.on('disconnecting', () => {
  console.log('[MongoDB State] Disconnecting from MongoDB Atlas...');
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB State] Disconnected from MongoDB Atlas.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB State] Reconnected to MongoDB Atlas.');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB State] Connection error:', err.message);
});

mongoose.connection.on('close', () => {
  console.log('[MongoDB State] Connection closed.');
});

/**
 * Active connection check: verifies both readyState and socket availability
 */
export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Connect to MongoDB Atlas with Singleton Promise Memoization & Active Ping Verification
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[MongoDB] MONGODB_URI environment variable is not defined.');
    return false;
  }

  // If already connected and ready, return true immediately
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  // If a connection attempt is already in flight, reuse that exact promise
  // to avoid concurrent connection stampedes and race conditions.
  if (connectionPromise) {
    return connectionPromise;
  }

  const dbName = getDatabaseName(uri);
  const safeLogUri = getSafeUriForLogs(uri);

  connectionPromise = (async () => {
    try {
      console.log(`[MongoDB] Initiating connection to ${safeLogUri} (Database: "${dbName}")`);

      await mongoose.connect(uri, {
        dbName: dbName,
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 15000,
        heartbeatFrequencyMS: 10000,
        autoIndex: false,
        family: 4, // Force IPv4 on cloud environments (Render) to eliminate IPv6 fallback delay
      });

      // Actively verify that the connection can execute queries via an admin ping
      await mongoose.connection.db.admin().ping();
      console.log(`[MongoDB] Successfully connected & verified ping to MongoDB Atlas [Database: ${dbName}]`);
      return true;
    } catch (error) {
      console.error(`[MongoDB] Connection/Ping verification failed: ${error.message} (${error.name})`);
      return false;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

// Auto-reconnect periodic health check every 25 seconds
const reconnectTimer = setInterval(() => {
  if (process.env.MONGODB_URI && mongoose.connection.readyState !== 1 && !connectionPromise) {
    console.log('[MongoDB Health] Connection not in readyState 1. Triggering reconnect...');
    connectDB().catch((err) => {
      console.error('[MongoDB Health] Reconnect attempt failed:', err.message);
    });
  }
}, 25000);
reconnectTimer.unref?.();

/**
 * Robust DB Query Executor with Native Driver Error Transparency & Retry Loop
 */
export async function executeDBQuery(queryFn, maxRetries = 2, timeoutMs = 25000) {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Ensure connection is ready before attempting query
      if (mongoose.connection.readyState !== 1) {
        const connected = await connectDB();
        if (!connected) {
          throw new Error(`MongoDB connection unavailable (readyState: ${mongoose.connection.readyState})`);
        }
      }

      // Execute query with clean timeout management
      let timer;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Query timed out after ${timeoutMs}ms (attempt ${attempt}/${maxRetries})`));
        }, timeoutMs);
      });

      try {
        const result = await Promise.race([
          Promise.resolve(queryFn()),
          timeoutPromise
        ]);
        return result;
      } finally {
        clearTimeout(timer); // Always clear timer to prevent event-loop memory leaks
      }
    } catch (err) {
      lastError = err;
      console.warn(`[MongoDB Query] Attempt ${attempt}/${maxRetries} failed: [${err.name}] ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise(res => setTimeout(res, attempt * 500)); // Exponential backoff
      }
    }
  }
  throw lastError;
}

export function withTimeout(promise, ms = 10000) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}
