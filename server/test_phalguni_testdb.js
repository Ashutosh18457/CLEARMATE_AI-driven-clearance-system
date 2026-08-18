const mongoose = require('./node_modules/mongoose');

async function testPhalguniTestDb() {
  const uri = 'mongodb+srv://Phalguni:phalguni12344321@clearmate.2singku.mongodb.net/test';
  console.log('Testing Phalguni connection to database "test"...');
  try {
    await mongoose.connect(uri);
    console.log('Connected to database:', mongoose.connection.name);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`SUCCESS! Collections in "test" (${collections.length}):`, collections.map(c => c.name));
  } catch (err) {
    console.error('FAILED:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

testPhalguniTestDb();
