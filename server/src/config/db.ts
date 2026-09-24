import mongoose from 'mongoose';

// CRITICAL: fail fast, don't hang when MongoDB is offline
mongoose.set('bufferCommands', false);

let isConnecting = false;

/**
 * Connect to MongoDB Atlas using MONGODB_URI.
 * - Reuses existing connection across requests.
 * - Suitable for both local development and production MERN deployment.
 * - Never exposes credentials in logs or errors.
 */
export const connectDB = async (): Promise<typeof mongoose | null> => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    return null;
  }

  // If already connected, reuse connection
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // If already connecting, wait for existing promise
  if (mongoose.connection.readyState === 2 || isConnecting) {
    return new Promise((resolve) => {
      mongoose.connection.once('connected', () => resolve(mongoose));
      mongoose.connection.once('error', () => resolve(null));
    });
  }

  isConnecting = true;

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    isConnecting = false;
    console.log(`[MongoDB] Connected successfully to database: "${mongoose.connection.name}"`);

    // Ensure initial demo user exists in MongoDB so UI demo sessions persist to database
    ensureDefaultUser().catch(() => {});

    return conn;
  } catch (error: any) {
    isConnecting = false;
    console.warn(`[MongoDB] Connection failed: ${error?.message || error}. Falling back to in-memory mode.`);
    return null;
  }
};

/**
 * Initializes the default demo account in MongoDB if not already present
 */
export const ensureDefaultUser = async (): Promise<any> => {
  try {
    const { User } = await import('../models/User');
    const existing = await User.findOne({ email: 'priyanka@example.com' });
    if (!existing) {
      const user = await User.create({
        name: 'Priyanka',
        fullName: 'Priyanka',
        email: 'priyanka@example.com',
        password: 'password123',
      });
      console.log(`[MongoDB] Initialized default user in collection "users": ${user._id}`);
      return user;
    }
    return existing;
  } catch (err: any) {
    console.error(`[MongoDB] ensureDefaultUser error: ${err.message}`);
  }
};

/**
 * Returns whether MongoDB connection is currently established (readyState === 1)
 */
export const isMongoConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

/**
 * Returns connection metadata (never exposes credentials)
 */
export const getMongoConnectionState = (): { readyState: number; status: string; dbName: string } => {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const state = mongoose.connection.readyState;
  return {
    readyState: state,
    status: states[state] || 'disconnected',
    dbName: mongoose.connection.name || '',
  };
};

export default connectDB;
