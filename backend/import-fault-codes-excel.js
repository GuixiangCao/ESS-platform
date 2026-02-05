const XLSX = require('xlsx');
const mongoose = require('mongoose');
const FaultCode = require('./src/models/FaultCode');

// MongoDB连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ess-platform';

// Excel文件路径（可通过命令行参数指定）
const EXCEL_FILE_PATH = process.argv[2] || '../Data_Source/PCS停机故障表 1.csv';

/**
 * 推断设备类型
 */
function inferDeviceType(category, code) {
  if (!code) return 'unknown';
  const codeUpper = code.toUpperCase();

  if (codeUpper.startsWith('PCS_')) return 'pcs';
  if (codeUpper.startsWith('BAT_') || (category && category.includes('电池'))) return 'battery';
  if (codeUpper.startsWith('AC_') || (category && category.includes('空调'))) return 'ac';
  if (codeUpper.startsWith('EMS_') || (category && category.includes('EMS'))) return 'ems';
  if (codeUpper.startsWith('SYS_') || (category && (category.includes('系统') || category.includes('环境')))) return 'system';

  return 'unknown';
}

/**
 * 推断严重程度
 */
function inferSeverity(category, code, description) {
  const desc = (description || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  // 紧急级别：紧急停机、火灾、热失控等
  const criticalKeywords = ['紧急', '火灾', '热失控', '绝缘故障', '极限保护', '停机'];
  for (const keyword of criticalKeywords) {
    if (desc.includes(keyword) || cat.includes(keyword)) {
      return 'critical';
    }
  }

  // 错误级别：故障、短路、开路等
  const errorKeywords = ['故障', '短路', '开路', '失败', '异常', '过压', '欠压', '过流', '过温', '过载'];
  for (const keyword of errorKeywords) {
    if (desc.includes(keyword)) {
      return 'error';
    }
  }

  // 警告级别：通讯、超时、报警等
  const warningKeywords = ['通讯', '通信', '超时', '报警', '告警', '丢失', '连接'];
  for (const keyword of warningKeywords) {
    if (desc.includes(keyword)) {
      return 'warning';
    }
  }

  // 默认为信息级别
  return 'info';
}

/**
 * 从Excel导入故障代码
 */
async function importFaultCodesFromExcel() {
  let connection;

  try {
    // 连接MongoDB
    console.log('正在连接MongoDB...');
    connection = await mongoose.connect(MONGODB_URI);
    console.log('MongoDB连接成功!\n');

    console.log(`正在读取Excel文件: ${EXCEL_FILE_PATH}\n`);

    // 读取Excel文件
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0]; // 读取第一个sheet
    const worksheet = workbook.Sheets[sheetName];

    // 转换为JSON
    const rows = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Excel文件读取完成，共读取 ${rows.length} 行数据\n`);

    const faultCodes = [];
    const errors = [];
    let currentCategory = '';

    rows.forEach((row, index) => {
      try {
        // 获取字段（处理可能的不同列名）
        const category = row['故障分类'] || row['category'] || row['分类'] || '';
        const code = row['英文名称'] || row['code'] || row['代码'] || row['英文代码'] || '';
        const description = row['中文描述'] || row['description'] || row['描述'] || '';

        // 如果有分类值，更新当前分类
        if (category.trim()) {
          currentCategory = category.trim();
        }

        // 跳过无效数据
        if (!code.trim() || !description.trim()) {
          return;
        }

        const faultCode = {
          category: currentCategory,
          code: code.trim(),
          description: description.trim(),
          deviceType: inferDeviceType(currentCategory, code),
          severity: inferSeverity(currentCategory, code, description)
        };

        faultCodes.push(faultCode);
      } catch (error) {
        errors.push({
          line: index + 2, // +2 because index starts at 0 and first row is header
          reason: error.message,
          data: row
        });
      }
    });

    console.log(`成功解析: ${faultCodes.length} 条`);
    console.log(`解析失败: ${errors.length} 条\n`);

    if (errors.length > 0) {
      console.log('前5条错误记录:');
      errors.slice(0, 5).forEach(err => {
        console.log(`  行 ${err.line}: ${err.reason}`);
      });
      console.log();
    }

    // 批量插入数据
    if (faultCodes.length > 0) {
      console.log('正在批量插入故障代码到MongoDB...');
      console.log(`准备插入的故障代码数: ${faultCodes.length}`);
      console.log('\n第一条数据示例:');
      console.log(JSON.stringify(faultCodes[0], null, 2));
      console.log();

      try {
        // 使用 insertMany 并设置 ordered: false 以跳过重复项
        const result = await FaultCode.insertMany(faultCodes, {
          ordered: false
        });

        console.log(`✅ 成功插入 ${result.length} 条故障代码记录\n`);
      } catch (error) {
        if (error.code === 11000) {
          // 部分重复的情况
          const insertedCount = error.insertedDocs ? error.insertedDocs.length : 0;
          console.log(`⚠️  成功插入 ${insertedCount} 条记录，${faultCodes.length - insertedCount} 条记录因重复被跳过\n`);
        } else {
          console.error('插入错误详情:', error);
          throw error;
        }
      }

      // 统计信息
      console.log('📊 数据统计:');
      const totalCount = await FaultCode.countDocuments();
      console.log(`  - 数据库总故障代码数: ${totalCount}`);

      const categories = await FaultCode.getCategories();
      console.log(`  - 故障分类数: ${categories.length}`);
      console.log(`  - 分类列表:\n    ${categories.join('\n    ')}`);

      const deviceTypes = await FaultCode.distinct('deviceType');
      console.log(`\n  - 设备类型: ${deviceTypes.join(', ')}`);

      // 按分类统计
      console.log('\n📈 各分类故障代码数统计:');
      const categoryStats = await FaultCode.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            deviceTypes: { $addToSet: '$deviceType' },
            severities: { $addToSet: '$severity' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      categoryStats.forEach(stat => {
        console.log(`  - ${stat._id}: ${stat.count} 条`);
        console.log(`    设备: ${stat.deviceTypes.join(', ')}`);
        console.log(`    严重程度: ${stat.severities.join(', ')}`);
      });

      // 按严重程度统计
      console.log('\n🔧 各严重程度故障代码数统计:');
      const severityStats = await FaultCode.getStatsBySeverity();

      const severityLabels = {
        critical: '紧急',
        error: '错误',
        warning: '警告',
        info: '信息'
      };

      severityStats.forEach(stat => {
        const label = severityLabels[stat._id] || stat._id;
        console.log(`  - ${label} (${stat._id}): ${stat.count} 条`);
      });

      // 按设备类型统计
      console.log('\n🔌 各设备类型故障代码数统计:');
      const deviceStats = await FaultCode.aggregate([
        {
          $group: {
            _id: '$deviceType',
            count: { $sum: 1 },
            severities: { $addToSet: '$severity' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      deviceStats.forEach(stat => {
        console.log(`  - ${stat._id}: ${stat.count} 条`);
      });
    }

    // 关闭MongoDB连接
    if (connection && mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n✅ MongoDB连接已关闭');
    }

  } catch (error) {
    console.error('❌ 导入失败:', error);
    // 确保连接在错误情况下也能关闭
    if (connection && mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n✅ MongoDB连接已关闭');
    }
    throw error;
  }
}

// 执行导入
if (require.main === module) {
  console.log('💡 使用方法: node import-fault-codes-excel.js [Excel文件路径]');
  console.log(`📁 当前使用文件: ${EXCEL_FILE_PATH}\n`);

  importFaultCodesFromExcel()
    .then(() => {
      console.log('\n🎉 导入完成!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 导入过程出错:', error);
      process.exit(1);
    });
}

module.exports = { importFaultCodesFromExcel };
