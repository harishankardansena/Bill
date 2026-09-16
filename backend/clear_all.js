import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const invoiceSchema = new mongoose.Schema({}, { strict: false });
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

async function wipe() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  const res = await Invoice.deleteMany({});
  console.log(`Successfully deleted all ${res.deletedCount} bills! Database is now fresh.`);
  process.exit(0);
}

wipe().catch(console.error);
