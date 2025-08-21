#!/usr/bin/env node

/**
 * FUCO Production CLI - 命令行工具
 * 基於 mursfoto-cli 最佳實踐，提供豐富的開發者體驗
 */

const { Command } = require('commander');
const colors = require('colors');
const figlet = require('figlet');
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs');
const FucoDoctor = require('../src/utils/doctor');

const program = new Command();

// 版本和基本信息
program
  .name('fuco')
  .description('FUCO Production System CLI - 福桑聯合生產管理系統命令行工具')
  .version('1.0.0');

// 顯示歡迎訊息
function showWelcome() {
  console.log(figlet.textSync('FUCO CLI', { font: 'Small' }).cyan);
  console.log('福桑聯合生產管理系統 - 開發工具'.gray);
  console.log('='.repeat(50).cyan);
}

// Doctor 命令 - 系統診斷
program
  .command('doctor')
  .alias('dr')
  .description('🏥 執行系統健康檢查和診斷')
  .option('-v, --verbose', '顯示詳細信息')
  .option('-f, --fix', '自動修復檢測到的問題')
  .action(async (options) => {
    showWelcome();
    console.log('\n🔍 開始系統診斷...'.bold);
    
    const doctor = new FucoDoctor();
    const result = await doctor.runAllChecks();
    
    if (options.fix && (result.failed > 0 || result.warnings > 0)) {
      console.log('\n🔧 嘗試自動修復問題...'.yellow);
      await autoFix();
    }
  });

// Server 命令 - 服務器管理
program
  .command('server')
  .alias('s')
  .description('🚀 管理開發服務器')
  .option('-m, --mode <mode>', '啟動模式 (simple|full|docker)', 'simple')
  .option('-p, --port <port>', '指定端口', '8847')
  .option('-d, --detach', '在背景運行')
  .action(async (options) => {
    showWelcome();
    
    const { spawn } = require('child_process');
    
    let command, args;
    
    switch (options.mode) {
      case 'simple':
        command = 'node';
        args = ['src/backend/server-simple.js'];
        break;
      case 'full':
        command = 'node';
        args = ['src/backend/server.js'];
        break;
      case 'docker':
        command = 'docker-compose';
        args = ['up'];
        if (options.detach) args.push('-d');
        break;
      default:
        console.log('❌ 無效的啟動模式'.red);
        return;
    }

    console.log(`🚀 啟動服務器 (${options.mode} 模式)...`.green);
    
    const env = { ...process.env };
    if (options.port) {
      env.PORT = options.port;
    }
    
    const server = spawn(command, args, {
      stdio: options.detach ? 'ignore' : 'inherit',
      env,
      detached: options.detach
    });

    if (options.detach) {
      server.unref();
      console.log(`✅ 服務器已在背景啟動 (PID: ${server.pid})`.green);
      console.log(`🌐 訪問地址: http://localhost:${options.port}`.cyan);
    }
  });

// Test 命令 - 測試管理
program
  .command('test')
  .alias('t')
  .description('🧪 執行系統測試')
  .option('-t, --type <type>', '測試類型 (unit|integration|e2e|all)', 'all')
  .option('-c, --coverage', '生成測試覆蓋率報告')
  .option('-w, --watch', '監視模式')
  .action(async (options) => {
    showWelcome();
    console.log('\n🧪 執行測試...'.bold);
    
    const { spawn } = require('child_process');
    
    if (options.type === 'all' || options.type === 'integration') {
      console.log('🔄 執行系統完整測試...'.cyan);
      
      try {
        const testProcess = spawn('node', ['test-system-complete.js'], {
          stdio: 'inherit'
        });
        
        testProcess.on('close', (code) => {
          if (code === 0) {
            console.log('\n✅ 測試完成！'.green);
          } else {
            console.log('\n❌ 測試失敗！'.red);
          }
        });
      } catch (error) {
        console.log(`❌ 測試執行錯誤: ${error.message}`.red);
      }
    }
  });

// Init 命令 - 專案初始化
program
  .command('init')
  .description('🎯 初始化新的 FUCO 專案或重新配置現有專案')
  .option('-t, --template <template>', '使用指定模板')
  .action(async (options) => {
    showWelcome();
    console.log('\n🎯 專案初始化...'.bold);
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: '專案名稱:',
        default: 'fuco-production-system'
      },
      {
        type: 'input',
        name: 'companyName',
        message: '公司名稱:',
        default: '福桑聯合企業'
      },
      {
        type: 'list',
        name: 'environment',
        message: '目標環境:',
        choices: ['development', 'staging', 'production']
      },
      {
        type: 'checkbox',
        name: 'features',
        message: '選擇功能模組:',
        choices: [
          { name: '生產記錄管理', value: 'production', checked: true },
          { name: '品質管理', value: 'quality', checked: true },
          { name: '設備管理', value: 'equipment', checked: true },
          { name: '報表分析', value: 'reports', checked: true },
          { name: '即時監控', value: 'monitoring', checked: true },
          { name: '用戶管理', value: 'users', checked: false },
          { name: '物料管理', value: 'materials', checked: false }
        ]
      }
    ]);

    console.log('\n📝 生成配置檔案...'.yellow);
    
    // 生成環境配置
    const envContent = generateEnvFile(answers);
    fs.writeFileSync('.env.example', envContent);
    
    // 生成專案配置
    const configContent = generateProjectConfig(answers);
    fs.writeFileSync('fuco.config.json', configContent);
    
    console.log('✅ 專案初始化完成！'.green);
    console.log('\n📋 下一步:'.bold);
    console.log('1. 複製 .env.example 為 .env 並修改配置');
    console.log('2. 執行 fuco doctor 檢查系統狀態');
    console.log('3. 執行 fuco server 啟動開發服務器');
  });

// Dev 命令 - 開發工具
program
  .command('dev')
  .description('🛠️  開發工具和輔助功能')
  .action(async () => {
    showWelcome();
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '選擇開發工具:',
        choices: [
          { name: '📊 啟動監控界面', value: 'monitor' },
          { name: '🔄 重新載入服務器', value: 'reload' },
          { name: '📝 生成 API 文檔', value: 'docs' },
          { name: '🧹 清理快取和日誌', value: 'clean' },
          { name: '📦 打包前端資源', value: 'build' },
          { name: '🔍 檢查代碼品質', value: 'lint' }
        ]
      }
    ]);

    switch (action) {
      case 'monitor':
        console.log('📊 啟動監控界面...'.cyan);
        console.log('🌐 監控地址: http://localhost:8847/dashboard-live.html'.cyan);
        break;
      case 'reload':
        console.log('🔄 重新載入服務器...'.yellow);
        break;
      case 'docs':
        console.log('📝 生成 API 文檔...'.blue);
        await generateAPIDocs();
        break;
      case 'clean':
        console.log('🧹 清理快取和日誌...'.gray);
        break;
      case 'build':
        console.log('📦 打包前端資源...'.green);
        break;
      case 'lint':
        console.log('🔍 檢查代碼品質...'.magenta);
        break;
    }
  });

// Deploy 命令 - 部署管理
program
  .command('deploy')
  .description('🚀 部署到各種環境')
  .option('-e, --env <environment>', '目標環境', 'staging')
  .option('-f, --force', '強制部署')
  .action(async (options) => {
    showWelcome();
    console.log(`\n🚀 部署到 ${options.env} 環境...`.bold);
    
    // 部署前檢查
    console.log('🔍 執行部署前檢查...'.yellow);
    const doctor = new FucoDoctor();
    const healthResult = await doctor.runAllChecks();
    
    if (healthResult.failed > 0 && !options.force) {
      console.log('\n❌ 系統健康檢查未通過，部署已取消'.red);
      console.log('💡 使用 --force 標記強制部署'.gray);
      return;
    }
    
    console.log('\n📦 準備部署包...'.cyan);
    console.log('🐳 啟動 Docker 部署...'.blue);
    
    const { spawn } = require('child_process');
    const deployProcess = spawn('docker-compose', ['-f', 'deployment/docker/docker-compose.yml', 'up', '-d'], {
      stdio: 'inherit'
    });
    
    deployProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n🎉 部署成功！'.green);
        console.log('🌐 服務地址: http://localhost:3000'.cyan);
      } else {
        console.log('\n❌ 部署失敗！'.red);
      }
    });
  });

// 輔助函數
function generateEnvFile(config) {
  return `# FUCO Production System - 環境配置
# 專案: ${config.projectName}
# 公司: ${config.companyName}
# 環境: ${config.environment}

# 服務器配置
NODE_ENV=${config.environment}
APP_PORT=8847
APP_HOST=0.0.0.0

# JWT 配置
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=8h

# 資料庫配置 (可選)
# DATABASE_URL=postgresql://username:password@localhost:5432/fuco_production

# CORS 配置
CORS_ORIGIN=http://localhost:8847,http://localhost:3000

# 功能開關
ENABLE_MONITORING=true
ENABLE_REPORTS=true
ENABLE_QUALITY_MODULE=${config.features.includes('quality')}
ENABLE_EQUIPMENT_MODULE=${config.features.includes('equipment')}
ENABLE_MATERIALS_MODULE=${config.features.includes('materials')}

# 日誌配置
LOG_LEVEL=info
LOG_FILE=logs/fuco.log
`;
}

function generateProjectConfig(config) {
  return JSON.stringify({
    name: config.projectName,
    company: config.companyName,
    version: "1.0.0",
    environment: config.environment,
    features: config.features,
    createdAt: new Date().toISOString(),
    cli: {
      version: "1.0.0",
      commands: [
        "doctor",
        "server", 
        "test",
        "init",
        "dev",
        "deploy"
      ]
    },
    paths: {
      backend: "src/backend",
      frontend: "src/frontend",
      database: "database",
      tests: "tests",
      logs: "logs"
    },
    server: {
      defaultPort: 8847,
      defaultHost: "0.0.0.0"
    }
  }, null, 2);
}

async function generateAPIDocs() {
  const docsContent = `# FUCO Production System API 文檔

## 認證 API

### POST /api/auth/login
用戶登入

**請求體:**
\`\`\`json
{
  "username": "admin",
  "password": "admin123"
}
\`\`\`

**回應:**
\`\`\`json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
\`\`\`

### GET /api/auth/me
獲取當前用戶信息

**標頭:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

## 工作站 API

### GET /api/workstations
獲取工作站列表

### GET /api/workstations/:id
獲取特定工作站詳情

### POST /api/workstations/:id/select
選擇工作站

## 生產記錄 API

### GET /api/production/today-stats
獲取今日生產統計

### POST /api/production/records
提交生產記錄

## 報表 API

### GET /api/reports/stats
獲取報表統計數據

### GET /api/reports/production-trend
獲取生產趨勢數據

生成時間: ${new Date().toLocaleString('zh-TW')}
`;

  if (!fs.existsSync('docs')) {
    fs.mkdirSync('docs');
  }
  
  fs.writeFileSync('docs/API.md', docsContent);
  console.log('✅ API 文檔已生成: docs/API.md'.green);
}

async function autoFix() {
  const fixes = [
    {
      name: '創建 .env 檔案',
      condition: () => !fs.existsSync('.env') && fs.existsSync('.env.example'),
      fix: () => {
        fs.copyFileSync('.env.example', '.env');
        console.log('✅ 已創建 .env 檔案'.green);
      }
    },
    {
      name: '創建日誌目錄',
      condition: () => !fs.existsSync('logs'),
      fix: () => {
        fs.mkdirSync('logs');
        console.log('✅ 已創建 logs 目錄'.green);
      }
    },
    {
      name: '安裝缺失依賴',
      condition: () => !fs.existsSync('node_modules'),
      fix: () => {
        console.log('📦 安裝依賴中...'.yellow);
        const { execSync } = require('child_process');
        execSync('npm install', { stdio: 'inherit' });
        console.log('✅ 依賴安裝完成'.green);
      }
    }
  ];

  for (const fix of fixes) {
    if (fix.condition()) {
      try {
        await fix.fix();
      } catch (error) {
        console.log(`❌ 自動修復失敗 (${fix.name}): ${error.message}`.red);
      }
    }
  }
}

// 互動式啟動器
program
  .command('start')
  .description('🎯 互動式專案啟動器')
  .action(async () => {
    showWelcome();
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '您想要做什麼?',
        choices: [
          { name: '🏥 檢查系統健康狀態', value: 'doctor' },
          { name: '🚀 啟動開發服務器', value: 'server' },
          { name: '🧪 執行系統測試', value: 'test' },
          { name: '📊 查看系統監控', value: 'monitor' },
          { name: '🔧 配置專案設置', value: 'config' },
          { name: '📚 查看文檔', value: 'docs' }
        ]
      }
    ]);

    switch (action) {
      case 'doctor':
        program.parseAsync(['doctor'], { from: 'user' });
        break;
      case 'server':
        const { mode } = await inquirer.prompt([
          {
            type: 'list',
            name: 'mode',
            message: '選擇啟動模式:',
            choices: [
              { name: '🚀 簡單模式 (快速啟動)', value: 'simple' },
              { name: '⚡ 完整模式 (所有功能)', value: 'full' },
              { name: '🐳 Docker 模式', value: 'docker' }
            ]
          }
        ]);
        program.parseAsync(['server', '-m', mode], { from: 'user' });
        break;
      case 'test':
        program.parseAsync(['test'], { from: 'user' });
        break;
      case 'monitor':
        console.log('📊 開啟系統監控...'.cyan);
        console.log('🌐 監控地址: http://localhost:8847/dashboard-live.html'.cyan);
        const { spawn } = require('child_process');
        spawn('open', ['http://localhost:8847/dashboard-live.html'], { detached: true });
        break;
      case 'config':
        program.parseAsync(['init'], { from: 'user' });
        break;
      case 'docs':
        console.log('📚 開啟文檔...'.blue);
        if (fs.existsSync('docs/API.md')) {
          console.log('📖 API 文檔: docs/API.md'.blue);
        }
        if (fs.existsSync('README.md')) {
          console.log('📖 專案說明: README.md'.blue);
        }
        break;
    }
  });

// 錯誤處理
program.on('command:*', () => {
  console.log('❌ 無效命令'.red);
  console.log('💡 使用 fuco --help 查看可用命令'.gray);
  process.exit(1);
});

// 如果沒有參數，顯示互動式啟動器
if (process.argv.length === 2) {
  program.parseAsync(['start'], { from: 'user' });
} else {
  program.parse();
}