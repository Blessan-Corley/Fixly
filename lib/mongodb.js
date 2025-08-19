// lib/mongodb.js - NextAuth MongoDB Client
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('❌ Please define the MONGODB_URI environment variable in .env.local');
}

// MongoClient options
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4
};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the client across hot reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI, options);
    global._mongoClientPromise = client.connect()
      .then(() => {
        console.log('✅ MongoDB Client connected successfully (Development)');
        return client;
      })
      .catch((err) => {
        console.error('❌ MongoDB Client connection failed:', err);
        throw err;
      });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, create a new client for each connection
  client = new MongoClient(MONGODB_URI, options);
  clientPromise = client.connect()
    .then(() => {
      console.log('✅ MongoDB Client connected successfully (Production)');
      return client;
    })
    .catch((err) => {
      console.error('❌ MongoDB Client connection failed:', err);
      throw err;
    });
}

// MongoDB connection function
export default async function connectDB() {
  try {
    const client = await clientPromise;
    return client.db(); // Return the database instance
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Export the client promise for NextAuth MongoDB adapter
export { clientPromise };