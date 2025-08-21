/**
 * FUCO Production System - 環境配置管理
 * 基於 mursfoto-cli 優秀實踐，提供統一的配置管理
 */

const fs = require('fs');
const path = require('path');
const colors = require('colors');

class EnvironmentManager {
  constructor() {
    this.config = {};
    this.environments = ['development', 'staging', 'production', 'test'];
    this.requiredVars = [
      'NODE_ENV',
      'APP_PORT',
      'JWT_SECRET'
    ];
    this.optionalVars = [
      'APP_HOST',
      'DATABASE_URL',
      'CORS_ORIGIN',
      'LOG_LEVEL',
      'LOG_FILE',
      'SESSION_SECRET',
      'REDIS_URL'
    ];
    
    this.load();
  }

  // 載入配置
  load() {
    try {
      // 載入環境變數
      this.loadEnvironmentVariables();
      
      // 載入配置檔案
      this.loadConfigFiles();
      
      // 驗證配置
      this.validateConfiguration();
      
      // 設置預設值
      this.setDefaults();
      
      console.log(`✅ 環境配置載入完成 (${this.getCurrentEnvironment()})`.green);
    } catch (error) {
      console.error(`❌ 環境配置載入失敗: ${error.message}`.red);
      throw error;
    }
  }

  // 載入環境變數
  loadEnvironmentVariables() {
    // 載入 .env 檔案
    const envFiles = [
      '.env',
      `.env.${this.getCurrentEnvironment()}`,
      '.env.local'
    ];

    envFiles.forEach(envFile => {
      const envPath = path.resolve(process.cwd(), envFile);
      if (fs.existsSync(envPath)) {
        this.parseEnvFile(envPath);
        console.log(`📄 已載入 ${envFile}`.gray);
      }
    });
  }

  // 解析 .env 檔案
  parseEnvFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach(line => {
      line = line.trim();
      
      // 忽略註解和空行
      if (line.startsWith('#') || !line) {
        return;
      }

      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.slice(0, equalIndex).trim();
        let value = line.slice(equalIndex + 1).trim();

        // 移除引號
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // 只設置未設置的變數
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }

  // 載入配置檔案
  loadConfigFiles() {
    const configFiles = [
      'fuco.config.json',
      `config/${this.getCurrentEnvironment()}.json`,
      'config/default.json'
    ];

    configFiles.forEach(configFile => {
      const configPath = path.resolve(process.cwd(), configFile);
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          this.config = { ...this.config, ...config };
          console.log(`📄 已載入 ${configFile}`.gray);
        } catch (error) {
          console.warn(`⚠️  無法解析配置檔案 ${configFile}: ${error.message}`.yellow);
        }
      }
    });
  }

  // 驗證配置
  validateConfiguration() {
    const missing = [];
    const warnings = [];

    // 檢查必需的環境變數
    this.requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    });

    // 檢查可選的環境變數
    this.optionalVars.forEach(varName => {
      if (!process.env[varName]) {
        warnings.push(varName);
      }
    });

    if (missing.length > 0) {
      throw new Error(`缺少必需的環境變數: ${missing.join(', ')}`);
    }

    if (warnings.length > 0) {
      console.warn(`⚠️  建議設置環境變數: ${warnings.join(', ')}`.yellow);
    }

    // 驗證環境值
    this.validateEnvironmentValues();
  }

  // 驗證環境值
  validateEnvironmentValues() {
    const env = this.getCurrentEnvironment();
    
    if (!this.environments.includes(env)) {
      console.warn(`⚠️  未知的環境: ${env}`.yellow);
    }

    // 驗證端口
    const port = parseInt(process.env.APP_PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`無效的端口號: ${process.env.APP_PORT}`);
    }

    // 驗證 JWT Secret
    if (env === 'production' && process.env.JWT_SECRET.length < 32) {
      console.warn('⚠️  生產環境建議使用更長的 JWT Secret'.yellow);
    }

    // 驗證資料庫 URL
    if (process.env.DATABASE_URL && !this.isValidDatabaseURL(process.env.DATABASE_URL)) {
      console.warn('⚠️  資料庫 URL 格式可能不正確'.yellow);
    }
  }

  // 設置預設值
  setDefaults() {
    const defaults = {
      APP_HOST: '0.0.0.0',
      LOG_LEVEL: 'info',
      LOG_FILE: 'logs/fuco.log',
      CORS_ORIGIN: 'http://localhost:8847,http://localhost:3000',
      SESSION_SECRET: this.generateSecret(),
      ENABLE_MONITORING: 'true',
      ENABLE_REPORTS: 'true',
      MAX_REQUEST_SIZE: '10mb',
      REQUEST_TIMEOUT: '30000',
      RATE_LIMIT_WINDOW: '900000',
      RATE_LIMIT_MAX: '100'
    };

    Object.entries(defaults).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  }

  // 獲取當前環境
  getCurrentEnvironment() {
    return process.env.NODE_ENV || 'development';
  }

  // 檢查是否為生產環境
  isProduction() {
    return this.getCurrentEnvironment() === 'production';
  }

  // 檢查是否為開發環境
  isDevelopment() {
    return this.getCurrentEnvironment() === 'development';
  }

  // 檢查是否為測試環境
  isTesting() {
    return this.getCurrentEnvironment() === 'test';
  }

  // 獲取配置值
  get(key, defaultValue = null) {
    // 優先從環境變數獲取
    if (process.env[key] !== undefined) {
      return this.parseValue(process.env[key]);
    }

    // 從配置檔案獲取
    const configKeys = key.split('.');
    let value = this.config;
    
    for (const configKey of configKeys) {
      if (value && typeof value === 'object' && configKey in value) {
        value = value[configKey];
      } else {
        value = undefined;
        break;
      }
    }

    return value !== undefined ? value : defaultValue;
  }

  // 設置配置值
  set(key, value) {
    const configKeys = key.split('.');
    let config = this.config;

    for (let i = 0; i < configKeys.length - 1; i++) {
      const configKey = configKeys[i];
      if (!config[configKey] || typeof config[configKey] !== 'object') {
        config[configKey] = {};
      }
      config = config[configKey];
    }

    config[configKeys[configKeys.length - 1]] = value;
  }

  // 解析值類型
  parseValue(value) {
    if (typeof value !== 'string') {
      return value;
    }

    // 布爾值
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // 數字
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d*\.\d+$/.test(value)) return parseFloat(value);

    // JSON
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch (e) {
        // 如果解析失敗，返回原字串
      }
    }

    return value;
  }

  // 生成密鑰
  generateSecret(length = 64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 驗證資料庫 URL
  isValidDatabaseURL(url) {
    const dbUrlPattern = /^(postgresql|mysql|mongodb):\/\/.+/;
    return dbUrlPattern.test(url);
  }

  // 獲取伺服器配置
  getServerConfig() {
    return {
      port: this.get('APP_PORT', 8847),
      host: this.get('APP_HOST', '0.0.0.0'),
      cors: {
        origin: this.get('CORS_ORIGIN', 'http://localhost:8847').split(','),
        credentials: true
      },
      jwt: {
        secret: this.get('JWT_SECRET'),
        expiresIn: this.get('JWT_EXPIRES_IN', '8h')
      },
      rateLimit: {
        windowMs: this.get('RATE_LIMIT_WINDOW', 15 * 60 * 1000),
        max: this.get('RATE_LIMIT_MAX', 100)
      },
      requestTimeout: this.get('REQUEST_TIMEOUT', 30000),
      maxRequestSize: this.get('MAX_REQUEST_SIZE', '10mb')
    };
  }

  // 獲取資料庫配置
  getDatabaseConfig() {
    const databaseUrl = this.get('DATABASE_URL');
    
    if (databaseUrl) {
      return { connectionString: databaseUrl };
    }

    return {
      host: this.get('DB_HOST', 'localhost'),
      port: this.get('DB_PORT', 5432),
      database: this.get('DB_NAME', 'fuco_production'),
      username: this.get('DB_USER', 'postgres'),
      password: this.get('DB_PASSWORD', 'postgres'),
      ssl: this.isProduction()
    };
  }

  // 獲取日誌配置
  getLoggingConfig() {
    return {
      level: this.get('LOG_LEVEL', 'info'),
      file: this.get('LOG_FILE', 'logs/fuco.log'),
      console: !this.isProduction(),
      format: this.isProduction() ? 'json' : 'simple',
      maxFiles: this.get('LOG_MAX_FILES', 5),
      maxSize: this.get('LOG_MAX_SIZE', '10m')
    };
  }

  // 獲取功能開關
  getFeatureFlags() {
    return {
      monitoring: this.get('ENABLE_MONITORING', true),
      reports: this.get('ENABLE_REPORTS', true),
      qualityModule: this.get('ENABLE_QUALITY_MODULE', true),
      equipmentModule: this.get('ENABLE_EQUIPMENT_MODULE', true),
      materialsModule: this.get('ENABLE_MATERIALS_MODULE', false),
      debugging: !this.isProduction(),
      analytics: this.get('ENABLE_ANALYTICS', false)
    };
  }

  // 導出配置為 JSON
  exportConfig() {
    const config = {
      environment: this.getCurrentEnvironment(),
      server: this.getServerConfig(),
      database: this.getDatabaseConfig(),
      logging: this.getLoggingConfig(),
      features: this.getFeatureFlags(),
      custom: this.config
    };

    // 隱藏敏感信息
    const sanitized = JSON.parse(JSON.stringify(config));
    if (sanitized.server.jwt) {
      sanitized.server.jwt.secret = '[HIDDEN]';
    }
    if (sanitized.database.password) {
      sanitized.database.password = '[HIDDEN]';
    }

    return sanitized;
  }

  // 生成配置報告
  generateReport() {
    const report = [];
    
    report.push('📋 FUCO Production System - 環境配置報告');
    report.push('='.repeat(50));
    report.push(`🌍 環境: ${this.getCurrentEnvironment()}`);
    report.push(`🚀 服務器: ${this.get('APP_HOST')}:${this.get('APP_PORT')}`);
    report.push(`📊 監控: ${this.get('ENABLE_MONITORING') ? '啟用' : '停用'}`);
    report.push(`📈 報表: ${this.get('ENABLE_REPORTS') ? '啟用' : '停用'}`);
    report.push('');
    
    // 功能模組
    report.push('📦 功能模組:');
    const features = this.getFeatureFlags();
    Object.entries(features).forEach(([key, value]) => {
      report.push(`   ${value ? '✅' : '❌'} ${key}`);
    });
    report.push('');
    
    // 配置檔案
    report.push('📄 已載入的配置檔案:');
    const configFiles = [
      '.env',
      `.env.${this.getCurrentEnvironment()}`,
      'fuco.config.json'
    ];
    
    configFiles.forEach(file => {
      const exists = fs.existsSync(path.resolve(process.cwd(), file));
      report.push(`   ${exists ? '✅' : '❌'} ${file}`);
    });
    
    return report.join('\n');
  }

  // 驗證生產環境配置
  validateProductionConfig() {
    if (!this.isProduction()) {
      return { valid: true, issues: [] };
    }

    const issues = [];

    // 檢查 JWT Secret
    if (process.env.JWT_SECRET === 'fuco-production-system-secret-key-2024') {
      issues.push('使用預設 JWT Secret，不適合生產環境');
    }

    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      issues.push('JWT Secret 過短，建議至少 32 字符');
    }

    // 檢查資料庫配置
    if (!process.env.DATABASE_URL) {
      issues.push('生產環境未設置 DATABASE_URL');
    }

    // 檢查日誌配置
    if (this.get('LOG_LEVEL') === 'debug') {
      issues.push('生產環境不建議使用 debug 日誌級別');
    }

    // 檢查 CORS 配置
    const corsOrigin = this.get('CORS_ORIGIN', '');
    if (corsOrigin.includes('localhost')) {
      issues.push('生產環境 CORS 設置包含 localhost');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// 建立單例
const environmentManager = new EnvironmentManager();

module.exports = environmentManager;

// CLI 使用
if (require.main === module) {
  console.log(environmentManager.generateReport());
  
  if (environmentManager.isProduction()) {
    const validation = environmentManager.validateProductionConfig();
    if (!validation.valid) {
      console.log('\n⚠️  生產環境配置問題:'.yellow);
      validation.issues.forEach(issue => {
        console.log(`   • ${issue}`.red);
      });
    } else {
      console.log('\n✅ 生產環境配置驗證通過'.green);
    }
  }
}