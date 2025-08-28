#!/usr/bin/env node

// Fix existing jobs data to use proper GeoJSON format for location
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

async function fixGeoJSONData() {
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
    
    console.log('🔍 Finding jobs with invalid GeoJSON format...');
    
    // Find jobs that don't have proper GeoJSON Point format
    const invalidJobs = await jobs.find({
      $or: [
        { 'location.type': { $ne: 'Point' } },
        { 'location.coordinates': { $exists: false } },
        { 'location.coordinates': { $not: { $type: 'array' } } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${invalidJobs.length} jobs with invalid GeoJSON format`);
    
    if (invalidJobs.length === 0) {
      console.log('✅ All jobs already have proper GeoJSON format!');
      return;
    }
    
    let fixedCount = 0;
    
    for (const job of invalidJobs) {
      try {
        let newLocation = null;
        
        if (job.location) {
          // Try to extract coordinates from different formats
          if (job.location.coordinates && Array.isArray(job.location.coordinates)) {
            // Already has coordinates array, just need to fix type
            newLocation = {
              type: 'Point',
              coordinates: job.location.coordinates
            };
          } else if (job.location.lng && job.location.lat) {
            // Has lng/lat properties
            newLocation = {
              type: 'Point',
              coordinates: [parseFloat(job.location.lng), parseFloat(job.location.lat)]
            };
          } else if (job.location.longitude && job.location.latitude) {
            // Has longitude/latitude properties
            newLocation = {
              type: 'Point',
              coordinates: [parseFloat(job.location.longitude), parseFloat(job.location.latitude)]
            };
          }
        }
        
        if (newLocation) {
          // Validate coordinates
          const [lng, lat] = newLocation.coordinates;
          if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90 && 
              !isNaN(lng) && !isNaN(lat) && lng !== 0 && lat !== 0) {
            
            // Update the job with proper GeoJSON format
            await jobs.updateOne(
              { _id: job._id },
              { 
                $set: { 
                  location: newLocation,
                  // Keep address information separate
                  address: job.location.address || job.address || {
                    formatted: 'Location not specified'
                  }
                } 
              }
            );
            fixedCount++;
            console.log(`✅ Fixed job: ${job.title} (${job._id})`);
          } else {
            // Invalid coordinates, remove location for now
            await jobs.updateOne(
              { _id: job._id },
              { 
                $unset: { location: 1 },
                $set: { 
                  address: job.location?.address || job.address || {
                    formatted: 'Location not specified'
                  }
                }
              }
            );
            console.log(`⚠️ Removed invalid location for job: ${job.title} (${job._id})`);
          }
        } else {
          // No valid coordinates found, remove location
          await jobs.updateOne(
            { _id: job._id },
            { 
              $unset: { location: 1 },
              $set: { 
                address: job.location?.address || job.address || {
                  formatted: 'Location not specified'
                }
              }
            }
          );
          console.log(`⚠️ Removed location field for job: ${job.title} (${job._id})`);
        }
        
      } catch (error) {
        console.error(`❌ Error fixing job ${job._id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} jobs with proper GeoJSON format!`);
    console.log(`📍 Ready for geospatial indexing`);
    
  } catch (error) {
    console.error('❌ Error fixing GeoJSON data:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the fix
if (require.main === module) {
  fixGeoJSONData()
    .then(() => {
      console.log('\n✅ GeoJSON data fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ GeoJSON data fix failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixGeoJSONData };