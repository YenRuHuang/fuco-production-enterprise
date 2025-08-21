/**
 * FUCO Production System - 日誌管理工具
 * 提供統一的日誌記錄功能
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'fuco.log');
    this.errorFile = path.join(this.logDir, 'error.log');
    
    // 確保日誌目錄存在
    this.ensureLogDirectory();
  }
  
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }
  
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(data && { data })
    };
    
    return JSON.stringify(logEntry);
  }
  
  writeToFile(filename, content) {
    try {
      fs.appendFileSync(filename, content + '\n');
    } catch (error) {
      console.error('寫入日誌檔案失敗:', error);
    }
  }
  
  info(message, data = null) {
    const logMessage = this.formatMessage('info', message, data);
    console.log(`[INFO] ${message}`, data || '');
    this.writeToFile(this.logFile, logMessage);
  }
  
  warn(message, data = null) {
    const logMessage = this.formatMessage('warn', message, data);
    console.warn(`[WARN] ${message}`, data || '');
    this.writeToFile(this.logFile, logMessage);
  }
  
  error(message, data = null) {
    const logMessage = this.formatMessage('error', message, data);
    console.error(`[ERROR] ${message}`, data || '');
    this.writeToFile(this.errorFile, logMessage);
    this.writeToFile(this.logFile, logMessage);
  }
  
  debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = this.formatMessage('debug', message, data);
      console.debug(`[DEBUG] ${message}`, data || '');
      this.writeToFile(this.logFile, logMessage);
    }
  }
}

// 建立單例
const logger = new Logger();

module.exports = { logger };