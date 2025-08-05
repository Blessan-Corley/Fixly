// scripts/fix-duplicate-usernames.js - Clean up duplicate usernames
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const User = require('../models/User');

async function fixDuplicateUsernames() {
  try {
    console.log('🔧 Starting username cleanup process...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all users
    const users = await User.find({}).sort({ createdAt: 1 });
    console.log(`📊 Found ${users.length} users to check`);
    
    const seenUsernames = new Set();
    const duplicates = [];
    
    // Find duplicates
    for (const user of users) {
      const cleanUsername = user.username.toLowerCase().trim();
      
      if (seenUsernames.has(cleanUsername)) {
        duplicates.push(user);
        console.log(`🔍 Found duplicate username: ${cleanUsername} (User ID: ${user._id})`);
      } else {
        seenUsernames.add(cleanUsername);
      }
    }
    
    console.log(`🔍 Found ${duplicates.length} duplicate usernames`);
    
    // Fix duplicates by appending numbers
    for (let i = 0; i < duplicates.length; i++) {
      const user = duplicates[i];
      const baseUsername = user.username.toLowerCase().trim();
      let newUsername = baseUsername;
      let counter = 2;
      
      // Find an available username
      while (seenUsernames.has(newUsername) || await User.findOne({ username: newUsername })) {
        newUsername = `${baseUsername}_${counter}`;
        counter++;
      }
      
      // Update the user
      await User.findByIdAndUpdate(user._id, { username: newUsername });
      seenUsernames.add(newUsername);
      
      console.log(`✅ Updated ${baseUsername} → ${newUsername} (User ID: ${user._id})`);
    }
    
    // Validate all usernames now comply with rules
    console.log('🔍 Validating all usernames comply with new rules...');
    const allUsers = await User.find({});
    const invalidUsers = [];
    
    for (const user of allUsers) {
      const username = user.username;
      
      // Check validation rules
      if (!/^[a-z0-9_]+$/.test(username) ||
          username.length < 3 ||
          username.length > 20 ||
          username.startsWith('_') ||
          username.endsWith('_') ||
          username.includes('__') ||
          /^\d+$/.test(username)) {
        invalidUsers.push(user);
      }
    }
    
    console.log(`🔍 Found ${invalidUsers.length} users with invalid usernames`);
    
    // Fix invalid usernames
    for (const user of invalidUsers) {
      const baseUsername = user.username.replace(/[^a-z0-9_]/g, '').slice(0, 15);
      let newUsername = baseUsername || 'user';
      let counter = 2;
      
      // Ensure it doesn't start/end with underscore
      newUsername = newUsername.replace(/^_+|_+$/g, '');
      if (!newUsername) newUsername = 'user';
      
      // Find available username
      while (await User.findOne({ username: newUsername })) {
        newUsername = `${baseUsername || 'user'}_${counter}`;
        counter++;
      }
      
      await User.findByIdAndUpdate(user._id, { username: newUsername });
      console.log(`✅ Fixed invalid username: ${user.username} → ${newUsername} (User ID: ${user._id})`);
    }
    
    // Create unique index if it doesn't exist
    try {
      await User.collection.createIndex(
        { username: 1 }, 
        { unique: true, collation: { locale: 'en', strength: 2 } }
      );
      console.log('✅ Created unique index for username');
    } catch (error) {
      if (error.code === 11000) {
        console.log('ℹ️ Unique index already exists');
      } else {
        console.error('❌ Error creating index:', error);
      }
    }
    
    console.log('🎉 Username cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during username cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  fixDuplicateUsernames().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { fixDuplicateUsernames };