const mongoose = require('mongoose');
const User = require('./src/models/User');

async function resetPassword() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ess-platform');
    console.log('✓ 已连接到数据库');

    // 查找用户
    const user = await User.findOne({ email: 'paul09@126.com' });
    if (!user) {
      console.log('❌ 未找到用户');
      process.exit(1);
    }

    console.log('✓ 找到用户:', user.username);

    // 设置新密码
    const newPassword = '123456';
    user.password = newPassword;
    await user.save();

    console.log('✅ 密码已重置!');
    console.log('\n登录信息:');
    console.log('邮箱:', user.email);
    console.log('密码:', newPassword);
    console.log('\n请使用这些凭据登录系统');

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

resetPassword();
