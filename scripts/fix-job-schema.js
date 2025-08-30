// Fix Job schema data inconsistencies
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function fixJobSchema() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const jobsCollection = db.collection('jobs');

    // First, fix documents where views is a number or doesn't exist
    const result1 = await jobsCollection.updateMany(
      {
        $or: [
          { 'views': { $type: 'number' } },
          { 'views': { $exists: false } }
        ]
      },
      {
        $set: {
          'views': {
            count: 0,
            uniqueViewers: [],
            dailyViews: []
          }
        }
      }
    );

    console.log(`✅ Reset ${result1.modifiedCount} job documents with invalid views field`);

    // Then fix documents where views exists but has wrong structure
    const result2 = await jobsCollection.updateMany(
      {
        $and: [
          { 'views': { $type: 'object' } },
          { 
            $or: [
              { 'views.uniqueViewers': { $type: 'number' } },
              { 'views.uniqueViewers': { $exists: false } },
              { 'views.count': { $exists: false } }
            ]
          }
        ]
      },
      {
        $set: {
          'views.uniqueViewers': [],
          'views.count': 0,
          'views.dailyViews': []
        }
      }
    );

    console.log(`✅ Fixed ${result2.modifiedCount} job documents with incorrect views structure`);

    await mongoose.disconnect();
    console.log('✅ Schema fix completed successfully');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  fixJobSchema();
}

module.exports = fixJobSchema;