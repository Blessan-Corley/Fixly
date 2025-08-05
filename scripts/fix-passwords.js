// Script to fix double-hashed passwords
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

async function fixPasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find users with potentially double-hashed passwords
    const users = await User.find({ 
      authMethod: 'email',
      passwordHash: { $exists: true }
    }).select('+passwordHash');

    console.log(`Found ${users.length} users with passwords`);

    for (const user of users) {
      if (user.email === 'good@gmail.com') {
        // Reset this user's password to a known value for testing
        const newPassword = 'password123';
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        await User.updateOne(
          { _id: user._id },
          { $set: { passwordHash: hashedPassword } }
        );
        
        console.log(`✅ Fixed password for ${user.email} - new password: ${newPassword}`);
      }
    }

    console.log('Password fix complete');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixPasswords();