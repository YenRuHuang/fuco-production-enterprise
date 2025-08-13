/**
 * FUCO Production System - 系統功能完整測試
 * 測試報表中心、即時監控看板和所有核心功能
 */

const axios = require('axios');
const colors = require('colors');

const API_BASE = 'http://localhost:8847';

// 測試配置
const TEST_CONFIG = {
    timeout: 5000,
    credentials: {
        admin: { username: 'admin', password: 'admin123' },
        operator: { username: 'emp001', password: 'password' },
        supervisor: { username: 'supervisor', password: 'super123' },
        qc: { username: 'qc001', password: 'qc123' }
    }
};

let authToken = null;
let testResults = {
    passed: 0,
    failed: 0,
    total: 0
};

// 測試工具函數
function logTest(name, status, details = '') {
    testResults.total++;
    if (status) {
        testResults.passed++;
        console.log(`✅ ${name}`.green + (details ? ` - ${details}`.gray : ''));
    } else {
        testResults.failed++;
        console.log(`❌ ${name}`.red + (details ? ` - ${details}`.gray : ''));
    }
}

function logSection(title) {
    console.log(`\n${'='.repeat(60)}`.cyan);
    console.log(`${title}`.cyan.bold);
    console.log(`${'='.repeat(60)}`.cyan);
}

function logSubSection(title) {
    console.log(`\n${'-'.repeat(40)}`.yellow);
    console.log(`${title}`.yellow.bold);
    console.log(`${'-'.repeat(40)}`.yellow);
}

async function makeRequest(method, endpoint, data = null, useAuth = false) {
    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (useAuth && authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const config = {
            method,
            url: `${API_BASE}${endpoint}`,
            headers,
            timeout: TEST_CONFIG.timeout
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return response.data;
    } catch (error) {
        throw new Error(`${error.response?.status || 'NETWORK'}: ${error.response?.data?.message || error.message}`);
    }
}

// 測試認證系統
async function testAuthentication() {
    logSection('🔐 認證系統測試');
    
    try {
        // 測試登入
        const loginResult = await makeRequest('POST', '/api/auth/login', TEST_CONFIG.credentials.admin);
        logTest('管理員登入', loginResult.success, `Token: ${loginResult.token ? '已獲取' : '未獲取'}`);
        
        if (loginResult.token) {
            authToken = loginResult.token;
        }
        
        // 測試用戶資訊獲取
        const userInfo = await makeRequest('GET', '/api/auth/me', null, true);
        logTest('用戶資訊獲取', userInfo.success, `用戶: ${userInfo.user?.username}`);
        
        // 測試Token刷新
        const refreshResult = await makeRequest('POST', '/api/auth/refresh', null, true);
        logTest('Token刷新', refreshResult.success, 'Token刷新成功');
        
    } catch (error) {
        logTest('認證系統', false, error.message);
    }
}

// 測試基礎API
async function testBasicAPIs() {
    logSection('🏗️ 基礎API測試');
    
    try {
        // 健康檢查
        const health = await makeRequest('GET', '/health');
        logTest('健康檢查', health.status === 'healthy', `狀態: ${health.status}`);
        
        // API資訊
        const apiInfo = await makeRequest('GET', '/api');
        logTest('API資訊', apiInfo.status === 'operational', `版本: ${apiInfo.version}`);
        
        // 工作站列表
        const workstations = await makeRequest('GET', '/api/workstations');
        logTest('工作站列表', workstations.success && Array.isArray(workstations.data), 
                `工作站數量: ${workstations.data?.length || 0}`);
        
        // 工單列表
        const workOrders = await makeRequest('GET', '/api/work-orders');
        logTest('工單列表', workOrders.success && Array.isArray(workOrders.data), 
                `工單數量: ${workOrders.data?.length || 0}`);
        
    } catch (error) {
        logTest('基礎API', false, error.message);
    }
}

// 測試生產記錄功能
async function testProductionRecords() {
    logSection('📋 生產記錄功能測試');
    
    try {
        // 測試今日統計
        const todayStats = await makeRequest('GET', '/api/production/today-stats');
        logTest('今日生產統計', todayStats.success, 
                `完成數量: ${todayStats.data?.completedCount || 0}`);
        
        // 測試工單列表（生產記錄用）
        const productionWorkOrders = await makeRequest('GET', '/api/production/work-orders');
        logTest('生產工單列表', productionWorkOrders.success && Array.isArray(productionWorkOrders.data),
                `可用工單: ${productionWorkOrders.data?.length || 0}`);
        
        // 測試品質檢查項目
        const qualityChecks = await makeRequest('GET', '/api/production/work-orders/WO-2024-001/quality-checks');
        logTest('品質檢查項目', qualityChecks.success && Array.isArray(qualityChecks.data),
                `檢查項目: ${qualityChecks.data?.length || 0}`);
        
        // 測試生產記錄提交（需要認證）
        if (authToken) {
            const recordData = {
                workOrderId: 'WO-2024-001',
                completedQuantity: 10,
                defectQuantity: 1,
                qualityChecks: [
                    { id: 'QC-001', passed: true },
                    { id: 'QC-002', passed: true }
                ],
                operatorNotes: '測試記錄提交'
            };
            
            const recordResult = await makeRequest('POST', '/api/production/records', recordData, true);
            logTest('生產記錄提交', recordResult.success, 
                    `記錄ID: ${recordResult.data?.id || '未知'}`);
        }
        
        // 測試生產記錄歷史（需要認證）
        if (authToken) {
            const recordHistory = await makeRequest('GET', '/api/production/records', null, true);
            logTest('生產記錄歷史', recordHistory.success && Array.isArray(recordHistory.data),
                    `歷史記錄數量: ${recordHistory.data?.length || 0}`);
        }
        
    } catch (error) {
        logTest('生產記錄功能', false, error.message);
    }
}

// 測試報表中心功能
async function testReportsCenter() {
    logSection('📊 報表中心功能測試');
    
    try {
        // 測試報表統計數據
        const reportStats = await makeRequest('GET', '/api/reports/stats?timeRange=week&department=all');
        logTest('報表統計數據', reportStats.success, 
                `整體效率: ${reportStats.data?.efficiency?.overall || 0}%`);
        
        // 測試生產趨勢圖表
        const productionTrend = await makeRequest('GET', '/api/reports/production-trend?timeRange=week');
        logTest('生產趨勢圖表', productionTrend.success && productionTrend.data?.datasets?.length > 0,
                `數據集數量: ${productionTrend.data?.datasets?.length || 0}`);
        
        // 測試品質分析圖表
        const qualityAnalysis = await makeRequest('GET', '/api/reports/quality-analysis?timeRange=week');
        logTest('品質分析圖表', qualityAnalysis.success && qualityAnalysis.data?.chart,
                `品質分析數據: ${qualityAnalysis.data?.chart ? '已獲取' : '未獲取'}`);
        
        // 測試工作站效率報表
        const workstationEfficiency = await makeRequest('GET', '/api/reports/workstation-efficiency?timeRange=week&department=all');
        logTest('工作站效率報表', workstationEfficiency.success && Array.isArray(workstationEfficiency.data),
                `工作站數量: ${workstationEfficiency.data?.length || 0}, 平均效率: ${workstationEfficiency.summary?.avgEfficiency?.toFixed(1) || 0}%`);
        
        // 測試歷史數據
        const historicalData = await makeRequest('GET', '/api/reports/historical-data?startDate=2024-08-01&endDate=2024-08-13&type=production');
        logTest('歷史數據查詢', historicalData.success && Array.isArray(historicalData.data),
                `數據點數量: ${historicalData.data?.length || 0}`);
        
        // 測試導出功能
        const exportResult = await makeRequest('POST', '/api/reports/export', {
            type: 'production-trend',
            format: 'excel',
            timeRange: 'week'
        });
        logTest('報表導出功能', exportResult.success,
                `導出ID: ${exportResult.exportId || '未知'}`);
        
    } catch (error) {
        logTest('報表中心功能', false, error.message);
    }
}

// 測試即時監控看板功能
async function testLiveDashboard() {
    logSection('📺 即時監控看板功能測試');
    
    try {
        // 測試生產統計（即時監控用）
        const productionStats = await makeRequest('GET', '/api/production/stats');
        logTest('生產統計數據', productionStats.success && productionStats.data?.today,
                `今日產量: ${productionStats.data?.today?.totalProduction || 0}, 良品率: ${(100 - (productionStats.data?.today?.defectRate || 0)).toFixed(1)}%`);
        
        // 測試工作站狀態（即時監控用）
        const workstationStatus = await makeRequest('GET', '/api/workstations');
        if (workstationStatus.success && Array.isArray(workstationStatus.data)) {
            const activeCount = workstationStatus.data.filter(ws => ws.status === 'active').length;
            const idleCount = workstationStatus.data.filter(ws => ws.status === 'idle').length;
            const maintenanceCount = workstationStatus.data.filter(ws => ws.status === 'maintenance').length;
            
            logTest('工作站狀態監控', true, 
                    `運行中: ${activeCount}, 閒置: ${idleCount}, 維護中: ${maintenanceCount}`);
        } else {
            logTest('工作站狀態監控', false, '無法獲取工作站狀態');
        }
        
        // 測試工單數據（即時監控用）
        const liveWorkOrders = await makeRequest('GET', '/api/work-orders');
        if (liveWorkOrders.success && Array.isArray(liveWorkOrders.data)) {
            const inProgressCount = liveWorkOrders.data.filter(wo => wo.status === 'in_progress').length;
            const completedCount = liveWorkOrders.data.filter(wo => wo.status === 'completed').length;
            
            logTest('工單狀態監控', true,
                    `進行中: ${inProgressCount}, 已完成: ${completedCount}`);
        } else {
            logTest('工單狀態監控', false, '無法獲取工單狀態');
        }
        
    } catch (error) {
        logTest('即時監控看板功能', false, error.message);
    }
}

// 測試進階功能
async function testAdvancedFeatures() {
    logSection('⚡ 進階功能測試');
    
    try {
        // 測試特定工作站詳情
        const workstationDetail = await makeRequest('GET', '/api/workstations/A');
        logTest('工作站詳情查詢', workstationDetail.success && workstationDetail.data?.id === 'A',
                `工作站: ${workstationDetail.data?.name || '未知'}, 效率: ${workstationDetail.data?.efficiency || 0}%`);
        
        // 測試SOP查詢
        const sopDetail = await makeRequest('GET', '/api/sop/SOP-A-001');
        logTest('SOP標準作業程序', sopDetail.success && sopDetail.data?.id === 'SOP-A-001',
                `SOP標題: ${sopDetail.data?.title || '未知'}, 步驟數: ${sopDetail.data?.steps?.length || 0}`);
        
        // 測試設備配置
        const equipmentConfig = await makeRequest('GET', '/api/workstations/A/equipment');
        logTest('設備配置查詢', equipmentConfig.success && Array.isArray(equipmentConfig.data),
                `設備數量: ${equipmentConfig.data?.length || 0}`);
        
        // 測試工作站選擇（需要認證）
        if (authToken) {
            const selectResult = await makeRequest('POST', '/api/workstations/A/select', {
                operatorId: 'EMP001',
                operatorName: '測試操作員'
            }, true);
            logTest('工作站選擇', selectResult.success,
                    `選擇工作站: ${selectResult.data?.workstationId || '未知'}`);
        }
        
    } catch (error) {
        logTest('進階功能', false, error.message);
    }
}

// 測試不同用戶角色
async function testUserRoles() {
    logSection('👥 用戶角色權限測試');
    
    const roles = [
        { name: '操作員', cred: TEST_CONFIG.credentials.operator },
        { name: '主管', cred: TEST_CONFIG.credentials.supervisor },
        { name: '品管', cred: TEST_CONFIG.credentials.qc }
    ];
    
    for (const role of roles) {
        try {
            const loginResult = await makeRequest('POST', '/api/auth/login', role.cred);
            logTest(`${role.name}登入`, loginResult.success, 
                    `角色: ${loginResult.user?.role || '未知'}`);
            
            if (loginResult.token) {
                // 測試獲取用戶資訊
                const userInfo = await makeRequest('GET', '/api/auth/me', null, true);
                logTest(`${role.name}權限驗證`, userInfo.success,
                        `部門: ${userInfo.user?.department || '未知'}`);
            }
            
        } catch (error) {
            logTest(`${role.name}角色測試`, false, error.message);
        }
    }
}

// 主測試函數
async function runAllTests() {
    console.log(`\n${'🧪 FUCO Production System - 系統功能完整測試'.rainbow}`);
    console.log(`${'測試伺服器: ' + API_BASE}`.gray);
    console.log(`${'測試時間: ' + new Date().toLocaleString('zh-TW')}`.gray);
    
    // 檢查伺服器是否運行
    try {
        await makeRequest('GET', '/health');
        console.log('✅ 伺服器連接成功'.green);
    } catch (error) {
        console.log('❌ 伺服器連接失敗 - 請確保伺服器已啟動'.red);
        console.log(`   命令: cd /Users/murs/Documents/fuco-production-enterprise && node src/backend/server-simple.js`.gray);
        process.exit(1);
    }
    
    // 執行所有測試
    await testAuthentication();
    await testBasicAPIs();
    await testProductionRecords();
    await testReportsCenter();
    await testLiveDashboard();
    await testAdvancedFeatures();
    await testUserRoles();
    
    // 測試結果總結
    logSection('📈 測試結果總結');
    
    console.log(`總測試數量: ${testResults.total}`.cyan);
    console.log(`通過測試: ${testResults.passed}`.green);
    console.log(`失敗測試: ${testResults.failed}`.red);
    
    const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
    console.log(`成功率: ${successRate}%`.magenta);
    
    if (testResults.failed === 0) {
        console.log('\n🎉 所有測試通過！系統功能完整且正常運作！'.rainbow);
    } else if (successRate >= 80) {
        console.log('\n✅ 大部分測試通過，系統基本功能正常！'.green);
    } else {
        console.log('\n⚠️  部分測試失敗，請檢查系統配置！'.yellow);
    }
    
    console.log('\n📋 測試涵蓋範圍:'.bold);
    console.log('   ✓ JWT 認證系統');
    console.log('   ✓ 基礎 API 功能');
    console.log('   ✓ 生產記錄管理');
    console.log('   ✓ 報表中心功能');
    console.log('   ✓ 即時監控看板');
    console.log('   ✓ 進階功能特性');
    console.log('   ✓ 用戶角色權限');
    
    console.log('\n🌐 前端頁面測試:'.bold);
    console.log('   📝 登入頁面: http://localhost:8847/login.html');
    console.log('   🏠 主儀表板: http://localhost:8847/index.html');
    console.log('   📋 生產記錄: http://localhost:8847/production-record.html');
    console.log('   📊 報表中心: http://localhost:8847/reports.html');
    console.log('   📺 即時監控: http://localhost:8847/dashboard-live.html');
    console.log('   🔧 工作站管理: http://localhost:8847/workstation.html');
    console.log('   📖 SOP程序: http://localhost:8847/sop.html');
}

// 執行測試
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('測試執行錯誤:'.red, error.message);
        process.exit(1);
    });
}

module.exports = { runAllTests };
