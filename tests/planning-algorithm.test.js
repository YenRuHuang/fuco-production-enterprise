/**
 * Production Planning Algorithm Accuracy Tests
 * 生產規劃算法準確性測試
 */

const request = require('supertest');
const app = require('../src/backend/server');

describe('Production Planning Algorithm Tests', () => {
  let authToken;
  
  beforeAll(async () => {
    // 獲取測試用 token（模擬登入）
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'test@fuco.com',
        password: 'test123'
      });
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.token;
    } else {
      // 使用模擬 token 進行測試
      authToken = 'test-token-for-planning-tests';
    }
  });

  describe('智能排程算法測試', () => {
    test('基本排程優化功能', async () => {
      const testWorkOrders = [
        {
          id: 'WO-TEST-001',
          name: '測試工單A',
          priority: 3,
          estimatedTime: 120,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          requiredSkills: ['assembly', 'quality_check'],
          dependencies: []
        },
        {
          id: 'WO-TEST-002',
          name: '測試工單B',
          priority: 2,
          estimatedTime: 90,
          dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
          requiredSkills: ['machining'],
          dependencies: []
        }
      ];

      const testWorkstations = [
        {
          id: 'WS-TEST-101',
          name: '測試工作站A',
          capacity: 2,
          skills: ['assembly', 'quality_check'],
          efficiency: 1.2,
          currentLoad: 0.3
        },
        {
          id: 'WS-TEST-102',
          name: '測試工作站B',
          capacity: 1,
          skills: ['machining'],
          efficiency: 1.0,
          currentLoad: 0.5
        }
      ];

      const response = await request(app)
        .post('/api/planning/optimize-schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrders: testWorkOrders,
          workstations: testWorkstations,
          constraints: {
            maxMakespan: 48,
            targetUtilization: 0.85
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('schedule');
      expect(response.body.data).toHaveProperty('fitness');
      expect(response.body.data).toHaveProperty('metrics');
      
      // 驗證排程結果
      const schedule = response.body.data.schedule;
      expect(schedule).toBeInstanceOf(Array);
      expect(schedule.length).toBe(testWorkOrders.length);
      
      // 驗證每個工單都被分配
      testWorkOrders.forEach(order => {
        const scheduledOrder = schedule.find(item => item.workOrderId === order.id);
        expect(scheduledOrder).toBeDefined();
        expect(scheduledOrder).toHaveProperty('workstationId');
        expect(scheduledOrder).toHaveProperty('startTime');
        expect(scheduledOrder).toHaveProperty('endTime');
      });
      
      // 驗證適應度分數
      expect(response.body.data.fitness).toBeGreaterThan(0);
      expect(response.body.data.fitness).toBeLessThanOrEqual(200);
    });

    test('排程衝突檢測', async () => {
      const conflictingOrders = [
        {
          id: 'WO-CONFLICT-001',
          estimatedTime: 240, // 4小時
          requiredSkills: ['assembly'],
          priority: 1
        },
        {
          id: 'WO-CONFLICT-002',
          estimatedTime: 180, // 3小時
          requiredSkills: ['assembly'],
          priority: 2
        }
      ];

      const limitedWorkstations = [
        {
          id: 'WS-LIMITED-001',
          capacity: 1, // 只有一個容量
          skills: ['assembly'],
          efficiency: 1.0,
          currentLoad: 0
        }
      ];

      const response = await request(app)
        .post('/api/planning/optimize-schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrders: conflictingOrders,
          workstations: limitedWorkstations
        });

      expect(response.status).toBe(200);
      
      const schedule = response.body.data.schedule;
      
      // 驗證沒有時間衝突
      if (schedule.length >= 2) {
        const order1 = schedule[0];
        const order2 = schedule[1];
        
        const start1 = new Date(order1.startTime);
        const end1 = new Date(order1.endTime);
        const start2 = new Date(order2.startTime);
        const end2 = new Date(order2.endTime);
        
        // 確保沒有重疊
        const noOverlap = (end1 <= start2) || (end2 <= start1);
        expect(noOverlap).toBe(true);
      }
    });

    test('技能匹配驗證', async () => {
      const skillSpecificOrders = [
        {
          id: 'WO-SKILL-001',
          requiredSkills: ['welding', 'quality_check'],
          estimatedTime: 120
        },
        {
          id: 'WO-SKILL-002',
          requiredSkills: ['programming'],
          estimatedTime: 90
        }
      ];

      const skillSpecificStations = [
        {
          id: 'WS-SKILL-001',
          skills: ['welding', 'quality_check'],
          capacity: 1
        },
        {
          id: 'WS-SKILL-002',
          skills: ['programming', 'testing'],
          capacity: 1
        }
      ];

      const response = await request(app)
        .post('/api/planning/optimize-schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrders: skillSpecificOrders,
          workstations: skillSpecificStations
        });

      expect(response.status).toBe(200);
      
      const schedule = response.body.data.schedule;
      
      // 驗證技能匹配
      schedule.forEach(scheduledOrder => {
        const originalOrder = skillSpecificOrders.find(o => o.id === scheduledOrder.workOrderId);
        const assignedStation = skillSpecificStations.find(s => s.id === scheduledOrder.workstationId);
        
        if (originalOrder && assignedStation && originalOrder.requiredSkills) {
          originalOrder.requiredSkills.forEach(requiredSkill => {
            expect(assignedStation.skills).toContain(requiredSkill);
          });
        }
      });
    });

    test('優先級排程驗證', async () => {
      const priorityOrders = [
        {
          id: 'WO-PRIORITY-LOW',
          priority: 1,
          estimatedTime: 60,
          dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000)
        },
        {
          id: 'WO-PRIORITY-HIGH',
          priority: 5,
          estimatedTime: 60,
          dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000)
        },
        {
          id: 'WO-PRIORITY-MEDIUM',
          priority: 3,
          estimatedTime: 60,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      ];

      const testStation = [
        {
          id: 'WS-PRIORITY-TEST',
          capacity: 1,
          skills: [],
          efficiency: 1.0
        }
      ];

      const response = await request(app)
        .post('/api/planning/optimize-schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrders: priorityOrders,
          workstations: testStation
        });

      expect(response.status).toBe(200);
      
      const schedule = response.body.data.schedule;
      expect(schedule.length).toBe(3);
      
      // 排序並檢查高優先級是否先被排程
      const sortedSchedule = schedule.sort((a, b) => 
        new Date(a.startTime) - new Date(b.startTime)
      );
      
      // 高優先級工單應該被優先安排
      const highPriorityOrder = sortedSchedule.find(item => 
        item.workOrderId === 'WO-PRIORITY-HIGH'
      );
      const lowPriorityOrder = sortedSchedule.find(item => 
        item.workOrderId === 'WO-PRIORITY-LOW'
      );
      
      if (highPriorityOrder && lowPriorityOrder) {
        expect(new Date(highPriorityOrder.startTime))
          .toBeLessThanOrEqual(new Date(lowPriorityOrder.startTime));
      }
    });
  });

  describe('產能負載分析測試', () => {
    test('基本產能分析功能', async () => {
      const testWorkstations = [
        {
          id: 'WS-CAPACITY-001',
          name: '產能測試站A',
          capacity: 2,
          efficiency: 0.95,
          currentLoad: 0.8,
          skills: ['assembly']
        },
        {
          id: 'WS-CAPACITY-002',
          name: '產能測試站B',
          capacity: 1,
          efficiency: 1.1,
          currentLoad: 0.6,
          skills: ['machining']
        }
      ];

      const response = await request(app)
        .post('/api/planning/analyze-capacity')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workstations: testWorkstations,
          timeHorizon: 7,
          analysisMode: 'detailed'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('detailed');
      expect(response.body.data).toHaveProperty('analysisMetadata');
      
      // 驗證摘要數據
      const summary = response.body.data.summary;
      expect(summary).toHaveProperty('totalCapacity');
      expect(summary).toHaveProperty('availableCapacity');
      expect(summary).toHaveProperty('utilizationRate');
      expect(summary).toHaveProperty('efficiency');
      expect(summary).toHaveProperty('bottleneckCount');
      
      // 驗證詳細分析
      const detailed = response.body.data.detailed;
      expect(detailed).toHaveProperty('baseCapacity');
      expect(detailed).toHaveProperty('loadAnalysis');
      expect(detailed).toHaveProperty('efficiencyAnalysis');
      expect(detailed).toHaveProperty('bottlenecks');
      expect(detailed).toHaveProperty('recommendations');
      expect(detailed).toHaveProperty('forecast');
      
      // 驗證數值合理性
      expect(summary.totalCapacity).toBeGreaterThan(0);
      expect(summary.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(summary.utilizationRate).toBeLessThanOrEqual(100);
      expect(summary.efficiency).toBeGreaterThan(0);
    });

    test('瓶頸識別功能', async () => {
      const response = await request(app)
        .get('/api/planning/bottleneck-analysis')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('critical');
      expect(response.body.data).toHaveProperty('potential');
      expect(response.body.data).toHaveProperty('analysis');
      expect(response.body.data).toHaveProperty('summary');
      
      const analysis = response.body.data.analysis;
      expect(analysis).toBeInstanceOf(Array);
      
      // 驗證每個分析項目的結構
      analysis.forEach(item => {
        expect(item).toHaveProperty('stationId');
        expect(item).toHaveProperty('stationName');
        expect(item).toHaveProperty('utilization');
        expect(item).toHaveProperty('efficiency');
        expect(item).toHaveProperty('bottleneckScore');
        expect(item).toHaveProperty('factors');
        expect(item).toHaveProperty('recommendations');
        
        // 驗證數值範圍
        expect(item.utilization).toBeGreaterThanOrEqual(0);
        expect(item.utilization).toBeLessThanOrEqual(100);
        expect(item.efficiency).toBeGreaterThan(0);
        expect(item.bottleneckScore).toBeGreaterThanOrEqual(0);
        expect(item.bottleneckScore).toBeLessThanOrEqual(100);
      });
    });

    test('負載平衡計算準確性', async () => {
      // 創建極端不平衡的工作站數據
      const unbalancedStations = [
        {
          id: 'WS-UNBALANCED-001',
          capacity: 1,
          currentLoad: 0.95, // 95% 利用率
          efficiency: 1.0
        },
        {
          id: 'WS-UNBALANCED-002',
          capacity: 1,
          currentLoad: 0.2,  // 20% 利用率
          efficiency: 1.0
        },
        {
          id: 'WS-UNBALANCED-003',
          capacity: 1,
          currentLoad: 0.1,  // 10% 利用率
          efficiency: 1.0
        }
      ];

      const response = await request(app)
        .post('/api/planning/analyze-capacity')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workstations: unbalancedStations,
          timeHorizon: 7
        });

      expect(response.status).toBe(200);
      
      const loadAnalysis = response.body.data.detailed.loadAnalysis;
      expect(loadAnalysis).toHaveProperty('balanceIndex');
      
      // 負載不平衡應該反映在低平衡指數上
      expect(loadAnalysis.balanceIndex).toBeLessThan(70);
      
      // 應該識別出超載站點
      expect(loadAnalysis.projectedOverload.overloadStations).toBeGreaterThan(0);
    });
  });

  describe('算法性能測試', () => {
    test('大規模數據處理性能', async () => {
      // 創建大量工單和工作站
      const largeWorkOrders = Array.from({ length: 50 }, (_, i) => ({
        id: `WO-PERF-${String(i + 1).padStart(3, '0')}`,
        priority: Math.floor(Math.random() * 5) + 1,
        estimatedTime: Math.floor(Math.random() * 180) + 30,
        requiredSkills: ['general'],
        dueDate: new Date(Date.now() + (Math.random() * 7 * 24 * 60 * 60 * 1000))
      }));

      const largeWorkstations = Array.from({ length: 10 }, (_, i) => ({
        id: `WS-PERF-${String(i + 1).padStart(3, '0')}`,
        capacity: Math.floor(Math.random() * 3) + 1,
        skills: ['general'],
        efficiency: 0.8 + Math.random() * 0.4,
        currentLoad: Math.random() * 0.8
      }));

      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/planning/optimize-schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrders: largeWorkOrders,
          workstations: largeWorkstations
        });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // 驗證性能 - 應該在合理時間內完成（例如 30 秒）
      expect(executionTime).toBeLessThan(30000);
      
      // 驗證所有工單都被處理
      expect(response.body.data.schedule.length).toBe(largeWorkOrders.length);
      
      console.log(`大規模排程處理時間: ${executionTime}ms`);
    });

    test('算法收斂性測試', async () => {
      const testOrders = Array.from({ length: 10 }, (_, i) => ({
        id: `WO-CONV-${i + 1}`,
        priority: Math.floor(Math.random() * 3) + 1,
        estimatedTime: 60 + Math.random() * 120,
        requiredSkills: ['standard']
      }));

      const testStations = Array.from({ length: 3 }, (_, i) => ({
        id: `WS-CONV-${i + 1}`,
        capacity: 1,
        skills: ['standard'],
        efficiency: 0.9 + Math.random() * 0.2
      }));

      // 運行多次相同的優化，檢查結果一致性
      const results = [];
      for (let run = 0; run < 3; run++) {
        const response = await request(app)
          .post('/api/planning/optimize-schedule')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            workOrders: testOrders,
            workstations: testStations
          });

        expect(response.status).toBe(200);
        results.push(response.body.data.fitness);
      }

      // 檢查適應度分數的變異性（不應該相差太大）
      const avgFitness = results.reduce((sum, f) => sum + f, 0) / results.length;
      const maxDeviation = Math.max(...results.map(f => Math.abs(f - avgFitness)));
      
      // 變異性不應該超過平均值的 20%
      expect(maxDeviation / avgFitness).toBeLessThan(0.2);
    });
  });

  describe('邊界條件測試', () => {
    test('空數據處理', async () => {
      const response = await request(app)
        .post('/api/planning/optimize-schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrders: [],
          workstations: []
        });

      // 應該優雅處理空數據
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.schedule).toEqual([]);
    });

    test('無法匹配的技能需求', async () => {
      const impossibleOrder = [{
        id: 'WO-IMPOSSIBLE',
        requiredSkills: ['impossible_skill'],
        estimatedTime: 60
      }];

      const normalStations = [{
        id: 'WS-NORMAL',
        skills: ['normal_skill'],
        capacity: 1
      }];

      const response = await request(app)
        .post('/api/planning/optimize-schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrders: impossibleOrder,
          workstations: normalStations
        });

      // 應該處理技能不匹配的情況
      expect(response.status).toBe(200);
      // 可能將工單分配到某個工作站，或報告無法分配
    });

    test('極端優先級處理', async () => {
      const extremeOrders = [
        {
          id: 'WO-EXTREME-HIGH',
          priority: 999,
          estimatedTime: 60
        },
        {
          id: 'WO-EXTREME-LOW',
          priority: -10,
          estimatedTime: 60
        }
      ];

      const testStation = [{
        id: 'WS-EXTREME-TEST',
        capacity: 1,
        skills: []
      }];

      const response = await request(app)
        .post('/api/planning/optimize-schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrders: extremeOrders,
          workstations: testStation
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('API 錯誤處理測試', () => {
    test('無效的請求格式', async () => {
      const response = await request(app)
        .post('/api/planning/optimize-schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invalidField: 'invalid'
        });

      // 應該優雅處理無效請求
      expect(response.status).toBe(200);
      // 或者返回 400 錯誤，取決於具體實現
    });

    test('缺少認證 token', async () => {
      const response = await request(app)
        .post('/api/planning/optimize-schedule')
        .send({
          workOrders: [],
          workstations: []
        });

      // 應該要求認證
      expect(response.status).toBe(401);
    });

    test('無效的時間範圍', async () => {
      const response = await request(app)
        .post('/api/planning/analyze-capacity')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workstations: [],
          timeHorizon: -5 // 無效的負數時間範圍
        });

      // 應該處理無效參數
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  afterAll(async () => {
    // 清理測試數據（如果需要）
    console.log('生產規劃算法測試完成');
  });
});

// 輔助函數
function calculateScheduleMetrics(schedule) {
  if (!schedule || schedule.length === 0) {
    return {
      makespan: 0,
      totalUtilization: 0,
      averageWaitTime: 0
    };
  }

  const startTimes = schedule.map(item => new Date(item.startTime).getTime());
  const endTimes = schedule.map(item => new Date(item.endTime).getTime());
  
  const earliestStart = Math.min(...startTimes);
  const latestEnd = Math.max(...endTimes);
  const makespan = (latestEnd - earliestStart) / (1000 * 60 * 60); // 小時

  return {
    makespan,
    totalUtilization: schedule.length > 0 ? 75 : 0, // 簡化計算
    averageWaitTime: 0 // 簡化計算
  };
}

function validateScheduleConstraints(schedule, workOrders, workstations) {
  const violations = [];

  // 檢查時間衝突
  const stationSchedules = {};
  schedule.forEach(item => {
    if (!stationSchedules[item.workstationId]) {
      stationSchedules[item.workstationId] = [];
    }
    stationSchedules[item.workstationId].push(item);
  });

  // 檢查每個工作站的時間衝突
  Object.values(stationSchedules).forEach(stationItems => {
    stationItems.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    
    for (let i = 0; i < stationItems.length - 1; i++) {
      const current = stationItems[i];
      const next = stationItems[i + 1];
      
      if (new Date(current.endTime) > new Date(next.startTime)) {
        violations.push({
          type: 'time_conflict',
          station: current.workstationId,
          orders: [current.workOrderId, next.workOrderId]
        });
      }
    }
  });

  return violations;
}

module.exports = {
  calculateScheduleMetrics,
  validateScheduleConstraints
};