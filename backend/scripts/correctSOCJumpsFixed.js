const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SocData = require('../src/models/SocData');

/**
 * SOC跳变检测和修正算法（修复版）
 * 规则：10分钟内SOC变化>10%视为异常跳变
 *
 * 修复内容：
 * 1. 使用前一个点的修正值来检测当前点是否跳变
 * 2. 使用修正值进行线性插值
 * 3. 确保修正过程是渐进式的，每个点都基于前一个点的修正结果
 */

/**
 * 检测并修正单个设备的SOC跳变
 * @param {String} deviceId - 设备ID
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @returns {Object} 修正结果统计
 */
async function correctDeviceSOCJumps(deviceId, startDate, endDate) {
  try {
    // 获取设备的SOC数据，按时间排序
    const socRecords = await SocData.find({
      deviceId,
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: 1 }).lean();

    if (socRecords.length === 0) {
      return {
        deviceId,
        totalRecords: 0,
        jumpsDetected: 0,
        recordsCorrected: 0
      };
    }

    console.log(`  设备 ${deviceId}: ${socRecords.length} 条记录`);

    let jumpsDetected = 0;
    let recordsCorrected = 0;
    const jumpThreshold = 10; // 10%跳变阈值
    const timeWindowMs = 10 * 60 * 1000; // 10分钟

    // 初始化修正后的数据数组
    const correctedData = [];

    // 保存每个点的修正值，用于后续比较
    const correctedValues = [];

    for (let i = 0; i < socRecords.length; i++) {
      const record = socRecords[i];
      let correctedSOC = record.soc;
      let isJump = false;

      // 检查与前一个记录的关系
      if (i > 0) {
        const prevRecord = socRecords[i - 1];
        const prevCorrectedSOC = correctedValues[i - 1]; // 使用前一个点的修正值

        const timeDiff = record.timestamp.getTime() - prevRecord.timestamp.getTime();
        const socDiff = Math.abs(record.soc - prevCorrectedSOC); // 与修正值比较

        // 如果在10分钟内跳变超过10%
        if (timeDiff <= timeWindowMs && socDiff > jumpThreshold) {
          isJump = true;
          jumpsDetected++;

          // 查找下一个正常点来插值
          let nextNormalRecord = null;
          let nextNormalIndex = -1;

          for (let j = i + 1; j < socRecords.length; j++) {
            const nextTimeDiff = socRecords[j].timestamp.getTime() - prevRecord.timestamp.getTime();
            const nextSocDiff = Math.abs(socRecords[j].soc - prevCorrectedSOC); // 与修正值比较

            // 找到一个与前一点变化合理的点
            if (nextTimeDiff > 0 && nextSocDiff <= (nextTimeDiff / timeWindowMs) * jumpThreshold * 2) {
              nextNormalRecord = socRecords[j];
              nextNormalIndex = j;
              break;
            }
          }

          if (nextNormalRecord) {
            // 线性插值（使用修正值）
            const totalTimeDiff = nextNormalRecord.timestamp.getTime() - prevRecord.timestamp.getTime();
            const currentTimeDiff = record.timestamp.getTime() - prevRecord.timestamp.getTime();
            const ratio = currentTimeDiff / totalTimeDiff;
            correctedSOC = prevCorrectedSOC + (nextNormalRecord.soc - prevCorrectedSOC) * ratio;
          } else {
            // 如果找不到下一个正常点，使用前一个修正值
            correctedSOC = prevCorrectedSOC;
          }

          correctedSOC = Math.max(0, Math.min(100, correctedSOC)); // 限制在0-100范围内
        }
      }

      // 保存修正值用于下一次比较
      correctedValues.push(correctedSOC);

      correctedData.push({
        _id: record._id,
        socCorrected: correctedSOC,
        isJumpCorrected: isJump
      });

      if (isJump) {
        recordsCorrected++;
      }
    }

    // 批量更新数据库
    const bulkOps = correctedData.map(item => ({
      updateOne: {
        filter: { _id: item._id },
        update: {
          $set: {
            socCorrected: item.socCorrected,
            isJumpCorrected: item.isJumpCorrected
          }
        }
      }
    }));

    if (bulkOps.length > 0) {
      await SocData.bulkWrite(bulkOps);
    }

    return {
      deviceId,
      totalRecords: socRecords.length,
      jumpsDetected,
      recordsCorrected
    };

  } catch (error) {
    console.error(`修正设备 ${deviceId} 失败:`, error);
    throw error;
  }
}

/**
 * 修正指定电站的所有SOC跳变
 * @param {Number} stationId - 电站ID
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 */
async function correctStationSOCJumps(stationId, startDate, endDate) {
  try {
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('数据库连接成功\n');

    console.log(`开始修正电站 ${stationId} 的SOC跳变`);
    console.log(`时间范围: ${startDate.toISOString()} - ${endDate.toISOString()}\n`);

    // 获取该电站的所有设备
    const devices = await SocData.distinct('deviceId', {
      stationId,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    console.log(`找到 ${devices.length} 个设备\n`);

    let totalJumps = 0;
    let totalCorrected = 0;
    let totalRecords = 0;

    for (const deviceId of devices) {
      const result = await correctDeviceSOCJumps(deviceId, startDate, endDate);
      totalJumps += result.jumpsDetected;
      totalCorrected += result.recordsCorrected;
      totalRecords += result.totalRecords;

      console.log(`    检测到 ${result.jumpsDetected} 个跳变，修正 ${result.recordsCorrected} 条记录\n`);
    }

    console.log('========================================');
    console.log('修正完成！');
    console.log('========================================');
    console.log(`总记录数: ${totalRecords}`);
    console.log(`检测到跳变: ${totalJumps} 个`);
    console.log(`修正记录数: ${totalCorrected} 条`);
    console.log(`修正比例: ${((totalCorrected / totalRecords) * 100).toFixed(2)}%`);
    console.log('========================================\n');

    await mongoose.connection.close();
    console.log('数据库连接已关闭');

  } catch (error) {
    console.error('修正失败:', error);
    process.exit(1);
  }
}

// 命令行参数处理
const args = process.argv.slice(2);

if (args.length === 0) {
  // 默认：修正电站287的12月数据
  const stationId = 287;
  const startDate = new Date('2025-12-01T00:00:00.000Z');
  const endDate = new Date('2025-12-31T23:59:59.999Z');

  correctStationSOCJumps(stationId, startDate, endDate);
} else if (args.length === 3) {
  const stationId = parseInt(args[0]);
  const startDate = new Date(args[1] + 'T00:00:00.000Z');
  const endDate = new Date(args[2] + 'T23:59:59.999Z');

  correctStationSOCJumps(stationId, startDate, endDate);
} else {
  console.log('用法: node correctSOCJumpsFixed.js [stationId] [startDate] [endDate]');
  console.log('示例: node correctSOCJumpsFixed.js 287 2025-12-01 2025-12-31');
  console.log('不带参数时默认修正电站287的12月数据');
  process.exit(1);
}
