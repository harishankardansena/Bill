import dns from 'dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Force Google DNS (8.8.8.8) for resolving Atlas SRV records
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGO_URI = process.env.MONGO_URI;
console.log('🔍 MONGO_URI found:', MONGO_URI ? 'YES' : 'NO - check .env file');
console.log('📡 Using DNS servers: 8.8.8.8, 8.8.4.4 (Google)');
console.log('⏳ Connecting to MongoDB Atlas...');

try {
  await mongoose.connect(MONGO_URI, {
    family: 4,
    serverSelectionTimeoutMS: 15000,
  });
  console.log('✅ SUCCESS! Connected to MongoDB Atlas.');
  console.log('   DB Name:', mongoose.connection.name);
  await mongoose.disconnect();
  console.log('🔌 Disconnected cleanly.');
} catch (err) {
  console.error('❌ FAILED to connect:', err.message);
}
process.exit(0);
