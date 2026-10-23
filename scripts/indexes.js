import mongoose from 'mongoose';
import { connectDB } from '../lib/db.js';
import { Customer, Ticket, Message } from '../lib/models.js';
try {
  await connectDB(); await Customer.createIndexes(); await Ticket.createIndexes(); await Message.createIndexes();
  console.log('Customer and Ticket indexes are ready');
} catch { console.error('Index setup failed. Check database access and existing duplicates.'); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
