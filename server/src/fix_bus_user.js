const mongoose = require('mongoose');
const env = require('./config/env');
const User = require('./models/User');

async function fixBusUser() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to DB');
  
  const result = await User.updateMany(
    { email: { $in: ['bus@sbjit.edu.in', 'bus@sbjain.edu.in'] } },
    { $set: { role: 'bus_section' } }
  );
  console.log('Updated bus section users:', result);

  const updatedUsers = await User.find({ email: { $in: ['bus@sbjit.edu.in', 'bus@sbjain.edu.in'] } });
  console.log('Verified user roles:', updatedUsers.map(u => ({ email: u.email, role: u.role })));

  await mongoose.disconnect();
}

fixBusUser().catch(console.error);
