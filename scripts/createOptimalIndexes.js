// scripts/createOptimalIndexes.js - Create optimal database indexes for performance
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = 'fixly';

/**
 * Creates optimal indexes for the Fixly database
 * Run this script in production to ensure optimal query performance
 */
async function createOptimalIndexes() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // ===== JOBS COLLECTION INDEXES =====
    console.log('📊 Creating Jobs collection indexes...');
    const jobsCollection = db.collection('jobs');
    
    // 1. Geospatial index for nearby jobs queries (CRITICAL)
    await jobsCollection.createIndex(
      { "location.coordinates": "2dsphere" },
      { 
        name: "geo_location_2dsphere",
        background: true,
        partialFilterExpression: { 
          "location.coordinates": { $exists: true },
          "status": "open",
          "isActive": true
        }
      }
    );
    console.log('✅ Geospatial index created');

    // 2. Compound index for job listing queries
    await jobsCollection.createIndex(
      { 
        "status": 1, 
        "isActive": 1, 
        "isDeleted": 1, 
        "deadline": 1,
        "featured": -1,
        "createdAt": -1 
      },
      { 
        name: "jobs_listing_compound",
        background: true 
      }
    );
    console.log('✅ Jobs listing compound index created');

    // 3. Budget range queries index
    await jobsCollection.createIndex(
      { 
        "budget.amount": 1,
        "budget.type": 1,
        "status": 1
      },
      { 
        name: "budget_range_index",
        background: true,
        partialFilterExpression: { 
          "budget.amount": { $exists: true, $gt: 0 }
        }
      }
    );
    console.log('✅ Budget range index created');

    // 4. Skills search index
    await jobsCollection.createIndex(
      { 
        "skillsRequired": 1,
        "status": 1,
        "experienceLevel": 1
      },
      { 
        name: "skills_search_index",
        background: true 
      }
    );
    console.log('✅ Skills search index created');

    // 5. Category and urgency index
    await jobsCollection.createIndex(
      { 
        "category": 1,
        "urgency": 1,
        "status": 1,
        "createdAt": -1
      },
      { 
        name: "category_urgency_index",
        background: true 
      }
    );
    console.log('✅ Category and urgency index created');

    // 6. User jobs index (for dashboard)
    await jobsCollection.createIndex(
      { 
        "createdBy": 1,
        "status": 1,
        "createdAt": -1
      },
      { 
        name: "user_jobs_index",
        background: true 
      }
    );
    console.log('✅ User jobs index created');

    // 7. Featured jobs index
    await jobsCollection.createIndex(
      { 
        "featured": 1,
        "featuredUntil": 1,
        "status": 1,
        "createdAt": -1
      },
      { 
        name: "featured_jobs_index",
        background: true,
        partialFilterExpression: { 
          "featured": true
        }
      }
    );
    console.log('✅ Featured jobs index created');

    // 8. Applications index for job owners
    await jobsCollection.createIndex(
      { 
        "applications.fixer": 1,
        "applications.status": 1,
        "applications.appliedAt": -1
      },
      { 
        name: "applications_index",
        background: true 
      }
    );
    console.log('✅ Applications index created');

    // 9. Text search index for job titles and descriptions
    await jobsCollection.createIndex(
      { 
        "title": "text",
        "description": "text",
        "skillsRequired": "text"
      },
      { 
        name: "jobs_text_search",
        background: true,
        weights: {
          "title": 10,
          "skillsRequired": 5,
          "description": 1
        }
      }
    );
    console.log('✅ Text search index created');

    // ===== USERS COLLECTION INDEXES =====
    console.log('👥 Creating Users collection indexes...');
    const usersCollection = db.collection('users');

    // 1. Email unique index (auth)
    await usersCollection.createIndex(
      { "email": 1 },
      { 
        name: "email_unique",
        unique: true,
        background: true 
      }
    );
    console.log('✅ Email unique index created');

    // 2. Username unique index
    await usersCollection.createIndex(
      { "username": 1 },
      { 
        name: "username_unique",
        unique: true,
        background: true,
        partialFilterExpression: { 
          "username": { $exists: true, $ne: null }
        }
      }
    );
    console.log('✅ Username unique index created');

    // 3. Skills and location index for fixer search
    await usersCollection.createIndex(
      { 
        "role": 1,
        "skills.name": 1,
        "location.city": 1,
        "location.state": 1,
        "isActive": 1
      },
      { 
        name: "fixer_search_index",
        background: true 
      }
    );
    console.log('✅ Fixer search index created');

    // 4. Location-based user search
    await usersCollection.createIndex(
      { "location.coordinates": "2dsphere" },
      { 
        name: "user_location_2dsphere",
        background: true,
        partialFilterExpression: { 
          "location.coordinates": { $exists: true }
        }
      }
    );
    console.log('✅ User location geospatial index created');

    // 5. Rating and verification index
    await usersCollection.createIndex(
      { 
        "rating": -1,
        "verificationStatus": 1,
        "role": 1,
        "isActive": 1
      },
      { 
        name: "rating_verification_index",
        background: true 
      }
    );
    console.log('✅ Rating and verification index created');

    // ===== LOCATION PREFERENCES COLLECTION INDEXES =====
    console.log('📍 Creating Location Preferences indexes...');
    const locationPrefsCollection = db.collection('locationpreferences');

    // 1. User location preferences
    await locationPrefsCollection.createIndex(
      { "user": 1 },
      { 
        name: "user_location_prefs",
        unique: true,
        background: true 
      }
    );
    console.log('✅ User location preferences index created');

    // 2. Location update tracking
    await locationPrefsCollection.createIndex(
      { 
        "lastLocationUpdate": -1,
        "preferences.autoLocationEnabled": 1
      },
      { 
        name: "location_update_tracking",
        background: true 
      }
    );
    console.log('✅ Location update tracking index created');

    // ===== ANALYTICS COLLECTION INDEXES =====
    console.log('📈 Creating Analytics collection indexes...');
    const analyticsCollection = db.collection('analytics');

    // 1. User analytics index
    await analyticsCollection.createIndex(
      { 
        "userId": 1,
        "action": 1,
        "timestamp": -1
      },
      { 
        name: "user_analytics_index",
        background: true 
      }
    );
    console.log('✅ User analytics index created');

    // 2. Time-based analytics index
    await analyticsCollection.createIndex(
      { 
        "timestamp": -1,
        "action": 1
      },
      { 
        name: "time_analytics_index",
        background: true 
      }
    );
    console.log('✅ Time-based analytics index created');

    // 3. TTL index for analytics cleanup (30 days retention)
    await analyticsCollection.createIndex(
      { "timestamp": 1 },
      { 
        name: "analytics_ttl",
        expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
        background: true 
      }
    );
    console.log('✅ Analytics TTL index created');

    // ===== PERFORMANCE MONITORING INDEXES =====
    console.log('⚡ Creating performance monitoring indexes...');
    
    // Monitor slow queries
    await db.admin().command({
      profile: 2,
      slowms: 100, // Log queries slower than 100ms
      sampleRate: 0.1 // Sample 10% of operations
    });
    console.log('✅ Query profiling enabled');

    console.log('🎉 All optimal indexes created successfully!');
    
    // Display index statistics
    console.log('\n📊 Index Statistics:');
    const collections = ['jobs', 'users', 'locationpreferences', 'analytics'];
    
    for (const collName of collections) {
      const coll = db.collection(collName);
      const indexes = await coll.indexes();
      console.log(`\n${collName.toUpperCase()}:`);
      indexes.forEach((index, i) => {
        console.log(`  ${i + 1}. ${index.name} - ${JSON.stringify(index.key)}`);
      });
    }

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

/**
 * Drop all indexes and recreate them (use with caution in production)
 */
async function recreateAllIndexes() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    console.log('🗑️ Dropping existing indexes...');
    const collections = ['jobs', 'users', 'locationpreferences', 'analytics'];
    
    for (const collName of collections) {
      const coll = db.collection(collName);
      try {
        await coll.dropIndexes();
        console.log(`✅ Dropped indexes for ${collName}`);
      } catch (error) {
        console.log(`⚠️ No indexes to drop for ${collName}`);
      }
    }
    
    // Recreate all indexes
    await createOptimalIndexes();
    
  } catch (error) {
    console.error('❌ Error recreating indexes:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Export functions for use in other scripts
export { createOptimalIndexes, recreateAllIndexes };

// Run script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  if (command === 'recreate') {
    recreateAllIndexes()
      .then(() => console.log('✨ Indexes recreated successfully'))
      .catch(error => {
        console.error('💥 Failed to recreate indexes:', error);
        process.exit(1);
      });
  } else {
    createOptimalIndexes()
      .then(() => console.log('✨ Optimal indexes created successfully'))
      .catch(error => {
        console.error('💥 Failed to create indexes:', error);
        process.exit(1);
      });
  }
}