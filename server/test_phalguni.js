const mongoose = require('./node_modules/mongoose');

async function testPhalguni() {
  const uri = 'mongodb+srv://Phalguni:phalguni12344321@clearmate.2singku.mongodb.net/?appName=clearmate';
  console.log('Testing connection with Phalguni credentials...');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connection Successful!');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections visible:', collections.map(c => c.name));
  } catch (err) {
    console.error('❌ Connection Failed:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

testPhalguni();
