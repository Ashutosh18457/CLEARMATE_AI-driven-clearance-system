const mongoose = require('./node_modules/mongoose');

async function inspectAllDbs() {
  const masterUri = 'mongodb+srv://adityamahalle99l_db_user:adityamahalle4497@clearmate.2singku.mongodb.net/?appName=clearmate';
  try {
    await mongoose.connect(masterUri);
    console.log('Connected with master user!');
    const admin = mongoose.connection.db.admin();
    const dbsInfo = await admin.listDatabases();
    console.log('Databases on Cluster:', dbsInfo.databases);

    for (const dbInfo of dbsInfo.databases) {
      const db = mongoose.connection.client.db(dbInfo.name);
      const cols = await db.listCollections().toArray();
      console.log(`Database "${dbInfo.name}" has collections:`, cols.map(c => c.name));
    }
  } catch (err) {
    console.error('Error inspecting cluster:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

inspectAllDbs();
