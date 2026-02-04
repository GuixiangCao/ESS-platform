const XLSX = require('xlsx');
const path = require('path');

const EXCEL_FILE_PATH = path.join(__dirname, '../../../电站网关对应表.xlsx');
const workbook = XLSX.readFile(EXCEL_FILE_PATH);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`Total rows in Excel: ${data.length}\n`);

// Get all gateway IDs with their stations
const allGateways = data.map(row => {
  const gid = (row['gateway_id'] || row['gatewayId'] || row['网关ID'] || '').toLowerCase().trim();
  const stationId = row['电站ID'] || row['stationId'] || row['station_id'];
  const stationName = row['电站名称'] || row['stationName'] || row['station_name'];
  return { gatewayId: gid, stationId, stationName };
});

// Count gateway ID occurrences
const gatewayCount = {};
allGateways.forEach(g => {
  if (!gatewayCount[g.gatewayId]) {
    gatewayCount[g.gatewayId] = [];
  }
  gatewayCount[g.gatewayId].push({ stationId: g.stationId, stationName: g.stationName });
});

// Find duplicates
console.log('=== DUPLICATE GATEWAY IDs ===\n');
let duplicateCount = 0;
Object.entries(gatewayCount).forEach(([gid, stations]) => {
  if (stations.length > 1) {
    duplicateCount++;
    console.log(`Gateway: ${gid}`);
    stations.forEach(s => {
      console.log(`  - Station ${s.stationId}: ${s.stationName}`);
    });
    console.log('');
  }
});

console.log(`Total duplicate gateway IDs: ${duplicateCount}\n`);

// Check station 205 specifically
console.log('=== STATION 205 GATEWAYS ===\n');
const station205 = allGateways.filter(g => g.stationId === 205);
station205.forEach(g => {
  const occurrences = gatewayCount[g.gatewayId];
  console.log(`Gateway: ${g.gatewayId}`);
  if (occurrences.length > 1) {
    console.log('  ⚠️  ALSO USED BY:');
    occurrences.forEach(s => {
      if (s.stationId !== 205) {
        console.log(`    - Station ${s.stationId}: ${s.stationName}`);
      }
    });
  } else {
    console.log('  ✓ UNIQUE');
  }
});
