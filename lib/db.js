import mongoose from 'mongoose';
const cache = globalThis.ticketDb ??= { promise: null };
export async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI required');
  cache.promise ??= mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 10, serverSelectionTimeoutMS: 5000, autoIndex: false,
  }).catch(error => { cache.promise = null; throw error; });
  return cache.promise;
}
