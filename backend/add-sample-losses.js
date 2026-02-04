#!/usr/bin/env node

/**
 * 添加电站收益损失示例数据
 * 用于演示损失分析功能
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '.env') });

// 连接数据库
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform';

// 定义损失类型模型
const revenueLossSchema = new mongoose.Schema({
  stationId: Number,
  date: Date,
  lossType: String,
  lossAmount: Number,
  description: String,
  reason: String,
  duration: Number
}, {
  collection: 'revenue_losses'
});

const RevenueLoss = mongoose.model('RevenueLoss', revenueLossSchema);

// 示例损失数据
const generateSampleLosses = () => {
  const losses = [];
  const today = new Date();

  // 为过去30天生成一些随机损失记录
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // 随机决定这天是否有损失（40%概率）
    if (Math.random() < 0.4) {
      const lossTypes = ['planned_shutdown', 'equipment_failure', 'external_factors'];
      const lossType = lossTypes[Math.floor(Math.random() * lossTypes.length)];

      let lossAmount, description, reason, duration;

      switch (lossType) {
        case 'planned_shutdown':
          lossAmount = Math.random() * 5000 + 2000; // 2000-7000元
          duration = Math.random() * 8 + 2; // 2-10小时
          description = '计划性维护停机';
          reason = ['定期保养', '系统升级', '设备检修', '预防性维护'][Math.floor(Math.random() * 4)];
          break;

        case 'equipment_failure':
          lossAmount = Math.random() * 10000 + 3000; // 3000-13000元
          duration = Math.random() * 12 + 1; // 1-13小时
          description = '设备故障导致停机';
          reason = ['逆变器故障', '电池系统异常', '控制器失效', '线路故障', '传感器损坏'][Math.floor(Math.random() * 5)];
          break;

        case 'external_factors':
          lossAmount = Math.random() * 8000 + 1000; // 1000-9000元
          duration = Math.random() * 6 + 0.5; // 0.5-6.5小时
          description = '外部因素影响';
          reason = ['极端天气', '电网波动', '供电中断', '自然灾害影响', '温度异常'][Math.floor(Math.random() * 5)];
          break;
      }

      // 为电站1, 2, 3添加损失记录
      [1, 2, 3].forEach(stationId => {
        // 不是每个电站每天都有同样的损失
        if (Math.random() < 0.6) {
          losses.push({
            stationId,
            date: new Date(date),
            lossType,
            lossAmount: lossAmount * (0.8 + Math.random() * 0.4), // 添加一些随机变化
            description,
            reason,
            duration: duration * (0.8 + Math.random() * 0.4)
          });
        }
      });
    }
  }

  return losses;
};

async function addSampleLosses() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ 数据库连接成功');

    // 清除现有的损失数据（可选）
    console.log('\n清除现有损失数据...');
    await RevenueLoss.deleteMany({});
    console.log('✓ 已清除现有数据');

    // 生成并插入示例数据
    console.log('\n生成示例损失数据...');
    const sampleLosses = generateSampleLosses();
    console.log(`生成了 ${sampleLosses.length} 条损失记录`);

    console.log('\n插入数据到数据库...');
    await RevenueLoss.insertMany(sampleLosses);
    console.log('✓ 示例数据插入成功');

    // 统计信息
    const stats = await RevenueLoss.aggregate([
      {
        $group: {
          _id: '$lossType',
          count: { $sum: 1 },
          totalLoss: { $sum: '$lossAmount' }
        }
      }
    ]);

    console.log('\n=== 数据统计 ===');
    stats.forEach(stat => {
      const typeNames = {
        'planned_shutdown': '计划性停运',
        'equipment_failure': '设备故障',
        'external_factors': '外界因素'
      };
      console.log(`${typeNames[stat._id]}: ${stat.count} 次, 总损失: ¥${stat.totalLoss.toFixed(2)}`);
    });

    console.log('\n✓ 示例数据添加完成！');
    console.log('现在可以在电站分析页面的"损失分析"标签中查看数据。');

  } catch (error) {
    console.error('✗ 错误:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  }
}

// 运行脚本
addSampleLosses();
