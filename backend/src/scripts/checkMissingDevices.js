const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const SocData = require('../models/SocData');

const DATA_DIR = '/Users/dy-ypm/Desktop/ESS运营数据/AICode/ess-platform/26.01.27';

async function checkMissing() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');

    const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.csv'));
    console.log('CSV文件总数:', files.length);

    const importedDevices = await SocData.distinct('deviceId');
    console.log('已导入设备数:', importedDevices.length);
    console.log('');

    console.log('未导入的设备:');
    let notImported = [];
    files.forEach(file => {
      const deviceId = path.basename(file, '.csv');
      if (!importedDevices.includes(deviceId)) {
        notImported.push(deviceId);
        const stats = fs.statSync(path.join(DATA_DIR, file));
        const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log('-', deviceId, `(${fileSizeMB} MB)`);
      }
    });

    console.log('\n未导入设备总数:', notImported.length);
    console.log('已导入设备总数:', importedDevices.length);

    await mongoose.connection.close();
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

checkMissing();
