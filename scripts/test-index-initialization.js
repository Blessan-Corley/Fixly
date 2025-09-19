#!/usr/bin/env node
// scripts/test-index-initialization.js - Test script for database index initialization

import { initializeIndexes, conditionalIndexInitialization } from '../lib/initializeIndexes.js';

/**
 * Test the database index initialization utility
 */
async function testIndexInitialization() {
  console.log('🧪 Testing Database Index Initialization Utility\n');
  
  try {
    // Test environment check
    console.log('🔧 Environment Variables:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`   INIT_DB_INDEXES: ${process.env.INIT_DB_INDEXES || 'undefined'}`);
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? 'set' : 'not set'}\n`);
    
    // Test conditional initialization (respects environment variables)
    console.log('🎯 Testing conditional initialization...');
    await conditionalIndexInitialization();
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.name === 'IndexInitializationError') {
      console.error(`   Model: ${error.modelName}`);
      console.error(`   Timestamp: ${error.timestamp}`);
    }
    
    console.error(`   Stack: ${error.stack}`);
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testIndexInitialization();
}