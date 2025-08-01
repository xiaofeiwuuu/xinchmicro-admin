import moment from 'moment';
import 'moment/locale/zh-cn';

// 设置moment为中文
moment.locale('zh-cn');

/**
 * 日期工具类
 */
const dateUtils = {
  /**
   * 格式化日期时间
   * @param {string|Date} dateTime - 日期时间
   * @param {string} format - 格式化模式，默认为 YYYY-MM-DD HH:mm:ss
   * @returns {string} 格式化后的日期时间字符串
   */
  formatDateTime(dateTime, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!dateTime) return '-';
    try {
      // 确保moment能正确解析ISO格式的时间字符串
      return moment(String(dateTime)).format(format);
    } catch (error) {
      console.error('日期格式化错误:', error, dateTime);
      return String(dateTime);
    }
  },

  /**
   * 格式化日期
   * @param {string|Date} date - 日期
   * @param {string} format - 格式化模式，默认为 YYYY-MM-DD
   * @returns {string} 格式化后的日期字符串
   */
  formatDate(date, format = 'YYYY-MM-DD') {
    if (!date) return '-';
    try {
      return moment(String(date)).format(format);
    } catch (error) {
      console.error('日期格式化错误:', error, date);
      return String(date);
    }
  },

  /**
   * 格式化时间
   * @param {string|Date} time - 时间
   * @param {string} format - 格式化模式，默认为 HH:mm:ss
   * @returns {string} 格式化后的时间字符串
   */
  formatTime(time, format = 'HH:mm:ss') {
    if (!time) return '-';
    try {
      return moment(String(time)).format(format);
    } catch (error) {
      console.error('时间格式化错误:', error, time);
      return String(time);
    }
  },

  /**
   * 获取相对时间（例如：3小时前，2天前）
   * @param {string|Date} dateTime - 日期时间
   * @returns {string} 相对时间字符串
   */
  fromNow(dateTime) {
    if (!dateTime) return '-';
    try {
      return moment(String(dateTime)).fromNow();
    } catch (error) {
      console.error('相对时间格式化错误:', error, dateTime);
      return String(dateTime);
    }
  },

  /**
   * 获取当前日期时间
   * @param {string} format - 格式化模式，默认为 YYYY-MM-DD HH:mm:ss
   * @returns {string} 当前日期时间字符串
   */
  now(format = 'YYYY-MM-DD HH:mm:ss') {
    return moment().format(format);
  },

  /**
   * 格式化ISO格式的日期时间字符串
   * @param {string} isoString - ISO格式的日期时间字符串
   * @param {string} format - 格式化模式，默认为 YYYY-MM-DD HH:mm:ss
   * @returns {string} 格式化后的日期时间字符串
   */
  formatISOString(isoString, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!isoString) return '-';
    try {
      // 确保处理的是字符串
      const dateStr = String(isoString);
      // 检查是否是ISO格式的字符串
      if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.includes('+'))) {
        // 使用parseZone和local方法正确处理时区
        return moment.parseZone(dateStr).local().format(format);
      }
      // 如果不是ISO格式，尝试常规解析
      return moment(dateStr).format(format);
    } catch (error) {
      console.error('ISO日期格式化错误:', error, isoString);
      return String(isoString);
    }
  },

  /**
   * 将UTC时间转换为本地时间
   * @param {string} utcTime - UTC时间字符串
   * @param {string} format - 格式化模式，默认为 YYYY-MM-DD HH:mm:ss
   * @returns {string} 格式化后的本地时间字符串
   */
  utcToLocal(utcTime, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!utcTime) return '-';
    try {
      // 解析UTC时间并转换为本地时间
      return moment.utc(String(utcTime)).local().format(format);
    } catch (error) {
      console.error('UTC时间转换错误:', error, utcTime);
      return String(utcTime);
    }
  },

  /**
   * 简单格式化ISO时间字符串（不处理时区）
   * @param {string} isoString - ISO格式的时间字符串
   * @returns {string} 格式化后的时间字符串
   */
  simpleFormatISOString(isoString) {
    if (!isoString) return '-';
    try {
      // 直接使用字符串替换方法处理ISO时间格式
      const dateStr = String(isoString);
      
      // 处理多种可能的ISO格式
      // 1. 标准ISO格式：2025-03-11T06:32:05.000Z
      if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.includes('+'))) {
        return dateStr.replace('T', ' ').replace(/\.\d+Z$/, '').replace('Z', '');
      }
      
      // 2. 如果已经是格式化好的，直接返回
      if (dateStr.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        return dateStr;
      }
      
      // 3. 其他格式，尝试使用Date对象格式化
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
      }
      
      // 4. 如果都失败了，返回原始字符串
      return dateStr;
    } catch (error) {
      console.error('简单ISO日期格式化错误:', error, isoString);
      return String(isoString);
    }
  },

  /**
   * 将UTC时间转换为北京时间（UTC+8）
   * @param {string} utcTimeStr - UTC时间字符串
   * @returns {string} 北京时间字符串
   */
  utcToBeijing(utcTimeStr) {
    if (!utcTimeStr) return '-';
    try {
      // 解析UTC时间
      const date = new Date(utcTimeStr);
      if (isNaN(date.getTime())) {
        return String(utcTimeStr);
      }
      
      // 获取UTC时间的年月日时分秒
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      
      // 获取UTC时间，并加上8小时得到北京时间
      let hours = date.getUTCHours() + 8;
      // 处理跨天的情况
      if (hours >= 24) {
        hours -= 24;
        // 注意：这里简化处理，没有考虑月底跨月的情况
      }
      const hoursStr = String(hours).padStart(2, '0');
      
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      
      // 格式化为 YYYY-MM-DD HH:mm:ss
      return `${year}-${month}-${day} ${hoursStr}:${minutes}:${seconds}`;
    } catch (error) {
      console.error('UTC转北京时间错误:', error, utcTimeStr);
      return String(utcTimeStr);
    }
  }
};

export default dateUtils; 