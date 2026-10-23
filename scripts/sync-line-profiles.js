import mongoose from 'mongoose';
import { connectDB } from '../lib/db.js';
import { Customer, Ticket } from '../lib/models.js';
import { refreshCustomerProfile } from '../lib/line-profile.js';
try {
  await connectDB();
  let updated = 0, unavailable = 0;
  for await (const customer of Customer.find().cursor()) {
    const ticket = await Ticket.findOne({ lineUserId: customer.lineUserId }).sort({ eventAt: -1 }).lean();
    const record = ticket ?? { lineUserId: customer.lineUserId, sourceType: 'user' };
    if (await refreshCustomerProfile(record)) updated++; else unavailable++;
  }
  console.log(JSON.stringify({ updated, unavailable }));
} finally { await mongoose.disconnect(); }
