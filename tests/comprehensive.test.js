/**
 * FUCO Production System - 綜合測試套件
 * 基於 mursfoto-cli 最佳實踐，提供 100% 測試覆蓋率目標
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const FucoDoctor = require('../src/utils/doctor');

// 測試配置
const TEST_CONFIG = {
  timeout: 10000,
  apiBase: 'http://localhost:8847',
  testCredentials: {
    admin: { username: 'admin', password: 'admin123' },
    operator: { username: 'emp001', password: 'password' },
    supervisor: { username: 'supervisor', password: 'super123' },
    qc: { username: 'qc001', password: 'qc123' }
  }
};

// 測試狀態追踪
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  coverage: {
    statements: 0,
    branches: 0,
    functions: 0,
    lines: 0
  }
};

let authTokens = {};
let app;

// 輔助函數
function logTest(name, status, details = '') {
  testResults.total++;
  if (status === 'pass') {
    testResults.passed++;
    console.log(`✅ ${name}`.green + (details ? ` - ${details}`.gray : ''));
  } else if (status === 'fail') {
    testResults.failed++;
    console.log(`❌ ${name}`.red + (details ? ` - ${details}`.gray : ''));
  } else {
    testResults.skipped++;
    console.log(`⚠️  ${name}`.yellow + (details ? ` - ${details}`.gray : ''));
  }
}

function logSection(title) {
  console.log(`\n${'='.repeat(60)}`.cyan);
  console.log(`${title}`.cyan.bold);
  console.log(`${'='.repeat(60)}`.cyan);
}

// 設置和清理
async function setupTests() {
  console.log('🔧 設置測試環境...'.blue);
  
  // 載入應用
  try {
    app = require('../src/backend/server-simple.js');
    logTest('載入應用模組', 'pass');
  } catch (error) {
    logTest('載入應用模組', 'fail', error.message);
    return false;
  }

  // 等待伺服器啟動
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return true;
}

async function teardownTests() {
  console.log('\n🧹 清理測試環境...'.blue);
  // 這裡可以添加清理邏輯
}

// ================================
// 1. 認證系統測試
// ================================
async function testAuthentication() {
  logSection('🔐 認證系統測試');
  
  const authTests = [
    {
      name: '管理員登入成功',
      test: async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send(TEST_CONFIG.testCredentials.admin)
          .expect(200);
        
        if (response.body.success && response.body.token) {
          authTokens.admin = response.body.token;
          return { success: true, message: `Token: ${response.body.token.substring(0, 20)}...` };
        }
        throw new Error('登入失敗或未返回 token');
      }
    },
    {
      name: '操作員登入成功',
      test: async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send(TEST_CONFIG.testCredentials.operator)
          .expect(200);
        
        if (response.body.success && response.body.token) {
          authTokens.operator = response.body.token;
          return { success: true, message: `用戶: ${response.body.user.username}` };
        }
        throw new Error('登入失敗');
      }
    },
    {
      name: '無效憑證登入失敗',
      test: async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ username: 'invalid', password: 'invalid' })
          .expect(401);
        
        if (!response.body.success) {
          return { success: true, message: '正確拒絕無效憑證' };
        }
        throw new Error('應該拒絕無效憑證');
      }
    },
    {
      name: '獲取用戶資訊',
      test: async () => {
        if (!authTokens.admin) throw new Error('需要管理員 token');
        
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${authTokens.admin}`)
          .expect(200);
        
        if (response.body.success && response.body.user) {
          return { success: true, message: `用戶: ${response.body.user.username}` };
        }
        throw new Error('無法獲取用戶資訊');
      }
    },
    {
      name: 'Token 刷新',
      test: async () => {
        if (!authTokens.admin) throw new Error('需要管理員 token');
        
        const response = await request(app)
          .post('/api/auth/refresh')
          .set('Authorization', `Bearer ${authTokens.admin}`)
          .expect(200);
        
        if (response.body.success && response.body.token) {
          return { success: true, message: '成功刷新 token' };
        }
        throw new Error('Token 刷新失敗');
      }
    },
    {
      name: '無效 Token 拒絕',
      test: async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
        
        if (!response.body.success) {
          return { success: true, message: '正確拒絕無效 token' };
        }
        throw new Error('應該拒絕無效 token');
      }
    }
  ];

  for (const test of authTests) {
    try {
      const result = await test.test();
      logTest(test.name, 'pass', result.message);
    } catch (error) {
      logTest(test.name, 'fail', error.message);
    }
  }
}

// ================================
// 2. API 端點測試
// ================================
async function testAPIEndpoints() {
  logSection('🚀 API 端點測試');
  
  const endpointTests = [
    {
      name: '健康檢查端點',
      test: async () => {
        const response = await request(app)
          .get('/health')
          .expect(200);
        
        if (response.body.status === 'healthy') {
          return { success: true, message: `運行時間: ${response.body.uptime}s` };
        }
        throw new Error('健康檢查失敗');
      }
    },
    {
      name: 'API 資訊端點',
      test: async () => {
        const response = await request(app)
          .get('/api')
          .expect(200);
        
        if (response.body.status === 'operational') {
          return { success: true, message: `版本: ${response.body.version}` };
        }
        throw new Error('API 資訊獲取失敗');
      }
    },
    {
      name: '工作站列表端點',
      test: async () => {
        const response = await request(app)
          .get('/api/workstations')
          .expect(200);
        
        if (response.body.success && Array.isArray(response.body.data)) {
          return { success: true, message: `工作站數量: ${response.body.data.length}` };
        }
        throw new Error('工作站列表獲取失敗');
      }
    },
    {
      name: '特定工作站詳情',
      test: async () => {
        const response = await request(app)
          .get('/api/workstations/A')
          .expect(200);
        
        if (response.body.success && response.body.data.id === 'A') {
          return { success: true, message: `工作站: ${response.body.data.name}` };
        }
        throw new Error('工作站詳情獲取失敗');
      }
    },
    {
      name: '工單列表端點',
      test: async () => {
        const response = await request(app)
          .get('/api/work-orders')
          .expect(200);
        
        if (response.body.success && Array.isArray(response.body.data)) {
          return { success: true, message: `工單數量: ${response.body.data.length}` };
        }
        throw new Error('工單列表獲取失敗');
      }
    },
    {
      name: 'SOP 詳情端點',
      test: async () => {
        const response = await request(app)
          .get('/api/sop/SOP-A-001')
          .expect(200);
        
        if (response.body.success && response.body.data.id === 'SOP-A-001') {
          return { success: true, message: `SOP: ${response.body.data.title}` };
        }
        throw new Error('SOP 詳情獲取失敗');
      }
    },
    {
      name: '設備配置端點',
      test: async () => {
        const response = await request(app)
          .get('/api/workstations/A/equipment')
          .expect(200);
        
        if (response.body.success && Array.isArray(response.body.data)) {
          return { success: true, message: `設備數量: ${response.body.data.length}` };
        }
        throw new Error('設備配置獲取失敗');
      }
    },
    {
      name: '404 錯誤處理',
      test: async () => {
        const response = await request(app)
          .get('/api/nonexistent')
          .expect(404);
        
        if (response.body.error === 'Not Found') {
          return { success: true, message: '正確處理 404 錯誤' };
        }
        throw new Error('404 錯誤處理不正確');
      }
    }
  ];

  for (const test of endpointTests) {
    try {
      const result = await test.test();
      logTest(test.name, 'pass', result.message);
    } catch (error) {
      logTest(test.name, 'fail', error.message);
    }
  }
}

// ================================
// 3. 生產記錄系統測試
// ================================
async function testProductionRecords() {
  logSection('📋 生產記錄系統測試');
  
  const productionTests = [
    {
      name: '今日生產統計',
      test: async () => {
        const response = await request(app)
          .get('/api/production/today-stats')
          .expect(200);
        
        if (response.body.success && response.body.data.completedCount !== undefined) {
          return { success: true, message: `完成數量: ${response.body.data.completedCount}` };
        }
        throw new Error('今日統計獲取失敗');
      }
    },
    {
      name: '生產工單列表',
      test: async () => {
        const response = await request(app)
          .get('/api/production/work-orders')
          .expect(200);
        
        if (response.body.success && Array.isArray(response.body.data)) {
          return { success: true, message: `可用工單: ${response.body.data.length}` };
        }
        throw new Error('生產工單列表獲取失敗');
      }
    },
    {
      name: '品質檢查項目',
      test: async () => {
        const response = await request(app)
          .get('/api/production/work-orders/WO-2024-001/quality-checks')
          .expect(200);
        
        if (response.body.success && Array.isArray(response.body.data)) {
          return { success: true, message: `檢查項目: ${response.body.data.length}` };
        }
        throw new Error('品質檢查項目獲取失敗');
      }
    },
    {
      name: '提交生產記錄 (需認證)',
      test: async () => {
        if (!authTokens.admin) throw new Error('需要管理員 token');
        
        const recordData = {
          workOrderId: 'WO-2024-001',
          completedQuantity: 25,
          defectQuantity: 2,
          qualityChecks: [
            { id: 'QC-001', passed: true },
            { id: 'QC-002', passed: true }
          ],
          operatorNotes: '測試提交記錄'
        };
        
        const response = await request(app)
          .post('/api/production/records')
          .set('Authorization', `Bearer ${authTokens.admin}`)
          .send(recordData)
          .expect(200);
        
        if (response.body.success && response.body.data.id) {
          return { success: true, message: `記錄 ID: ${response.body.data.id}` };
        }
        throw new Error('生產記錄提交失敗');
      }
    },
    {
      name: '獲取生產記錄歷史',
      test: async () => {
        if (!authTokens.admin) throw new Error('需要管理員 token');
        
        const response = await request(app)
          .get('/api/production/records')
          .set('Authorization', `Bearer ${authTokens.admin}`)
          .expect(200);
        
        if (response.body.success && Array.isArray(response.body.data)) {
          return { success: true, message: `歷史記錄: ${response.body.data.length}` };
        }
        throw new Error('生產記錄歷史獲取失敗');
      }
    },
    {
      name: '無認證提交記錄失敗',
      test: async () => {
        const response = await request(app)
          .post('/api/production/records')
          .send({ workOrderId: 'test', completedQuantity: 1 })
          .expect(401);
        
        if (!response.body.success) {
          return { success: true, message: '正確要求認證' };
        }
        throw new Error('應該要求認證');
      }
    }
  ];

  for (const test of productionTests) {
    try {
      const result = await test.test();
      logTest(test.name, 'pass', result.message);
    } catch (error) {
      logTest(test.name, 'fail', error.message);
    }
  }
}

// ================================
// 4. 報表系統測試
// ================================
async function testReportsSystem() {
  logSection('📊 報表系統測試');
  
  const reportTests = [
    {
      name: '報表統計數據',
      test: async () => {
        const response = await request(app)
          .get('/api/reports/stats?timeRange=week&department=all')
          .expect(200);
        
        if (response.body.success && response.body.data.efficiency) {
          return { success: true, message: `整體效率: ${response.body.data.efficiency.overall}%` };
        }
        throw new Error('報表統計數據獲取失敗');
      }
    },
    {
      name: '生產趨勢圖表數據',
      test: async () => {
        const response = await request(app)
          .get('/api/reports/production-trend?timeRange=week')
          .expect(200);
        
        if (response.body.success && response.body.data.datasets) {
          return { success: true, message: `數據集: ${response.body.data.datasets.length}` };
        }
        throw new Error('生產趨勢數據獲取失敗');
      }
    },
    {
      name: '品質分析圖表數據',
      test: async () => {
        const response = await request(app)
          .get('/api/reports/quality-analysis?timeRange=week')
          .expect(200);
        
        if (response.body.success && response.body.data.chart) {
          return { success: true, message: `品質指標: ${response.body.data.metrics.qualityScore}` };
        }
        throw new Error('品質分析數據獲取失敗');
      }
    },
    {
      name: '工作站效率報表',
      test: async () => {
        const response = await request(app)
          .get('/api/reports/workstation-efficiency?timeRange=week&department=all')
          .expect(200);
        
        if (response.body.success && Array.isArray(response.body.data)) {
          const avgEff = response.body.summary?.avgEfficiency?.toFixed(1) || '0';
          return { success: true, message: `平均效率: ${avgEff}%` };
        }
        throw new Error('工作站效率報表獲取失敗');
      }
    },
    {
      name: '歷史數據查詢',
      test: async () => {
        const response = await request(app)
          .get('/api/reports/historical-data?startDate=2024-08-01&endDate=2024-08-13&type=production')
          .expect(200);
        
        if (response.body.success && Array.isArray(response.body.data)) {
          return { success: true, message: `數據點: ${response.body.data.length}` };
        }
        throw new Error('歷史數據查詢失敗');
      }
    },
    {
      name: '報表導出功能',
      test: async () => {
        const response = await request(app)
          .post('/api/reports/export')
          .send({ type: 'production-trend', format: 'excel', timeRange: 'week' })
          .expect(200);
        
        if (response.body.success && response.body.exportId) {
          return { success: true, message: `導出 ID: ${response.body.exportId}` };
        }
        throw new Error('報表導出失敗');
      }
    }
  ];

  for (const test of reportTests) {
    try {
      const result = await test.test();
      logTest(test.name, 'pass', result.message);
    } catch (error) {
      logTest(test.name, 'fail', error.message);
    }
  }
}

// ================================
// 5. 權限和角色測試
// ================================
async function testPermissionsAndRoles() {
  logSection('👥 權限和角色測試');
  
  const permissionTests = [
    {
      name: '管理員完整權限',
      test: async () => {
        if (!authTokens.admin) throw new Error('需要管理員 token');
        
        const response = await request(app)
          .get('/api/production/records')
          .set('Authorization', `Bearer ${authTokens.admin}`)
          .expect(200);
        
        if (response.body.success) {
          return { success: true, message: '管理員可訪問所有資源' };
        }
        throw new Error('管理員權限測試失敗');
      }
    },
    {
      name: '操作員限制權限',
      test: async () => {
        if (!authTokens.operator) {
          // 先登入操作員
          const loginResponse = await request(app)
            .post('/api/auth/login')
            .send(TEST_CONFIG.testCredentials.operator)
            .expect(200);
          authTokens.operator = loginResponse.body.token;
        }
        
        const response = await request(app)
          .post('/api/production/records')
          .set('Authorization', `Bearer ${authTokens.operator}`)
          .send({
            workOrderId: 'WO-2024-001',
            completedQuantity: 10,
            defectQuantity: 0
          })
          .expect(200);
        
        if (response.body.success) {
          return { success: true, message: '操作員可提交生產記錄' };
        }
        throw new Error('操作員權限測試失敗');
      }
    },
    {
      name: '工作站選擇權限',
      test: async () => {
        const response = await request(app)
          .post('/api/workstations/A/select')
          .send({ operatorId: 'EMP001', operatorName: '測試操作員' })
          .expect(200);
        
        if (response.body.success) {
          return { success: true, message: `選擇工作站: ${response.body.data.workstationId}` };
        }
        throw new Error('工作站選擇失敗');
      }
    }
  ];

  for (const test of permissionTests) {
    try {
      const result = await test.test();
      logTest(test.name, 'pass', result.message);
    } catch (error) {
      logTest(test.name, 'fail', error.message);
    }
  }
}

// ================================
// 6. 錯誤處理和邊界測試
// ================================
async function testErrorHandlingAndEdgeCases() {
  logSection('🛡️ 錯誤處理和邊界測試');
  
  const errorTests = [
    {
      name: '無效 JSON 請求',
      test: async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .set('Content-Type', 'application/json')
          .send('{"invalid": json}')
          .expect(400);
        
        return { success: true, message: '正確處理無效 JSON' };
      }
    },
    {
      name: '缺少必需參數',
      test: async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({})
          .expect(400);
        
        if (response.body.code === 'MISSING_CREDENTIALS') {
          return { success: true, message: '正確驗證必需參數' };
        }
        throw new Error('參數驗證失敗');
      }
    },
    {
      name: '不存在的資源',
      test: async () => {
        const response = await request(app)
          .get('/api/workstations/NONEXISTENT')
          .expect(404);
        
        if (!response.body.success) {
          return { success: true, message: '正確處理不存在資源' };
        }
        throw new Error('應該返回 404');
      }
    },
    {
      name: '超大請求負載',
      test: async () => {
        const largeData = 'x'.repeat(10000);
        const response = await request(app)
          .post('/api/auth/login')
          .send({ username: 'admin', password: largeData })
          .expect(401); // 應該被認證失敗而不是因為大小失敗
        
        return { success: true, message: '處理大型請求負載' };
      }
    },
    {
      name: 'CORS 處理',
      test: async () => {
        const response = await request(app)
          .options('/api/workstations')
          .set('Origin', 'http://localhost:3000')
          .expect(204);
        
        return { success: true, message: '正確處理 CORS 預檢請求' };
      }
    }
  ];

  for (const test of errorTests) {
    try {
      const result = await test.test();
      logTest(test.name, 'pass', result.message);
    } catch (error) {
      logTest(test.name, 'fail', error.message);
    }
  }
}

// ================================
// 7. 整合測試
// ================================
async function testIntegration() {
  logSection('🔗 系統整合測試');
  
  const integrationTests = [
    {
      name: '完整生產流程',
      test: async () => {
        if (!authTokens.admin) throw new Error('需要管理員 token');
        
        // 1. 獲取工作站列表
        const workstationsResponse = await request(app)
          .get('/api/workstations')
          .expect(200);
        
        // 2. 選擇工作站
        const selectResponse = await request(app)
          .post('/api/workstations/A/select')
          .send({ operatorId: 'EMP001', operatorName: '測試操作員' })
          .expect(200);
        
        // 3. 獲取工單
        const workOrdersResponse = await request(app)
          .get('/api/production/work-orders')
          .expect(200);
        
        // 4. 提交生產記錄
        const recordResponse = await request(app)
          .post('/api/production/records')
          .set('Authorization', `Bearer ${authTokens.admin}`)
          .send({
            workOrderId: 'WO-2024-001',
            completedQuantity: 30,
            defectQuantity: 1
          })
          .expect(200);
        
        if (workstationsResponse.body.success && 
            selectResponse.body.success && 
            workOrdersResponse.body.success && 
            recordResponse.body.success) {
          return { success: true, message: '完整生產流程測試通過' };
        }
        throw new Error('生產流程整合測試失敗');
      }
    },
    {
      name: '報表生成流程',
      test: async () => {
        // 1. 獲取統計數據
        const statsResponse = await request(app)
          .get('/api/reports/stats')
          .expect(200);
        
        // 2. 獲取趨勢數據
        const trendResponse = await request(app)
          .get('/api/reports/production-trend')
          .expect(200);
        
        // 3. 導出報表
        const exportResponse = await request(app)
          .post('/api/reports/export')
          .send({ type: 'production-trend', format: 'excel' })
          .expect(200);
        
        if (statsResponse.body.success && 
            trendResponse.body.success && 
            exportResponse.body.success) {
          return { success: true, message: '報表生成流程測試通過' };
        }
        throw new Error('報表生成流程測試失敗');
      }
    },
    {
      name: 'Doctor 系統診斷',
      test: async () => {
        const doctor = new FucoDoctor();
        const result = await doctor.runAllChecks();
        
        if (result.healthScore >= 70) {
          return { success: true, message: `系統健康度: ${result.healthScore}%` };
        }
        throw new Error(`系統健康度不足: ${result.healthScore}%`);
      }
    }
  ];

  for (const test of integrationTests) {
    try {
      const result = await test.test();
      logTest(test.name, 'pass', result.message);
    } catch (error) {
      logTest(test.name, 'fail', error.message);
    }
  }
}

// ================================
// 主測試執行器
// ================================
async function runAllTests() {
  console.log('🧪 FUCO Production System - 綜合測試套件'.rainbow);
  console.log('='.repeat(60).cyan);
  console.log(`測試開始時間: ${new Date().toLocaleString('zh-TW')}`.gray);
  console.log(`目標: 100% 功能覆蓋率`.bold);
  
  const startTime = Date.now();
  
  // 設置測試環境
  const setupSuccess = await setupTests();
  if (!setupSuccess) {
    console.log('❌ 測試環境設置失敗，中止測試'.red);
    process.exit(1);
  }
  
  try {
    // 執行所有測試套件
    await testAuthentication();
    await testAPIEndpoints();
    await testProductionRecords();
    await testReportsSystem();
    await testPermissionsAndRoles();
    await testErrorHandlingAndEdgeCases();
    await testIntegration();
    
  } catch (error) {
    console.error(`❌ 測試執行錯誤: ${error.message}`.red);
  } finally {
    await teardownTests();
  }
  
  // 計算測試結果
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  logSection('📊 測試結果總結');
  
  console.log(`總測試數量: ${testResults.total}`.cyan);
  console.log(`✅ 通過: ${testResults.passed}`.green);
  console.log(`❌ 失敗: ${testResults.failed}`.red);
  console.log(`⚠️  跳過: ${testResults.skipped}`.yellow);
  console.log(`⏱️  執行時間: ${duration}秒`.gray);
  
  const successRate = testResults.total > 0 ? 
    ((testResults.passed / testResults.total) * 100).toFixed(1) : 0;
  console.log(`🎯 成功率: ${successRate}%`.magenta);
  
  // 覆蓋率估算 (基於通過的測試)
  const estimatedCoverage = Math.min(95, Math.round(successRate * 0.9));
  console.log(`📈 預估覆蓋率: ${estimatedCoverage}%`.blue);
  
  // 結果評估
  if (testResults.failed === 0) {
    console.log('\n🎉 所有測試通過！系統品質優秀！'.rainbow);
  } else if (successRate >= 90) {
    console.log('\n✅ 大部分測試通過，系統品質良好'.green);
  } else if (successRate >= 70) {
    console.log('\n⚠️  部分測試失敗，需要改進'.yellow);
  } else {
    console.log('\n🚨 測試失敗率過高，需要優先修復'.red);
  }
  
  // 生成測試報告
  generateTestReport(duration, successRate, estimatedCoverage);
  
  return {
    total: testResults.total,
    passed: testResults.passed,
    failed: testResults.failed,
    successRate,
    estimatedCoverage,
    duration
  };
}

// 生成測試報告
function generateTestReport(duration, successRate, coverage) {
  const report = {
    timestamp: new Date().toISOString(),
    duration: parseFloat(duration),
    results: testResults,
    successRate: parseFloat(successRate),
    estimatedCoverage: coverage,
    environment: process.env.NODE_ENV || 'test',
    recommendations: []
  };
  
  // 添加建議
  if (testResults.failed > 0) {
    report.recommendations.push('優先修復失敗的測試用例');
  }
  if (successRate < 95) {
    report.recommendations.push('增加更多邊界測試用例');
  }
  if (coverage < 90) {
    report.recommendations.push('增加代碼覆蓋率測試工具');
  }
  
  // 保存報告
  const reportPath = path.join(__dirname, '..', 'test-reports', `test-report-${Date.now()}.json`);
  
  // 確保目錄存在
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 測試報告已保存: ${reportPath}`.blue);
}

// 執行測試
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('測試執行錯誤:'.red, error.message);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testResults
};