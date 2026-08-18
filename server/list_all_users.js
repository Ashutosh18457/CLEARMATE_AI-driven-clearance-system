const mongoose = require('mongoose');
const User = require('./src/models/User');
const env = require('./src/config/env');

async function main() {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('Connected to DB:', mongoose.connection.name);
    const users = await User.find({}).select('+isActive +password');
    console.log('--- ALL USERS IN DB ---');
    users.forEach(u => {
      console.log(`- Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, isActive: ${u.isActive}, hasPassword: ${!!u.password}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
