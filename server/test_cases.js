const mongoose = require('./node_modules/mongoose');

async function testUser(username, password) {
  const uri = `mongodb+srv://${username}:${password}@clearmate.2singku.mongodb.net/clearmate`;
  console.log(`Testing username: "${username}" with password: "${password}"...`);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`SUCCESS for "${username}"!`);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Collections visible (${collections.length}):`, collections.map(c => c.name));
    return true;
  } catch (err) {
    console.log(`FAILED for "${username}":`, err.message);
    return false;
  } finally {
    await mongoose.disconnect().catch(()=>{});
  }
}

async function run() {
  await testUser('Phalguni', 'phalguni12344321');
  console.log('--------------------------------------------------');
  await testUser('phalguni', 'phalguni12344321');
}

run();
