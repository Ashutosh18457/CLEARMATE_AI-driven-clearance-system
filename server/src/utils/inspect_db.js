const mongoose = require('mongoose');
const dns = require('dns');
const env = require('../config/env');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

async function check() {
  console.log('Testing Atlas connection with URI:', env.mongoUri ? env.mongoUri.replace(/:([^:@]+)@/, ':****@') : 'NONE');
  try {
    const conn = await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
    console.log('STATUS: Connected successfully to MongoDB Atlas');
    console.log('Host:', conn.connection.host);
    console.log('Database Name:', conn.connection.name);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n--- Collections & Document Counts ---');
    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`• ${col.name.padEnd(25)} : ${count} documents`);
    }

    const User = require('../models/User');
    const users = await User.find({}, 'name email role isActive department enrollmentNo').lean();
    console.log(`\n--- Registered Users (${users.length} total) ---`);
    users.forEach((u) => {
      console.log(`• [${u.role.padEnd(20)}] ${u.name.padEnd(26)} | ${u.email.padEnd(28)} | Active: ${u.isActive}`);
    });

    const ClearanceRequest = require('../models/ClearanceRequest');
    const crCount = await ClearanceRequest.countDocuments();
    console.log(`\n--- Clearance Requests: ${crCount} total ---`);

    await mongoose.disconnect();
    console.log('\nDatabase check finished.');
  } catch (err) {
    console.error('❌ Connection error to Atlas:', err.message);
  }
}

check();
