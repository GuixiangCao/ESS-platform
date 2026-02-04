/**
 * 时间格式化工具
 *
 * 说明：
 * 数据库中的时间以标准UTC+0时间戳格式存储
 * 显示时需要转换为UTC+8（东八区）本地时间
 *
 * 例如：
 * 数据库: 2026-01-11T19:55:38.000Z (UTC+0)
 * 显示为: 2026-01-12 03:55:38 (UTC+8，加8小时)
 */

const UTC_OFFSET = 8 * 60 * 60 * 1000; // UTC+8 偏移量（8小时的毫秒数）

/**
 * 将UTC时间戳转换为UTC+8本地时间
 * @param {Date|string} datetime - 日期时间对象或ISO字符串
 * @returns {Date} UTC+8本地时间的Date对象
 */
function convertToUTC8(datetime) {
  if (!datetime) return null;

  const date = datetime instanceof Date ? datetime : new Date(datetime);
  // 将UTC时间加8小时，得到UTC+8本地时间
  return new Date(date.getTime() + UTC_OFFSET);
}

/**
 * 将UTC时间戳格式化为UTC+8本地日期时间字符串
 * @param {Date|string} datetime - 日期时间对象或ISO字符串
 * @param {boolean} includeSeconds - 是否包含秒
 * @returns {string} 格式化后的时间字符串，如 "2026-01-12 03:55:38"
 */
export function formatUTCAsLocal(datetime, includeSeconds = true) {
  const localDate = convertToUTC8(datetime);
  if (!localDate) return '';

  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  const hour = String(localDate.getUTCHours()).padStart(2, '0');
  const minute = String(localDate.getUTCMinutes()).padStart(2, '0');
  const second = String(localDate.getUTCSeconds()).padStart(2, '0');

  if (includeSeconds) {
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  } else {
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
}

/**
 * 格式化为中文日期时间
 * @param {Date|string} datetime - 日期时间对象或ISO字符串
 * @param {boolean} includeSeconds - 是否包含秒
 * @returns {string} 格式化后的时间字符串，如 "2026年01月12日 03:55:38"
 */
export function formatUTCAsLocalCN(datetime, includeSeconds = true) {
  const localDate = convertToUTC8(datetime);
  if (!localDate) return '';

  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  const hour = String(localDate.getUTCHours()).padStart(2, '0');
  const minute = String(localDate.getUTCMinutes()).padStart(2, '0');
  const second = String(localDate.getUTCSeconds()).padStart(2, '0');

  if (includeSeconds) {
    return `${year}年${month}月${day}日 ${hour}:${minute}:${second}`;
  } else {
    return `${year}年${month}月${day}日 ${hour}:${minute}`;
  }
}

/**
 * 只格式化日期部分
 * @param {Date|string} datetime - 日期时间对象或ISO字符串
 * @returns {string} 格式化后的日期字符串，如 "2026-01-12"
 */
export function formatUTCDate(datetime) {
  const localDate = convertToUTC8(datetime);
  if (!localDate) return '';

  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * 只格式化时间部分
 * @param {Date|string} datetime - 日期时间对象或ISO字符串
 * @param {boolean} includeSeconds - 是否包含秒
 * @returns {string} 格式化后的时间字符串，如 "03:55:38"
 */
export function formatUTCTime(datetime, includeSeconds = true) {
  const localDate = convertToUTC8(datetime);
  if (!localDate) return '';

  const hour = String(localDate.getUTCHours()).padStart(2, '0');
  const minute = String(localDate.getUTCMinutes()).padStart(2, '0');
  const second = String(localDate.getUTCSeconds()).padStart(2, '0');

  if (includeSeconds) {
    return `${hour}:${minute}:${second}`;
  } else {
    return `${hour}:${minute}`;
  }
}

/**
 * 格式化为中文日期
 * @param {Date|string} datetime - 日期时间对象或ISO字符串
 * @returns {string} 格式化后的日期字符串，如 "2026年01月12日"
 */
export function formatUTCDateCN(datetime) {
  const localDate = convertToUTC8(datetime);
  if (!localDate) return '';

  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');

  return `${year}年${month}月${day}日`;
}

/**
 * 格式化为年月
 * @param {Date|string} datetime - 日期时间对象或ISO字符串
 * @returns {string} 格式化后的年月字符串，如 "2026年01月"
 */
export function formatUTCYearMonth(datetime) {
  const localDate = convertToUTC8(datetime);
  if (!localDate) return '';

  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');

  return `${year}年${month}月`;
}

export default {
  formatUTCAsLocal,
  formatUTCAsLocalCN,
  formatUTCDate,
  formatUTCTime,
  formatUTCDateCN,
  formatUTCYearMonth
};
