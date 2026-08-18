const mongoose = require('./node_modules/mongoose');

async function testClearmateDb() {
  const uri = 'mongodb+srv://Phalguni:phalguni12344321@clearmate.2singku.mongodb.net/clearmate';
  try {
    console.log('Connecting to clearmate db...');
    await mongoose.connect(uri);
    console.log('Connected to db:', mongoose.connection.name);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in clearmate:', collections.map(c => c.name));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

testClearmateDb();
