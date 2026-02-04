const XLSX = require('xlsx');
const path = require('path');

// Excel 文件路径
const EXCEL_FILE_PATH = path.join(__dirname, '../../../电站网关对应表.xlsx');

console.log('读取文件:', EXCEL_FILE_PATH);

try {
  // 读取 Excel 文件
  const workbook = XLSX.readFile(EXCEL_FILE_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`\n总共 ${data.length} 行数据`);

  // 过滤电站 ID 为 205 的记录
  const station205Records = data.filter(row =>
    row['电站ID'] === 205 || row['stationId'] === 205 || row['station_id'] === 205
  );

  console.log(`\n电站 ID 205 的记录数: ${station205Records.length}\n`);

  if (station205Records.length > 0) {
    station205Records.forEach((record, index) => {
      console.log(`记录 ${index + 1}:`);
      console.log(JSON.stringify(record, null, 2));
      console.log('---');
    });
  }

  // 显示所有电站 ID（去重）
  const allStationIds = [...new Set(data.map(row =>
    row['电站ID'] || row['stationId'] || row['station_id']
  ))].sort((a, b) => a - b);

  console.log(`\n所有电站 ID (${allStationIds.length} 个):`);
  console.log(allStationIds.join(', '));

} catch (error) {
  console.error('读取失败:', error.message);
}
