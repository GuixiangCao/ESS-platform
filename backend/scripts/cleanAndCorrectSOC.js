const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SocData = require('../src/models/SocData');

/**
 * 清理并修正SOC数据
 *
 * 步骤:
 * 1. 检测每个设备是否有"双流"数据(两个SOC值交替出现)
 * 2. 如果有,保留出现频率更高或更合���的那一流
 * 3. 对清理后的数据应用跳变修正
 */

/**
 * 清理单个设备的双流数据
 * @param {String} deviceId - 设备ID
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @returns {Object} 清理结果统计
 */
async function cleanDeviceData(deviceId, startDate, endDate) {
  try {
    const socRecords = await SocData.find({
      deviceId,
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: 1 }).lean();

    if (socRecords.length === 0) {
      return {
        deviceId,
        totalRecords: 0,
        hasDoubleStream: false,
        recordsToKeep: []
      };
    }

    // 检测是否有双流问题:时间间隔<2秒的记录对
    const clusters = [];
    let currentCluster = [socRecords[0]];

    for (let i = 1; i < socRecords.length; i++) {
      const timeDiff = socRecords[i].timestamp.getTime() - currentCluster[0].timestamp.getTime();

      if (timeDiff < 2000) { // 2秒内算同一簇
        currentCluster.push(socRecords[i]);
      } else {
        clusters.push(currentCluster);
        currentCluster = [socRecords[i]];
      }
    }
    clusters.push(currentCluster);

    // 统计有多少簇包含多个值
    const doubleStreamClusters = clusters.filter(c => c.length > 1);
    const hasDoubleStream = doubleStreamClusters.length > 10; // 超过10个双流簇才算有问题

    if (!hasDoubleStream) {
      // 没有双流问题,返回所有记录
      return {
        deviceId,
        totalRecords: socRecords.length,
        hasDoubleStream: false,
        recordsToKeep: socRecords
      };
    }

    // 有双流问题,需要清理
    console.log(`  设备 ${deviceId}: 检测到双流数据 (${doubleStreamClusters.length}个双流簇)`);

    // 分析双流模式:统计每个簇中哪个位置的值更合理
    const socRanges = [];

    // 将SOC值分成两个范围
    const allSocs = socRecords.map(r => r.soc);
    const minSoc = Math.min(...allSocs);
    const maxSoc = Math.max(...allSocs);

    // 如果最大最小差距>40%,可能是双流
    if (maxSoc - minSoc > 40) {
      const midPoint = (minSoc + maxSoc) / 2;
      const lowRangeCount = allSocs.filter(s => s < midPoint).length;
      const highRangeCount = allSocs.filter(s => s >= midPoint).length;

      console.log(`    低值范围 (<${midPoint.toFixed(1)}%): ${lowRangeCount}条`);
      console.log(`    高值范围 (>=${midPoint.toFixed(1)}%): ${highRangeCount}条`);

      // 保留数量更多的那一组
      const keepLowRange = lowRangeCount >= highRangeCount;

      console.log(`    决定保留: ${keepLowRange ? '低值' : '高值'}范围`);

      // 从每个簇中选择保留的记录
      const recordsToKeep = clusters.map(cluster => {
        if (cluster.length === 1) {
          return cluster[0];
        }

        // 在簇中选择符合保留范围的记录
        const matchingRecords = cluster.filter(r =>
          keepLowRange ? r.soc < midPoint : r.soc >= midPoint
        );

        if (matchingRecords.length > 0) {
          return matchingRecords[0]; // 取第一个匹配的
        } else {
          return cluster[0]; // 如果没有匹配的,取第一个
        }
      });

      return {
        deviceId,
        totalRecords: socRecords.length,
        hasDoubleStream: true,
        recordsToKeep,
        removedCount: socRecords.length - recordsToKeep.length
      };
    } else {
      // 虽然有近距离时间戳,但SOC值范围不大,可能不是双流问题
      // 简单地保留每个簇的第一个记录
      const recordsToKeep = clusters.map(c => c[0]);

      return {
        deviceId,
        totalRecords: socRecords.length,
        hasDoubleStream: false,
        recordsToKeep,
        removedCount: socRecords.length - recordsToKeep.length
      };
    }

  } catch (error) {
    console.error(`清理设备 ${deviceId} 失败:`, error);
    throw error;
  }
}

/**
 * 对清理后的数据应用跳变修正
 */
async function correctCleanedData(deviceId, recordsToKeep) {
  if (recordsToKeep.length === 0) {
    return {
      deviceId,
      jumpsDetected: 0,
      recordsCorrected: 0
    };
  }

  let jumpsDetected = 0;
  let recordsCorrected = 0;
  const jumpThreshold = 10; // 10%跳变阈值
  const timeWindowMs = 10 * 60 * 1000; // 10分钟

  const correctedData = [];
  const correctedValues = [];

  for (let i = 0; i < recordsToKeep.length; i++) {
    const record = recordsToKeep[i];
    let correctedSOC = record.soc;
    let isJump = false;

    if (i > 0) {
      const prevRecord = recordsToKeep[i - 1];
      const prevCorrectedSOC = correctedValues[i - 1];

      const timeDiff = record.timestamp.getTime() - prevRecord.timestamp.getTime();
      const socDiff = Math.abs(record.soc - prevCorrectedSOC);

      if (timeDiff <= timeWindowMs && socDiff > jumpThreshold) {
        isJump = true;
        jumpsDetected++;

        // 查找下一个正常点来插值
        let nextNormalRecord = null;

        for (let j = i + 1; j < recordsToKeep.length; j++) {
          const nextTimeDiff = recordsToKeep[j].timestamp.getTime() - prevRecord.timestamp.getTime();
          const nextSocDiff = Math.abs(recordsToKeep[j].soc - prevCorrectedSOC);

          if (nextTimeDiff > 0 && nextSocDiff <= (nextTimeDiff / timeWindowMs) * jumpThreshold * 2) {
            nextNormalRecord = recordsToKeep[j];
            break;
          }
        }

        if (nextNormalRecord) {
          const totalTimeDiff = nextNormalRecord.timestamp.getTime() - prevRecord.timestamp.getTime();
          const currentTimeDiff = record.timestamp.getTime() - prevRecord.timestamp.getTime();
          const ratio = currentTimeDiff / totalTimeDiff;
          correctedSOC = prevCorrectedSOC + (nextNormalRecord.soc - prevCorrectedSOC) * ratio;
        } else {
          correctedSOC = prevCorrectedSOC;
        }

        correctedSOC = Math.max(0, Math.min(100, correctedSOC));
      }
    }

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
    jumpsDetected,
    recordsCorrected
  };
}

/**
 * 清理并修正指定电站的所有SOC数据
 */
async function cleanAndCorrectStation(stationId, startDate, endDate) {
  try {
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform');
    console.log('数据库连接成功\n');

    console.log(`开始清理并修正电站 ${stationId} 的SOC数据`);
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
    let totalRemoved = 0;

    for (const deviceId of devices) {
      console.log(`处理设备 ${deviceId}...`);

      // 1. 清理数据
      const cleanResult = await cleanDeviceData(deviceId, startDate, endDate);
      totalRecords += cleanResult.totalRecords;

      if (cleanResult.hasDoubleStream) {
        totalRemoved += cleanResult.removedCount;
        console.log(`    清理完成: 移除 ${cleanResult.removedCount} 条重复/错误记录`);
      }

      // 2. 修正清理后的数据
      const correctResult = await correctCleanedData(deviceId, cleanResult.recordsToKeep);
      totalJumps += correctResult.jumpsDetected;
      totalCorrected += correctResult.recordsCorrected;

      console.log(`    检测到 ${correctResult.jumpsDetected} 个跳变，修正 ${correctResult.recordsCorrected} 条记录\n`);
    }

    console.log('========================================');
    console.log('清理和修正完成！');
    console.log('========================================');
    console.log(`总记录数: ${totalRecords}`);
    console.log(`移除的重复/错误记录: ${totalRemoved}`);
    console.log(`检测到跳变: ${totalJumps} 个`);
    console.log(`修正记录数: ${totalCorrected} 条`);
    console.log('========================================\n');

    await mongoose.connection.close();
    console.log('数据库连接已关闭');

  } catch (error) {
    console.error('处理失败:', error);
    process.exit(1);
  }
}

// 命令行参数处理
const args = process.argv.slice(2);

if (args.length === 0) {
  const stationId = 287;
  const startDate = new Date('2025-12-01T00:00:00.000Z');
  const endDate = new Date('2025-12-31T23:59:59.999Z');

  cleanAndCorrectStation(stationId, startDate, endDate);
} else if (args.length === 3) {
  const stationId = parseInt(args[0]);
  const startDate = new Date(args[1] + 'T00:00:00.000Z');
  const endDate = new Date(args[2] + 'T23:59:59.999Z');

  cleanAndCorrectStation(stationId, startDate, endDate);
} else {
  console.log('用法: node cleanAndCorrectSOC.js [stationId] [startDate] [endDate]');
  console.log('示例: node cleanAndCorrectSOC.js 287 2025-12-26 2025-12-26');
  console.log('不带参数时默认修正电站287的12月数据');
  process.exit(1);
}
