import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const invoiceSchema = new mongoose.Schema({
  invoiceNo: String,
  date: String,
  clientName: String,
  totalAmount: Number,
  data: Object,
  createdAt: { type: Date, default: Date.now }
});

const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

async function clean() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  
  // Delete all with "Loading..."
  const res1 = await Invoice.deleteMany({ invoiceNo: 'Loading...' });
  console.log(`Deleted ${res1.deletedCount} invoices with 'Loading...'`);
  
  // Find all invoices
  const invoices = await Invoice.find().sort({ createdAt: 1 });
  const seen = new Set();
  let dupCount = 0;
  
  for (let inv of invoices) {
    if (seen.has(inv.invoiceNo)) {
      await Invoice.findByIdAndDelete(inv._id);
      dupCount++;
    } else {
      seen.add(inv.invoiceNo);
    }
  }
  console.log(`Deleted ${dupCount} duplicate invoices`);
  
  process.exit(0);
}

clean().catch(console.error);
