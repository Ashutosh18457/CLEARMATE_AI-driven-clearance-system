const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');

/**
 * CLI utility script to bootstrap the initial Admin user account.
 * Usage: node src/utils/bootstrapAdmin.js
 */
async function bootstrapAdmin() {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('✅ Connected to MongoDB...');

    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log(`ℹ️ Admin account already exists: ${existingAdmin.email}`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sbjain.edu.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Password123!';

    const admin = await User.create({
      name: 'System Administrator',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
    });

    console.log(`🎉 Admin account bootstrapped successfully!`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Password: ${adminPassword}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to bootstrap admin user:', err);
    process.exit(1);
  }
}

bootstrapAdmin();
