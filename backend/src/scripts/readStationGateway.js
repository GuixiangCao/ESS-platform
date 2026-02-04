const XLSX = require('xlsx');
const path = require('path');

// Excel 文件路径
const EXCEL_FILE_PATH = path.join(__dirname, '../../../电站网关对应表.xlsx');

console.log('读取文件:', EXCEL_FILE_PATH);

try {
  // 读取 Excel 文件
  const workbook = XLSX.readFile(EXCEL_FILE_PATH);

  // 获取所有工作表名称
  console.log('\n工作表列表:', workbook.SheetNames);

  // 读取第一个工作表
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // 转换为 JSON
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`\n工作表 "${sheetName}" 包含 ${data.length} 行数据`);

  if (data.length > 0) {
    console.log('\n列名:', Object.keys(data[0]));
    console.log('\n前 5 行数据预览:');
    data.slice(0, 5).forEach((row, index) => {
      console.log(`\n行 ${index + 1}:`, JSON.stringify(row, null, 2));
    });
  }

} catch (error) {
  console.error('读取失败:', error.message);
}
