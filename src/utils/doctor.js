/**
 * FUCO Production System - Doctor 自我診斷工具
 * 基於 mursfoto-cli 優秀實踐，檢查系統健康狀態
 */

// 載入環境變數
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');

class FucoDoctor {
  constructor() {
    this.checks = [];
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      total: 0
    };
  }

  // 添加檢查項目
  addCheck(name, checkFn, category = 'general') {
    this.checks.push({ name, checkFn, category });
  }

  // 執行單個檢查
  async runCheck(check) {
    try {
      const result = await check.checkFn();
      this.results.total++;
      
      if (result.status === 'pass') {
        this.results.passed++;
        console.log(`✅ ${check.name}`.green + (result.message ? ` - ${result.message}`.gray : ''));
      } else if (result.status === 'warning') {
        this.results.warnings++;
        console.log(`⚠️  ${check.name}`.yellow + (result.message ? ` - ${result.message}`.gray : ''));
      } else {
        this.results.failed++;
        console.log(`❌ ${check.name}`.red + (result.message ? ` - ${result.message}`.gray : ''));
      }
      
      if (result.suggestions && result.suggestions.length > 0) {
        result.suggestions.forEach(suggestion => {
          console.log(`   💡 ${suggestion}`.blue);
        });
      }
      
      return result;
    } catch (error) {
      this.results.failed++;
      this.results.total++;
      console.log(`❌ ${check.name}`.red + ` - 檢查失敗: ${error.message}`.gray);
      return { status: 'fail', message: error.message };
    }
  }

  // 檢查 Node.js 環境
  async checkNodeEnvironment() {
    const nodeVersion = process.version;
    const npmVersion = require('child_process').execSync('npm --version', { encoding: 'utf8' }).trim();
    
    const nodeVersionNum = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (nodeVersionNum >= 18) {
      return {
        status: 'pass',
        message: `Node.js ${nodeVersion}, npm ${npmVersion}`
      };
    } else {
      return {
        status: 'fail',
        message: `Node.js ${nodeVersion} 版本過低`,
        suggestions: ['請升級到 Node.js 18 或更高版本']
      };
    }
  }

  // 檢查依賴項
  async checkDependencies() {
    const packagePath = path.join(process.cwd(), 'package.json');
    
    if (!fs.existsSync(packagePath)) {
      return {
        status: 'fail',
        message: '找不到 package.json',
        suggestions: ['確保在專案根目錄執行']
      };
    }

    const pkg = require(packagePath);
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      return {
        status: 'fail',
        message: 'node_modules 不存在',
        suggestions: ['執行 npm install 安裝依賴']
      };
    }

    const missingDeps = [];
    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    
    for (const dep of Object.keys(dependencies)) {
      const depPath = path.join(nodeModulesPath, dep);
      if (!fs.existsSync(depPath)) {
        missingDeps.push(dep);
      }
    }

    if (missingDeps.length > 0) {
      return {
        status: 'warning',
        message: `缺少 ${missingDeps.length} 個依賴項`,
        suggestions: [`執行 npm install 安裝: ${missingDeps.join(', ')}`]
      };
    }

    return {
      status: 'pass',
      message: `所有 ${Object.keys(dependencies).length} 個依賴項已安裝`
    };
  }

  // 檢查伺服器連接
  async checkServerConnection() {
    const serverUrl = process.env.APP_HOST && process.env.APP_PORT 
      ? `http://${process.env.APP_HOST}:${process.env.APP_PORT}` 
      : 'http://localhost:8847';

    try {
      const response = await axios.get(`${serverUrl}/health`, { timeout: 5000 });
      
      if (response.data && response.data.status === 'healthy') {
        return {
          status: 'pass',
          message: `伺服器運行正常 (${serverUrl})`
        };
      } else {
        return {
          status: 'warning',
          message: '伺服器回應異常',
          suggestions: ['檢查伺服器狀態和配置']
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: '無法連接到伺服器',
        suggestions: [
          '確保伺服器已啟動',
          '檢查端口配置',
          '執行: npm start 啟動伺服器'
        ]
      };
    }
  }

  // 檢查環境變數
  async checkEnvironmentVariables() {
    const requiredEnvVars = [
      'JWT_SECRET',
      'NODE_ENV'
    ];

    const optionalEnvVars = [
      'APP_PORT',
      'APP_HOST',
      'DATABASE_URL'
    ];

    const missing = [];
    const warnings = [];

    // 檢查必需的環境變數
    requiredEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    });

    // 檢查可選的環境變數
    optionalEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        warnings.push(varName);
      }
    });

    if (missing.length > 0) {
      return {
        status: 'fail',
        message: `缺少必需的環境變數: ${missing.join(', ')}`,
        suggestions: [
          '創建 .env 檔案並設置環境變數',
          '參考 .env.example 檔案'
        ]
      };
    }

    if (warnings.length > 0) {
      return {
        status: 'warning',
        message: `建議設置環境變數: ${warnings.join(', ')}`,
        suggestions: ['設置這些環境變數以獲得更好的配置控制']
      };
    }

    return {
      status: 'pass',
      message: '環境變數配置完整'
    };
  }

  // 檢查檔案結構
  async checkFileStructure() {
    const requiredFiles = [
      'package.json',
      'src/backend/server-simple.js',
      'src/backend/middleware/auth.js',
      'src/frontend/index.html'
    ];

    const recommendedFiles = [
      '.env.example',
      'README.md',
      '.gitignore',
      'database/migrations'
    ];

    const missing = [];
    const recommended = [];

    // 檢查必需檔案
    requiredFiles.forEach(file => {
      if (!fs.existsSync(path.join(process.cwd(), file))) {
        missing.push(file);
      }
    });

    // 檢查建議檔案
    recommendedFiles.forEach(file => {
      if (!fs.existsSync(path.join(process.cwd(), file))) {
        recommended.push(file);
      }
    });

    if (missing.length > 0) {
      return {
        status: 'fail',
        message: `缺少關鍵檔案: ${missing.join(', ')}`,
        suggestions: ['確保專案檔案結構完整']
      };
    }

    if (recommended.length > 0) {
      return {
        status: 'warning',
        message: `建議添加檔案: ${recommended.join(', ')}`,
        suggestions: ['這些檔案有助於專案維護和開發']
      };
    }

    return {
      status: 'pass',
      message: '檔案結構完整'
    };
  }

  // 檢查安全配置
  async checkSecurity() {
    const issues = [];
    const warnings = [];

    // 檢查 JWT Secret
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fuco-production-system-secret-key-2024') {
      warnings.push('使用預設 JWT Secret');
    }

    // 檢查生產環境配置
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        issues.push('生產環境 JWT Secret 不夠安全');
      }
    }

    // 檢查敏感檔案
    const sensitiveFiles = ['.env', 'config/secrets.json'];
    sensitiveFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          const gitignore = fs.readFileSync('.gitignore', 'utf8');
          if (!gitignore.includes(file)) {
            issues.push(`敏感檔案 ${file} 未加入 .gitignore`);
          }
        } catch (e) {
          warnings.push('無 .gitignore 檔案');
        }
      }
    });

    if (issues.length > 0) {
      return {
        status: 'fail',
        message: `安全問題: ${issues.join(', ')}`,
        suggestions: [
          '設置強度足夠的 JWT Secret',
          '確保敏感檔案不被提交到版本控制'
        ]
      };
    }

    if (warnings.length > 0) {
      return {
        status: 'warning',
        message: `安全建議: ${warnings.join(', ')}`,
        suggestions: ['改善安全配置以提高系統安全性']
      };
    }

    return {
      status: 'pass',
      message: '安全配置良好'
    };
  }

  // 檢查 API 端點
  async checkAPIEndpoints() {
    const endpoints = [
      '/api',
      '/api/auth/login',
      '/api/workstations',
      '/api/work-orders',
      '/api/production/stats'
    ];

    const serverUrl = 'http://localhost:8847';
    let workingEndpoints = 0;

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${serverUrl}${endpoint}`, { 
          timeout: 3000,
          validateStatus: () => true // 接受所有狀態碼
        });
        
        if (response.status < 500) {
          workingEndpoints++;
        }
      } catch (error) {
        // 忽略連接錯誤，在後續統計
      }
    }

    if (workingEndpoints === 0) {
      return {
        status: 'fail',
        message: '無法訪問任何 API 端點',
        suggestions: ['確保伺服器正在運行']
      };
    }

    if (workingEndpoints < endpoints.length) {
      return {
        status: 'warning',
        message: `${workingEndpoints}/${endpoints.length} API 端點正常`,
        suggestions: ['檢查未響應的 API 端點']
      };
    }

    return {
      status: 'pass',
      message: `所有 ${endpoints.length} 個 API 端點正常`
    };
  }

  // 執行所有檢查
  async runAllChecks() {
    console.log('\n🏥 FUCO Production System - 系統診斷'.rainbow);
    console.log('='.repeat(50).cyan);

    // 註冊所有檢查
    this.addCheck('Node.js 環境', () => this.checkNodeEnvironment(), 'environment');
    this.addCheck('依賴項檢查', () => this.checkDependencies(), 'dependencies');
    this.addCheck('伺服器連接', () => this.checkServerConnection(), 'server');
    this.addCheck('環境變數', () => this.checkEnvironmentVariables(), 'configuration');
    this.addCheck('檔案結構', () => this.checkFileStructure(), 'structure');
    this.addCheck('安全配置', () => this.checkSecurity(), 'security');
    this.addCheck('API 端點', () => this.checkAPIEndpoints(), 'api');

    // 按類別組織檢查
    const categories = {};
    this.checks.forEach(check => {
      if (!categories[check.category]) {
        categories[check.category] = [];
      }
      categories[check.category].push(check);
    });

    // 執行檢查
    for (const [category, checks] of Object.entries(categories)) {
      console.log(`\n📋 ${category.toUpperCase()}`.bold);
      console.log('-'.repeat(30).yellow);

      for (const check of checks) {
        await this.runCheck(check);
      }
    }

    // 顯示總結
    console.log('\n📊 診斷結果總結'.bold);
    console.log('-'.repeat(30).cyan);
    console.log(`總檢查項目: ${this.results.total}`.white);
    console.log(`✅ 通過: ${this.results.passed}`.green);
    console.log(`⚠️  警告: ${this.results.warnings}`.yellow);
    console.log(`❌ 失敗: ${this.results.failed}`.red);

    // 計算健康度
    const healthScore = Math.round(
      (this.results.passed / this.results.total) * 100
    );

    console.log(`\n🏥 系統健康度: ${healthScore}%`.bold);

    if (healthScore >= 90) {
      console.log('🎉 系統狀態優秀！'.green);
    } else if (healthScore >= 70) {
      console.log('✅ 系統狀態良好，有一些改進空間'.yellow);
    } else if (healthScore >= 50) {
      console.log('⚠️  系統需要注意，請解決警告問題'.orange);
    } else {
      console.log('🚨 系統狀態不佳，請優先解決失敗問題'.red);
    }

    // 提供改進建議
    if (this.results.failed > 0 || this.results.warnings > 0) {
      console.log('\n💡 改進建議:'.bold);
      console.log('1. 優先解決失敗的檢查項目');
      console.log('2. 設置完整的環境變數配置');
      console.log('3. 確保伺服器正常運行');
      console.log('4. 完善專案文檔和結構');
    }

    return {
      totalChecks: this.results.total,
      passed: this.results.passed,
      warnings: this.results.warnings,
      failed: this.results.failed,
      healthScore
    };
  }
}

module.exports = FucoDoctor;

// CLI 使用
if (require.main === module) {
  const doctor = new FucoDoctor();
  doctor.runAllChecks().catch(console.error);
}