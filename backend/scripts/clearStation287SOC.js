const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const SocData = require('../src/models/SocData');

async function clearStation287Data() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('数据库连接成功\n');

    console.log('⚠️  警告：即将删除电站287的所有SOC数据！');

    const result = await SocData.deleteMany({ stationId: 287 });
    console.log('✅ 已删除:', result.deletedCount, '条记录\n');

    await mongoose.connection.close();
    console.log('数据库连接已关闭');
    console.log('\n下一步：运行导入脚本恢复原始数据');
    console.log('  node backend/scripts/importSocDataForStation287.js');

  } catch (error) {
    console.error('清空失败:', error);
    process.exit(1);
  }
}

clearStation287Data();
