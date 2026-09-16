import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, { family: 4 })
  .then(() => console.log('✅ Connected to MongoDB Atlas successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

const invoiceSchema = new mongoose.Schema({
  invoiceNo: String,
  date: String,
  clientName: String,
  totalAmount: Number,
  data: Object,
  createdAt: { type: Date, default: Date.now }
});

const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

const settingsSchema = new mongoose.Schema({
  firmName: { type: String, default: 'Ayush Traders' },
  msme: { type: String, default: 'CG-13-0020998' },
  address: { type: String, default: 'Near Padma Petrol Pump, Bhalumar Road Gharghoda' },
  phone: { type: String, default: '+918319269867' },
  email: { type: String, default: 'ayushpanda.ap87@gmail.com' },
  gstin: { type: String, default: '22GXDPP8956G1Z1' },
  state: { type: String, default: '22-Chhattisgarh' },
  cgstPct: { type: Number, default: 6 },
  sgstPct: { type: Number, default: 6 },
  items: { 
    type: [{ name: String, hsn: String }],
    default: [{ name: 'Fly Ash Bricks', hsn: '681599' }]
  }
});

const Setting = mongoose.models.Setting || mongoose.model('Setting', settingsSchema);

app.get('/api/settings', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await new Setting().save();
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }
    Object.assign(settings, req.body);
    await settings.save();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/next-invoice-no', async (req, res) => {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12
    
    // Financial year starts in April (Month >= 4)
    let startYear, endYear;
    if (currentMonth >= 4) {
      startYear = currentYear;
      endYear = currentYear + 1;
    } else {
      startYear = currentYear - 1;
      endYear = currentYear;
    }
    
    const fyStr = `${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`;
    const prefix = `AT/${fyStr}`;
    
    // Find highest invoice number for this FY
    const invoices = await Invoice.find({ invoiceNo: new RegExp(`^${prefix}`) });
    
    let maxNum = 0;
    invoices.forEach(inv => {
      const numStr = inv.invoiceNo.replace(prefix, '');
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    });
    
    const nextNum = maxNum + 1;
    const nextNumStr = nextNum.toString().padStart(3, '0');
    const nextInvoiceNo = `${prefix}${nextNumStr}`;
    
    res.json({ success: true, invoiceNo: nextInvoiceNo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const data = req.body;
    const newInvoice = new Invoice({
      invoiceNo: data.invoice?.no,
      date: data.invoice?.date,
      clientName: data.clientDetails?.name,
      totalAmount: data.totals?.grandTotal,
      data: data
    });
    
    const saved = await newInvoice.save();
    res.status(201).json({ success: true, id: saved._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/invoices/:id', async (req, res) => {
  try {
    const data = req.body;
    const updated = await Invoice.findByIdAndUpdate(req.params.id, {
      invoiceNo: data.invoice?.no,
      date: data.invoice?.date,
      clientName: data.clientDetails?.name,
      totalAmount: data.totals?.grandTotal,
      data: data
    });
    
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    res.json({ success: true, id: updated._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// For any other route, serve index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
