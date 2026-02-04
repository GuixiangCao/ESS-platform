const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import User model
const User = require('./src/models/User');

const resetPasswords = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('✓ MongoDB connected');

    // New password
    const newPassword = '123456';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update all users
    const result = await User.updateMany({}, { password: hashedPassword });
    
    console.log(`\n✓ 成功重置 ${result.modifiedCount} 个用户的密码`);
    console.log(`✓ 新密码: ${newPassword}`);

    // Show all users
    const users = await User.find({}, 'username email');
    console.log('\n用户列表:');
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.email})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('✗ 错误:', error.message);
    process.exit(1);
  }
};

resetPasswords();
