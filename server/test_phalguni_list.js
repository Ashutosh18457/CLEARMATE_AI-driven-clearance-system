const mongoose = require('./node_modules/mongoose');

async function testListDatabases() {
  const uri = 'mongodb+srv://Phalguni:phalguni12344321@clearmate.2singku.mongodb.net/clearmate?authSource=admin';
  try {
    console.log('Connecting with Phalguni credentials...');
    await mongoose.connect(uri);
    console.log('Connected!');

    const admin = mongoose.connection.db.admin();
    try {
      const dbs = await admin.listDatabases();
      console.log('Admin listDatabases success! Databases:', dbs.databases.map(d => d.name));
    } catch (e) {
      console.log('Admin listDatabases failed with error:', e.message);
    }
  } catch (err) {
    console.error('Connection error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

testListDatabases();
