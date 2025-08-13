/**
 * FUCO Production System - 增強版伺服器
 * Phase 2: 加入 JWT 認證系統
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// 導入認證中間件
const { 
  authenticateUser, 
  generateToken, 
  authMiddleware, 
  requirePermission, 
  requireRole,
  optionalAuth,
  refreshToken 
} = require('./middleware/auth');

// 初始化 Express 應用
const app = express();

// 基礎配置
const PORT = process.env.APP_PORT || 8847;
const HOST = process.env.APP_HOST || '0.0.0.0';

// 中間件配置
app.use(cors({
  origin: ['http://localhost:8847', 'http://localhost:8848'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 靜態檔案服務（如果有前端檔案）
app.use(express.static(path.join(__dirname, '../frontend')));

// Dashboard 路由
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ========================================
// API 路由
// ========================================

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'development',
    version: '1.0.0',
    message: 'FUCO Production System 運行中'
  });
});

// API 根路徑
app.get('/api', (req, res) => {
  res.json({
    name: 'FUCO Production System API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      workstations: '/api/workstations',
      workOrders: '/api/work-orders',
      production: '/api/production'
    }
  });
});

// ========================================
// 認證 API
// ========================================

// 用戶登入
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '請提供用戶名和密碼',
        code: 'MISSING_CREDENTIALS'
      });
    }
    
    // 認證用戶
    const user = await authenticateUser(username, password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用戶名或密碼錯誤',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // 生成 JWT Token
    const token = generateToken(user);
    
    res.json({
      success: true,
      message: '登入成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        department: user.department,
        permissions: user.permissions
      }
    });
    
  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Token 刷新
app.post('/api/auth/refresh', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供有效的認證 Token',
        code: 'AUTH_TOKEN_MISSING'
      });
    }
    
    const token = authHeader.substring(7);
    const newToken = refreshToken(token);
    
    if (!newToken) {
      return res.status(401).json({
        success: false,
        message: 'Token 無效或已過期',
        code: 'TOKEN_REFRESH_FAILED'
      });
    }
    
    res.json({
      success: true,
      message: 'Token 刷新成功',
      token: newToken
    });
    
  } catch (error) {
    console.error('Token 刷新錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 用戶資訊
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      department: req.user.department,
      permissions: req.user.permissions
    }
  });
});

// 登出 (客戶端處理，伺服器端記錄)
app.post('/api/auth/logout', optionalAuth, (req, res) => {
  console.log(`用戶登出: ${req.user ? req.user.username : '未知用戶'}`);
  res.json({
    success: true,
    message: '登出成功'
  });
});

// 模擬工作站列表
app.get('/api/workstations', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'A',
        name: '工作站 A - 組裝線',
        status: 'active',
        operator: '張三',
        location: 'A區-01',
        capacity: 50,
        currentLoad: 32,
        efficiency: 87.5,
        lastMaintenance: '2024-08-10',
        nextMaintenance: '2024-08-24',
        equipment: ['組裝機台-A1', '測試設備-T1', '品質檢測-Q1'],
        currentSOP: 'SOP-A-001',
        activeWorkOrder: 'WO-2024-001'
      },
      {
        id: 'B',
        name: '工作站 B - 品檢站',
        status: 'active',
        operator: '李四',
        location: 'B區-02',
        capacity: 30,
        currentLoad: 28,
        efficiency: 93.3,
        lastMaintenance: '2024-08-08',
        nextMaintenance: '2024-08-22',
        equipment: ['品檢設備-B1', '測量儀器-M1', '記錄系統-R1'],
        currentSOP: 'SOP-B-001',
        activeWorkOrder: 'WO-2024-001'
      },
      {
        id: 'C',
        name: '工作站 C - 包裝線',
        status: 'idle',
        operator: null,
        location: 'C區-03',
        capacity: 40,
        currentLoad: 0,
        efficiency: 0,
        lastMaintenance: '2024-08-12',
        nextMaintenance: '2024-08-26',
        equipment: ['包裝機-C1', '封裝設備-S1', '標籤機-L1'],
        currentSOP: null,
        activeWorkOrder: null
      },
      {
        id: 'D',
        name: '工作站 D - 測試站',
        status: 'maintenance',
        operator: null,
        location: 'D區-04',
        capacity: 25,
        currentLoad: 0,
        efficiency: 0,
        lastMaintenance: '2024-08-12',
        nextMaintenance: '2024-08-19',
        equipment: ['測試台-D1', '校準設備-C1', '數據採集-DA1'],
        currentSOP: null,
        activeWorkOrder: null,
        maintenanceReason: '定期保養維護'
      }
    ]
  });
});

// 獲取特定工作站詳情
app.get('/api/workstations/:id', (req, res) => {
  const workstationId = req.params.id;
  const workstations = [
    {
      id: 'A',
      name: '工作站 A - 組裝線',
      description: '主要負責產品組裝作業，包含零件組合、功能測試等工序',
      status: 'active',
      operator: {
        id: 'EMP001',
        name: '張三',
        experience: '3年',
        certification: ['組裝認證', '品質認證']
      },
      location: 'A區-01',
      capacity: 50,
      currentLoad: 32,
      efficiency: 87.5,
      shift: '日班 08:00-17:00',
      lastMaintenance: '2024-08-10',
      nextMaintenance: '2024-08-24',
      equipment: [
        {
          id: 'EQ-A1',
          name: '組裝機台-A1',
          status: 'running',
          model: 'ASM-2000',
          serialNumber: 'ASM001',
          lastCalibration: '2024-08-01'
        },
        {
          id: 'EQ-T1',
          name: '測試設備-T1',
          status: 'running',
          model: 'TEST-500',
          serialNumber: 'TST001',
          lastCalibration: '2024-07-28'
        },
        {
          id: 'EQ-Q1',
          name: '品質檢測-Q1',
          status: 'running',
          model: 'QC-300',
          serialNumber: 'QC001',
          lastCalibration: '2024-08-05'
        }
      ],
      currentSOP: {
        id: 'SOP-A-001',
        title: '產品A100組裝標準作業程序',
        version: 'v2.1',
        lastUpdated: '2024-07-15',
        steps: [
          { step: 1, description: '準備組裝工具與零件', time: '2分鐘', image: '/sop/A001-step1.jpg' },
          { step: 2, description: '零件清點與檢驗', time: '3分鐘', image: '/sop/A001-step2.jpg' },
          { step: 3, description: '主體組裝作業', time: '15分鐘', image: '/sop/A001-step3.jpg' },
          { step: 4, description: '功能測試確認', time: '5分鐘', image: '/sop/A001-step4.jpg' },
          { step: 5, description: '品質檢查記錄', time: '3分鐘', image: '/sop/A001-step5.jpg' }
        ]
      },
      activeWorkOrder: 'WO-2024-001',
      todayProduction: {
        completed: 32,
        target: 45,
        defects: 1,
        efficiency: 87.5
      }
    }
  ];

  const workstation = workstations.find(ws => ws.id === workstationId);
  
  if (!workstation) {
    return res.status(404).json({
      success: false,
      message: '工作站不存在'
    });
  }

  res.json({
    success: true,
    data: workstation
  });
});

// 選擇工作站
app.post('/api/workstations/:id/select', (req, res) => {
  const workstationId = req.params.id;
  const { operatorId, operatorName } = req.body;

  // 模擬選擇工作站邏輯
  res.json({
    success: true,
    message: `成功選擇工作站 ${workstationId}`,
    data: {
      workstationId,
      operator: {
        id: operatorId,
        name: operatorName
      },
      selectedAt: new Date().toISOString()
    }
  });
});

// 獲取SOP詳情
app.get('/api/sop/:id', (req, res) => {
  const sopId = req.params.id;
  
  const sops = {
    'SOP-A-001': {
      id: 'SOP-A-001',
      title: '產品A100組裝標準作業程序',
      version: 'v2.1',
      category: '組裝作業',
      lastUpdated: '2024-07-15',
      approver: '品質經理',
      workstation: '工作站A',
      estimatedTime: '28分鐘',
      difficulty: '中等',
      safetyNotes: [
        '作業前必須穿戴安全護具',
        '注意機台運轉安全',
        '異常狀況立即停機通報'
      ],
      tools: ['組裝工具組', '測試儀器', '品質檢測設備'],
      materials: ['零件A', '零件B', '零件C', '組裝螺絲', '標籤貼紙'],
      steps: [
        {
          step: 1,
          title: '準備作業',
          description: '準備組裝工具與零件，檢查設備狀態',
          time: '2分鐘',
          image: '/sop/A001-step1.jpg',
          keyPoints: ['檢查工具完整性', '確認零件規格', '設備預熱'],
          quality: ['工具無損壞', '零件規格正確']
        },
        {
          step: 2,
          title: '零件檢驗',
          description: '對所有零件進行外觀與尺寸檢驗',
          time: '3分鐘',
          image: '/sop/A001-step2.jpg',
          keyPoints: ['外觀檢查', '尺寸測量', '數量清點'],
          quality: ['無外觀缺陷', '尺寸在公差範圍內', '數量正確']
        },
        {
          step: 3,
          title: '主體組裝',
          description: '按照組裝順序進行主體組裝作業',
          time: '15分鐘',
          image: '/sop/A001-step3.jpg',
          keyPoints: ['組裝順序', '扭矩規範', '位置對位'],
          quality: ['組裝牢固', '無異音', '外觀整潔']
        },
        {
          step: 4,
          title: '功能測試',
          description: '進行產品功能測試，確保正常運作',
          time: '5分鐘',
          image: '/sop/A001-step4.jpg',
          keyPoints: ['測試項目確認', '參數記錄', '異常處理'],
          quality: ['所有功能正常', '參數在規格範圍內']
        },
        {
          step: 5,
          title: '品質記錄',
          description: '完成品質檢查並記錄相關數據',
          time: '3分鐘',
          image: '/sop/A001-step5.jpg',
          keyPoints: ['品質確認', '數據記錄', '標籤黏貼'],
          quality: ['品質合格', '記錄完整', '標籤正確']
        }
      ]
    }
  };

  const sop = sops[sopId];
  
  if (!sop) {
    return res.status(404).json({
      success: false,
      message: 'SOP不存在'
    });
  }

  res.json({
    success: true,
    data: sop
  });
});

// 設備配置API
app.get('/api/workstations/:id/equipment', (req, res) => {
  const workstationId = req.params.id;
  
  const equipmentData = {
    'A': [
      {
        id: 'EQ-A1',
        name: '組裝機台-A1',
        status: 'running',
        model: 'ASM-2000',
        serialNumber: 'ASM001',
        manufacturer: 'ABC Manufacturing',
        installDate: '2023-01-15',
        lastMaintenance: '2024-08-01',
        nextMaintenance: '2024-09-01',
        configuration: {
          speed: '85%',
          pressure: '2.5 bar',
          temperature: '25°C'
        },
        alerts: []
      },
      {
        id: 'EQ-T1',
        name: '測試設備-T1',
        status: 'running',
        model: 'TEST-500',
        serialNumber: 'TST001',
        manufacturer: 'Test Systems Inc',
        installDate: '2023-02-10',
        lastMaintenance: '2024-07-28',
        nextMaintenance: '2024-08-28',
        configuration: {
          voltage: '220V',
          frequency: '50Hz',
          accuracy: '±0.1%'
        },
        alerts: []
      }
    ]
  };

  const equipment = equipmentData[workstationId] || [];
  
  res.json({
    success: true,
    data: equipment
  });
});

// 模擬工單列表
app.get('/api/work-orders', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        orderNumber: 'WO-2024-001',
        productCode: 'PROD-A100',
        productName: '產品 A100',
        quantity: 1000,
        completedQuantity: 650,
        status: 'in_progress',
        progress: 65,
        startTime: '2024-08-12T08:00:00Z',
        estimatedEndTime: '2024-08-12T18:00:00Z'
      },
      {
        id: 2,
        orderNumber: 'WO-2024-002',
        productCode: 'PROD-B200',
        productName: '產品 B200',
        quantity: 500,
        completedQuantity: 500,
        status: 'completed',
        progress: 100,
        startTime: '2024-08-11T08:00:00Z',
        endTime: '2024-08-11T16:30:00Z'
      }
    ]
  });
});

// 模擬生產數據
app.get('/api/production/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      today: {
        totalProduction: 1650,
        goodQuantity: 1600,
        defectQuantity: 50,
        defectRate: 3.03,
        efficiency: 92.5
      },
      thisWeek: {
        totalProduction: 8250,
        goodQuantity: 8000,
        defectQuantity: 250,
        defectRate: 3.03,
        efficiency: 91.2
      },
      thisMonth: {
        totalProduction: 35000,
        goodQuantity: 34000,
        defectQuantity: 1000,
        defectRate: 2.86,
        efficiency: 93.1
      }
    }
  });
});

// ========================================
// 生產記錄 API
// ========================================

// 獲取今日生產統計
app.get('/api/production/today-stats', optionalAuth, (req, res) => {
  const stats = {
    completedCount: 156,
    targetCount: 200,
    defectCount: 8,
    qualityRate: 95.2,
    efficiency: 78.0,
    lastUpdate: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: stats
  });
});

// 獲取工單列表 (供生產記錄選擇)
app.get('/api/production/work-orders', optionalAuth, (req, res) => {
  const workOrders = [
    {
      id: 'WO-2024-001',
      productCode: 'PROD-A100',
      productName: '產品A100',
      targetQuantity: 1000,
      completedQuantity: 650,
      status: 'in_progress',
      startDate: '2024-08-12',
      dueDate: '2024-08-15',
      priority: 'high'
    },
    {
      id: 'WO-2024-002', 
      productCode: 'PROD-B200',
      productName: '產品B200',
      targetQuantity: 500,
      completedQuantity: 480,
      status: 'in_progress',
      startDate: '2024-08-13',
      dueDate: '2024-08-14',
      priority: 'medium'
    },
    {
      id: 'WO-2024-003',
      productCode: 'PROD-C300', 
      productName: '產品C300',
      targetQuantity: 800,
      completedQuantity: 0,
      status: 'pending',
      startDate: '2024-08-14',
      dueDate: '2024-08-16',
      priority: 'low'
    }
  ];
  
  res.json({
    success: true,
    data: workOrders
  });
});

// 獲取工單的品質檢查項目
app.get('/api/production/work-orders/:id/quality-checks', optionalAuth, (req, res) => {
  const workOrderId = req.params.id;
  
  const qualityChecks = {
    'WO-2024-001': [
      { id: 'QC-001', name: '外觀檢查', type: 'visual', required: true, passed: null },
      { id: 'QC-002', name: '尺寸測量', type: 'measurement', required: true, passed: null },
      { id: 'QC-003', name: '功能測試', type: 'function', required: true, passed: null },
      { id: 'QC-004', name: '包裝檢查', type: 'packaging', required: false, passed: null }
    ],
    'WO-2024-002': [
      { id: 'QC-005', name: '材質檢驗', type: 'material', required: true, passed: null },
      { id: 'QC-006', name: '重量檢查', type: 'weight', required: true, passed: null },
      { id: 'QC-007', name: '標籤確認', type: 'labeling', required: true, passed: null }
    ],
    'WO-2024-003': [
      { id: 'QC-008', name: '顏色檢查', type: 'color', required: true, passed: null },
      { id: 'QC-009', name: '表面處理', type: 'surface', required: true, passed: null },
      { id: 'QC-010', name: '組裝檢驗', type: 'assembly', required: true, passed: null }
    ]
  };
  
  const checks = qualityChecks[workOrderId] || [];
  
  res.json({
    success: true,
    data: checks
  });
});

// 提交生產記錄
app.post('/api/production/records', authMiddleware, (req, res) => {
  const {
    workOrderId,
    completedQuantity,
    defectQuantity,
    qualityChecks,
    operatorNotes
  } = req.body;
  
  if (!workOrderId || !completedQuantity) {
    return res.status(400).json({
      success: false,
      message: '工單號碼和完成數量為必填項目'
    });
  }
  
  // 模擬保存生產記錄
  const productionRecord = {
    id: `PR-${Date.now()}`,
    workOrderId,
    completedQuantity: parseInt(completedQuantity),
    defectQuantity: parseInt(defectQuantity) || 0,
    qualityChecks: qualityChecks || [],
    operatorNotes: operatorNotes || '',
    operatorId: req.user.id,
    operatorName: req.user.name,
    recordTime: new Date().toISOString(),
    workstation: req.user.workstation || 'A'
  };
  
  console.log('生產記錄已提交:', productionRecord);
  
  res.json({
    success: true,
    message: '生產記錄提交成功',
    data: productionRecord
  });
});

// 獲取生產記錄歷史
app.get('/api/production/records', authMiddleware, requirePermission(['production:read', 'workstation:read']), (req, res) => {
  const { workOrderId, limit = 50 } = req.query;
  
  // 模擬生產記錄數據
  const records = [
    {
      id: 'PR-001',
      workOrderId: 'WO-2024-001',
      completedQuantity: 25,
      defectQuantity: 1,
      operatorName: '張三',
      recordTime: '2024-08-13T10:30:00Z',
      workstation: 'A'
    },
    {
      id: 'PR-002', 
      workOrderId: 'WO-2024-001',
      completedQuantity: 30,
      defectQuantity: 0,
      operatorName: '李四',
      recordTime: '2024-08-13T11:15:00Z',
      workstation: 'B'
    },
    {
      id: 'PR-003',
      workOrderId: 'WO-2024-002',
      completedQuantity: 20,
      defectQuantity: 2,
      operatorName: '王五',
      recordTime: '2024-08-13T12:00:00Z',
      workstation: 'A'
    }
  ];
  
  let filteredRecords = records;
  if (workOrderId) {
    filteredRecords = records.filter(r => r.workOrderId === workOrderId);
  }
  
  res.json({
    success: true,
    data: filteredRecords.slice(0, parseInt(limit))
  });
});

// ========================================
// 報表中心 API
// ========================================

// 獲取報表統計數據
app.get('/api/reports/stats', optionalAuth, (req, res) => {
  const { timeRange = 'week', department = 'all' } = req.query;
  
  const stats = {
    efficiency: {
      overall: 92.5,
      avgCycleTime: 28.5,
      equipmentUtilization: 94.2,
      personnelEfficiency: 88.7,
      materialUtilization: 96.1,
      deliveryRate: 95.8
    },
    quality: {
      defectRate: 3.2,
      firstPassYield: 96.8,
      customerSatisfaction: 4.7,
      onTimeDelivery: 97.3,
      costSaving: 125000,
      trainingCompletion: 92.5
    },
    production: {
      totalCompleted: timeRange === 'today' ? 156 : timeRange === 'week' ? 1250 : 5800,
      totalTarget: timeRange === 'today' ? 200 : timeRange === 'week' ? 1400 : 6200,
      defectCount: timeRange === 'today' ? 8 : timeRange === 'week' ? 65 : 290,
      qualityRate: timeRange === 'today' ? 95.2 : timeRange === 'week' ? 94.8 : 95.0
    },
    trends: {
      productionTrend: 'up',
      qualityTrend: 'stable', 
      efficiencyTrend: 'up',
      defectTrend: 'down'
    }
  };
  
  res.json({
    success: true,
    timeRange,
    department,
    data: stats,
    lastUpdate: new Date().toISOString()
  });
});

// 獲取生產趨勢圖表數據
app.get('/api/reports/production-trend', optionalAuth, (req, res) => {
  const { timeRange = 'week' } = req.query;
  
  let chartData;
  
  if (timeRange === 'today') {
    chartData = {
      labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
      datasets: [
        {
          label: '計劃產量',
          data: [35, 70, 105, 140, 170, 200],
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)'
        },
        {
          label: '實際產量', 
          data: [32, 68, 98, 128, 152, 176],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)'
        }
      ]
    };
  } else if (timeRange === 'week') {
    chartData = {
      labels: ['週一', '週二', '週三', '週四', '週五', '週六', '週日'],
      datasets: [
        {
          label: '計劃產量',
          data: [200, 220, 200, 240, 200, 160, 120],
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)'
        },
        {
          label: '實際產量',
          data: [185, 210, 195, 235, 188, 152, 110],
          borderColor: '#10b981', 
          backgroundColor: 'rgba(16, 185, 129, 0.1)'
        }
      ]
    };
  } else {
    chartData = {
      labels: ['第1週', '第2週', '第3週', '第4週'],
      datasets: [
        {
          label: '計劃產量',
          data: [1400, 1500, 1450, 1550],
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)'
        },
        {
          label: '實際產量',
          data: [1320, 1445, 1380, 1495],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)'
        }
      ]
    };
  }
  
  res.json({
    success: true,
    timeRange,
    data: chartData
  });
});

// 獲取品質分析圖表數據
app.get('/api/reports/quality-analysis', optionalAuth, (req, res) => {
  const { timeRange = 'week' } = req.query;
  
  const chartData = {
    labels: ['外觀不良', '尺寸不良', '功能異常', '包裝問題', '其他'],
    datasets: [{
      label: '不良原因分析',
      data: [45, 25, 15, 10, 5],
      backgroundColor: [
        '#ef4444',
        '#f59e0b', 
        '#f97316',
        '#84cc16',
        '#6b7280'
      ]
    }]
  };
  
  const qualityMetrics = {
    firstPassYield: 96.8,
    reworkRate: 2.1,
    scrapRate: 1.1,
    customerComplaints: 3,
    qualityScore: 94.5
  };
  
  res.json({
    success: true,
    timeRange,
    data: {
      chart: chartData,
      metrics: qualityMetrics
    }
  });
});

// 獲取工作站效率詳細報表
app.get('/api/reports/workstation-efficiency', optionalAuth, (req, res) => {
  const { timeRange = 'week', department = 'all' } = req.query;
  
  const workstationData = [
    {
      id: 'A',
      name: '工作站A-組裝線',
      department: 'assembly',
      planned: 200,
      actual: 185,
      efficiency: 92.5,
      defectRate: 2.1,
      downtime: 45,
      status: 'high',
      operator: '張三',
      shift: '日班',
      oee: 87.2,
      availability: 94.5,
      performance: 92.3,
      quality: 97.9
    },
    {
      id: 'B',
      name: '工作站B-品檢站',
      department: 'quality',
      planned: 180,
      actual: 175,
      efficiency: 97.2,
      defectRate: 1.5,
      downtime: 15,
      status: 'high',
      operator: '李四',
      shift: '日班',
      oee: 95.1,
      availability: 98.5,
      performance: 97.2,
      quality: 98.5
    },
    {
      id: 'C',
      name: '工作站C-包裝線',
      department: 'packaging',
      planned: 150,
      actual: 128,
      efficiency: 85.3,
      defectRate: 0.8,
      downtime: 90,
      status: 'medium',
      operator: '王五',
      shift: '日班',
      oee: 84.2,
      availability: 88.0,
      performance: 95.7,
      quality: 99.2
    },
    {
      id: 'D',
      name: '工作站D-測試站',
      department: 'quality',
      planned: 100,
      actual: 72,
      efficiency: 72.0,
      defectRate: 5.2,
      downtime: 180,
      status: 'low',
      operator: '趙六',
      shift: '日班',
      oee: 68.4,
      availability: 70.0,
      performance: 97.7,
      quality: 94.8
    }
  ];
  
  let filteredData = workstationData;
  if (department !== 'all') {
    filteredData = workstationData.filter(ws => ws.department === department);
  }
  
  res.json({
    success: true,
    timeRange,
    department,
    data: filteredData,
    summary: {
      totalWorkstations: filteredData.length,
      avgEfficiency: filteredData.reduce((sum, ws) => sum + ws.efficiency, 0) / filteredData.length,
      avgDefectRate: filteredData.reduce((sum, ws) => sum + ws.defectRate, 0) / filteredData.length,
      totalDowntime: filteredData.reduce((sum, ws) => sum + ws.downtime, 0)
    }
  });
});

// 獲取歷史生產數據
app.get('/api/reports/historical-data', optionalAuth, (req, res) => {
  const { 
    startDate = '2024-08-01', 
    endDate = '2024-08-13',
    type = 'production'
  } = req.query;
  
  const historicalData = {
    production: [
      { date: '2024-08-01', planned: 200, actual: 185, defects: 8 },
      { date: '2024-08-02', planned: 220, actual: 210, defects: 6 },
      { date: '2024-08-03', planned: 200, actual: 195, defects: 9 },
      { date: '2024-08-04', planned: 240, actual: 235, defects: 12 },
      { date: '2024-08-05', planned: 200, actual: 188, defects: 7 },
      { date: '2024-08-06', planned: 160, actual: 152, defects: 4 },
      { date: '2024-08-07', planned: 120, actual: 110, defects: 3 },
      { date: '2024-08-08', planned: 200, actual: 192, defects: 8 },
      { date: '2024-08-09', planned: 220, actual: 205, defects: 11 },
      { date: '2024-08-10', planned: 200, actual: 198, defects: 5 },
      { date: '2024-08-11', planned: 240, actual: 228, defects: 10 },
      { date: '2024-08-12', planned: 200, actual: 185, defects: 6 },
      { date: '2024-08-13', planned: 180, actual: 165, defects: 8 }
    ]
  };
  
  res.json({
    success: true,
    startDate,
    endDate,
    type,
    data: historicalData[type] || []
  });
});

// 導出報表數據（模擬）
app.post('/api/reports/export', optionalAuth, (req, res) => {
  const { type, format = 'excel', timeRange = 'week' } = req.body;
  
  // 模擬導出過程
  const exportId = `EXPORT_${Date.now()}`;
  
  res.json({
    success: true,
    message: '報表導出請求已提交',
    exportId,
    downloadUrl: `/api/reports/download/${exportId}`,
    estimatedTime: '30秒',
    format,
    type
  });
});

// 根路徑 - 顯示歡迎頁面
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FUCO Production System</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          max-width: 600px;
          width: 90%;
        }
        h1 {
          font-size: 2.5em;
          margin-bottom: 20px;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .subtitle {
          font-size: 1.2em;
          margin-bottom: 30px;
          opacity: 0.9;
        }
        .status {
          background: rgba(255, 255, 255, 0.2);
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
        }
        .status-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .status-item:last-child {
          border-bottom: none;
        }
        .status-label {
          font-weight: 600;
        }
        .status-value {
          color: #4ade80;
        }
        .endpoints {
          margin-top: 30px;
          text-align: left;
        }
        .endpoints h3 {
          margin-bottom: 15px;
          text-align: center;
        }
        .endpoint-list {
          background: rgba(0, 0, 0, 0.2);
          padding: 15px;
          border-radius: 10px;
        }
        .endpoint-item {
          padding: 8px;
          margin: 5px 0;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 5px;
          font-family: 'Courier New', monospace;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .endpoint-item:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateX(5px);
        }
        a {
          color: white;
          text-decoration: none;
        }
        .login-info {
          margin-top: 30px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
        }
        .credentials {
          display: flex;
          gap: 20px;
          justify-content: center;
          margin-top: 10px;
        }
        .credential {
          padding: 10px 20px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 5px;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏭 FUCO Production System</h1>
        <p class="subtitle">福桑聯合生產管理系統 - 測試伺服器</p>
        
        <div class="status">
          <div class="status-item">
            <span class="status-label">系統狀態</span>
            <span class="status-value">✅ 運行中</span>
          </div>
          <div class="status-item">
            <span class="status-label">API 端口</span>
            <span class="status-value">${PORT}</span>
          </div>
          <div class="status-item">
            <span class="status-label">版本</span>
            <span class="status-value">v1.0.0</span>
          </div>
          <div class="status-item">
            <span class="status-label">環境</span>
            <span class="status-value">開發測試</span>
          </div>
        </div>
        
        <div class="endpoints">
          <h3>📡 API 端點</h3>
          <div class="endpoint-list">
            <a href="/health" target="_blank">
              <div class="endpoint-item">GET /health - 健康檢查</div>
            </a>
            <a href="/api" target="_blank">
              <div class="endpoint-item">GET /api - API 資訊</div>
            </a>
            <a href="/api/workstations" target="_blank">
              <div class="endpoint-item">GET /api/workstations - 工作站列表</div>
            </a>
            <a href="/api/work-orders" target="_blank">
              <div class="endpoint-item">GET /api/work-orders - 工單列表</div>
            </a>
            <a href="/api/production/stats" target="_blank">
              <div class="endpoint-item">GET /api/production/stats - 生產統計</div>
            </a>
          </div>
        </div>
        
        <div class="login-info">
          <h3>🔐 測試登入帳號</h3>
          <div class="credentials">
            <div class="credential">
              <strong>帳號:</strong> admin
            </div>
            <div class="credential">
              <strong>密碼:</strong> admin123
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: '請求的資源不存在',
    path: req.url
  });
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: '伺服器內部錯誤'
  });
});

// 啟動伺服器
app.listen(PORT, HOST, () => {
  console.log(`
    ========================================
    FUCO Production System - 測試伺服器
    ========================================
    🚀 伺服器已啟動
    📍 訪問地址: http://localhost:${PORT}
    📡 API 端點: http://localhost:${PORT}/api
    🏥 健康檢查: http://localhost:${PORT}/health
    ========================================
  `);
});

module.exports = app;
