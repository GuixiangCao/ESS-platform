const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function fixIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected\n');

    const db = mongoose.connection.db;
    const collection = db.collection('station_gateways');

    // Get current indexes
    console.log('Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key), index.unique ? '(UNIQUE)' : '');
    });
    console.log('');

    // Drop the unique index on stationId
    console.log('Dropping unique index on stationId...');
    try {
      await collection.dropIndex('stationId_1');
      console.log('✓ Successfully dropped stationId_1 index\n');
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log('⚠️  Index stationId_1 does not exist (may have been already dropped)\n');
      } else {
        throw error;
      }
    }

    // Recreate it as a non-unique index
    console.log('Creating non-unique index on stationId...');
    await collection.createIndex({ stationId: 1 });
    console.log('✓ Successfully created non-unique stationId index\n');

    // Show updated indexes
    console.log('Updated indexes:');
    const updatedIndexes = await collection.indexes();
    updatedIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key), index.unique ? '(UNIQUE)' : '');
    });

    console.log('\n✓ Index fix complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

fixIndexes();
