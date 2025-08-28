#!/usr/bin/env node

// Insert sample jobs with proper GeoJSON format into MongoDB Atlas
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const uri = process.env.MONGODB_URI;

async function insertSampleJobs() {
  if (!uri) {
    throw new Error('MONGODB_URI environment variable not found. Please check your .env.local file.');
  }
  
  console.log('🔗 Using MongoDB URI:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
  const client = new MongoClient(uri);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db('fixly');
    const jobs = db.collection('jobs');
    
    // Load sample jobs
    const sampleJobsPath = path.join(__dirname, '..', 'data', 'sample-jobs.json');
    const sampleJobsData = JSON.parse(fs.readFileSync(sampleJobsPath, 'utf8'));
    
    console.log(`📊 Loading ${sampleJobsData.length} sample jobs...`);
    
    // Clear existing sample jobs first
    const deleteResult = await jobs.deleteMany({
      _id: { $in: sampleJobsData.map(job => job._id) }
    });
    console.log(`🗑️ Cleared ${deleteResult.deletedCount} existing sample jobs`);
    
    // Convert dates and ensure proper format
    const jobsToInsert = sampleJobsData.map(job => ({
      ...job,
      createdAt: new Date(job.createdAt),
      // Ensure proper ObjectId format for references
      postedBy: job.postedBy // Keep as string for now, will be converted to ObjectId when needed
    }));
    
    // Insert sample jobs
    const insertResult = await jobs.insertMany(jobsToInsert);
    console.log(`✅ Inserted ${insertResult.insertedCount} sample jobs successfully!`);
    
    // Verify the data
    const verifyJobs = await jobs.find({
      _id: { $in: sampleJobsData.map(job => job._id) }
    }).toArray();
    
    console.log('\n📍 Verifying sample jobs with locations:');
    verifyJobs.forEach(job => {
      const coords = job.location ? job.location.coordinates : null;
      console.log(`• ${job.title} in ${job.address.city} - Coordinates: ${coords ? `[${coords[0]}, ${coords[1]}]` : 'None'}`);
    });
    
    console.log(`\n🎉 Sample jobs ready for geospatial indexing!`);
    
  } catch (error) {
    console.error('❌ Error inserting sample jobs:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the insertion
if (require.main === module) {
  insertSampleJobs()
    .then(() => {
      console.log('\n✅ Sample jobs insertion completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Sample jobs insertion failed:', error.message);
      process.exit(1);
    });
}

module.exports = { insertSampleJobs };