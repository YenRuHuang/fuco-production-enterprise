/**
 * FUCO Test Agent - 效率統計 API 整合測試
 * 企業級整合測試套件 - 使用 Jest 框架
 * 
 * generate_api_tests: 為所有效率 API 端點生成整合測試
 * 端點包括：
 * - /api/efficiency/daily
 * - /api/efficiency/weekly  
 * - /api/efficiency/trends
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// 模擬完整的後端應用
jest.mock('../../src/backend/middleware/auth', () => ({
  requirePermission: (permissions) => (req, res, next) => {
    req.user = {
      id: 'integration-test-user',
      name: 'Integration Test User',
      permissions: ['reports:read', 'efficiency:read', ...permissions]
    };
    req.startTime = Date.now();
    next();
  }
}));

// 導入完整的效率路由
const efficiencyRouter = require('../../src/backend/routes/efficiency');

// 創建完整的測試應用
const app = express();
app.use(express.json());
app.use('/api/efficiency', efficiencyRouter);

describe('FUCO Test Agent - Efficiency API Integration Tests', () => {
  
  describe('API 端點可用性測試', () => {
    
    it('所有效率 API 端點應該可訪問', async () => {
      const endpoints = [
        '/api/efficiency/daily',
        '/api/efficiency/weekly',
        '/api/efficiency/trends'
      ];
      
      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).not.toBe(404);
        console.log(`✓ ${endpoint} - Status: ${response.status}`);
      }
    });
  });
  
  describe('GET /api/efficiency/daily - 每日效率統計', () => {
    
    it('應該返回完整的每日效率數據', async () => {
      const response = await request(app)
        .get('/api/efficiency/daily')
        .expect(200);
      
      expect(response.body).toMatchObject({
        success: true,
        message: '每日生產效率統計獲取成功',
        data: expect.objectContaining({
          date: expect.any(String),
          overall: expect.objectContaining({
            totalProduction: expect.any(Number),
            targetProduction: 1000,
            efficiency: expect.any(Number),
            qualityRate: expect.any(Number),
            downtime: expect.any(Number),
            oee: expect.any(Number)
          }),
          workstations: expect.arrayContaining([
            expect.objectContaining({
              station: expect.any(String),
              production: expect.any(Number),
              target: expect.any(Number),
              efficiency: expect.any(Number),
              qualityRate: expect.any(Number),
              downtime: expect.any(Number),
              operator: expect.any(String),
              status: expect.stringMatching(/^(good|warning|critical)$/)
            })
          ]),
          shifts: expect.arrayContaining([
            expect.objectContaining({
              shift: expect.stringMatching(/^(早班|中班|夜班)$/),
              production: expect.any(Number),
              target: expect.any(Number),
              efficiency: expect.any(Number),
              qualityRate: expect.any(Number),
              downtime: expect.any(Number),
              startTime: expect.any(String),
              endTime: expect.any(String)
            })
          ]),
          trends: expect.objectContaining({
            hourlyProduction: expect.any(Array),
            efficiencyTrend: expect.any(Array),
            qualityTrend: expect.any(Array)
          })
        }),
        metadata: expect.objectContaining({
          requestDate: expect.any(String),
          filters: expect.any(Object),
          dataSource: 'mock',
          executionTime: expect.stringMatching(/^\d+ms$/),
          user: 'Integration Test User',
          timestamp: expect.any(String)
        })
      });
    });
    
    it('應該支持日期過濾參數', async () => {
      const testDate = '2025-01-15';
      const response = await request(app)
        .get(`/api/efficiency/daily?date=${testDate}`)
        .expect(200);
      
      expect(response.body.data.date).toBe(testDate);
      expect(response.body.metadata.requestDate).toBe(testDate);
    });
    
    it('應該支持工作站過濾參數', async () => {
      const workstation = 'B';
      const response = await request(app)
        .get(`/api/efficiency/daily?workstation=${workstation}`)
        .expect(200);
      
      expect(response.body.data.workstations).toHaveLength(1);
      expect(response.body.data.workstations[0].station).toBe(workstation);
      expect(response.body.metadata.filters.workstation).toBe(workstation);
    });
    
    it('應該支持班次過濾參數', async () => {
      const shift = '中班';
      const response = await request(app)
        .get(`/api/efficiency/daily?shift=${shift}`)
        .expect(200);
      
      expect(response.body.data.shifts).toHaveLength(1);
      expect(response.body.data.shifts[0].shift).toBe(shift);
      expect(response.body.metadata.filters.shift).toBe(shift);
    });
    
    it('應該支持組合過濾參數', async () => {
      const response = await request(app)
        .get('/api/efficiency/daily?date=2025-01-15&workstation=A&shift=早班')
        .expect(200);
      
      expect(response.body.data.date).toBe('2025-01-15');
      expect(response.body.data.workstations).toHaveLength(1);
      expect(response.body.data.workstations[0].station).toBe('A');
      expect(response.body.data.shifts).toHaveLength(1);
      expect(response.body.data.shifts[0].shift).toBe('早班');
    });
  });
  
  describe('GET /api/efficiency/weekly - 週效率統計', () => {
    
    it('應該返回完整的週效率數據', async () => {
      const response = await request(app)
        .get('/api/efficiency/weekly')
        .expect(200);
      
      expect(response.body).toMatchObject({
        success: true,
        message: '週生產效率統計獲取成功',
        data: expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String),
          summary: expect.objectContaining({
            totalProduction: expect.any(Number),
            targetProduction: 7000,
            averageEfficiency: expect.any(Number),
            averageQualityRate: expect.any(Number),
            totalDowntime: expect.any(Number),
            averageOEE: expect.any(Number)
          }),
          dailyData: expect.arrayContaining([
            expect.objectContaining({
              date: expect.any(String),
              dayOfWeek: expect.stringMatching(/^[日一二三四五六]$/),
              production: expect.any(Number),
              efficiency: expect.any(Number),
              qualityRate: expect.any(Number),
              downtime: expect.any(Number),
              oee: expect.any(Number)
            })
          ]),
          workstationSummary: expect.arrayContaining([
            expect.objectContaining({
              station: expect.any(String),
              weeklyProduction: expect.any(Number),
              weeklyTarget: expect.any(Number),
              efficiency: expect.any(Number),
              averageQualityRate: expect.any(Number),
              totalDowntime: expect.any(Number),
              bestDay: expect.any(String),
              worstDay: expect.any(String)
            })
          ]),
          shiftSummary: expect.arrayContaining([
            expect.objectContaining({
              shift: expect.stringMatching(/^(早班|中班|夜班)$/),
              weeklyProduction: expect.any(Number),
              weeklyTarget: expect.any(Number),
              efficiency: expect.any(Number),
              averageQualityRate: expect.any(Number),
              totalDowntime: expect.any(Number)
            })
          ]),
          trends: expect.objectContaining({
            dailyEfficiency: expect.any(Array),
            dailyQuality: expect.any(Array),
            weeklyComparison: expect.objectContaining({
              currentWeek: expect.any(Object),
              previousWeek: expect.any(Object),
              changes: expect.any(Object)
            })
          })
        }),
        metadata: expect.objectContaining({
          weekStart: expect.any(String),
          weekEnd: expect.any(String),
          filters: expect.any(Object),
          dataSource: 'mock',
          executionTime: expect.stringMatching(/^\d+ms$/),
          user: 'Integration Test User',
          timestamp: expect.any(String)
        })
      });
      
      // 驗證週數據結構
      expect(response.body.data.dailyData).toHaveLength(7);
      expect(response.body.data.workstationSummary).toHaveLength(5);
      expect(response.body.data.shiftSummary).toHaveLength(3);
    });
    
    it('應該支持日期參數（週開始計算）', async () => {
      const testDate = '2025-01-15'; // 週三
      const response = await request(app)
        .get(`/api/efficiency/weekly?date=${testDate}`)
        .expect(200);
      
      // 驗證週開始日期是週一
      const weekStart = new Date(response.body.data.startDate);
      expect(weekStart.getDay()).toBe(1); // 週一 = 1
      
      expect(response.body.metadata.weekStart).toBe(response.body.data.startDate);
    });
    
    it('應該支持工作站過濾', async () => {
      const workstation = 'C';
      const response = await request(app)
        .get(`/api/efficiency/weekly?workstation=${workstation}`)
        .expect(200);
      
      expect(response.body.data.workstationSummary).toHaveLength(1);
      expect(response.body.data.workstationSummary[0].station).toBe(workstation);
    });
    
    it('應該支持摘要格式', async () => {
      const response = await request(app)
        .get('/api/efficiency/weekly?format=summary')
        .expect(200);
      
      expect(response.body.data).toHaveProperty('startDate');
      expect(response.body.data).toHaveProperty('endDate');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('trends');
      expect(response.body.data.trends).toHaveProperty('weeklyComparison');
      
      // 摘要格式不應包含詳細數據
      expect(response.body.data).not.toHaveProperty('dailyData');
      expect(response.body.data).not.toHaveProperty('workstationSummary');
      expect(response.body.data).not.toHaveProperty('shiftSummary');
    });
  });
  
  describe('GET /api/efficiency/trends - 效率趨勢分析', () => {
    
    it('應該返回預設趨勢數據（7天效率）', async () => {
      const response = await request(app)
        .get('/api/efficiency/trends')
        .expect(200);
      
      expect(response.body).toMatchObject({
        success: true,
        message: '效率趨勢分析獲取成功',
        data: expect.objectContaining({
          period: '7d',
          metric: 'efficiency',
          data: expect.arrayContaining([
            expect.objectContaining({
              date: expect.any(String),
              value: expect.any(Number)
            })
          ]),
          statistics: expect.objectContaining({
            average: expect.any(Number),
            max: expect.any(Number),
            min: expect.any(Number),
            trend: expect.stringMatching(/^(increasing|decreasing|stable)$/)
          })
        }),
        metadata: expect.objectContaining({
          requestedPeriod: '7d',
          requestedMetric: 'efficiency',
          dataPoints: 7,
          user: 'Integration Test User',
          timestamp: expect.any(String)
        })
      });
      
      expect(response.body.data.data).toHaveLength(7);
    });
    
    it('應該支持不同時間範圍參數', async () => {
      const periods = ['7d', '30d', '90d'];
      
      for (const period of periods) {
        const response = await request(app)
          .get(`/api/efficiency/trends?period=${period}`)
          .expect(200);
        
        expect(response.body.data.period).toBe(period);
        expect(response.body.data.data).toHaveLength(parseInt(period));
        expect(response.body.metadata.requestedPeriod).toBe(period);
        expect(response.body.metadata.dataPoints).toBe(parseInt(period));
      }
    });
    
    it('應該支持不同指標參數', async () => {
      const metrics = ['efficiency', 'quality', 'oee', 'production'];
      
      for (const metric of metrics) {
        const response = await request(app)
          .get(`/api/efficiency/trends?metric=${metric}`)
          .expect(200);
        
        expect(response.body.data.metric).toBe(metric);
        expect(response.body.metadata.requestedMetric).toBe(metric);
        
        // 驗證數據值在合理範圍內
        response.body.data.data.forEach(point => {
          switch (metric) {
            case 'efficiency':
            case 'quality':
            case 'oee':
              expect(point.value).toBeGreaterThanOrEqual(0);
              expect(point.value).toBeLessThanOrEqual(100);
              break;
            case 'production':
              expect(point.value).toBeGreaterThanOrEqual(0);
              break;
          }
        });
      }
    });
    
    it('應該正確計算趨勢統計', async () => {
      const response = await request(app)
        .get('/api/efficiency/trends?period=30d&metric=efficiency')
        .expect(200);
      
      const { data, statistics } = response.body.data;
      
      // 驗證統計計算
      const values = data.map(point => point.value);
      const calculatedMax = Math.max(...values);
      const calculatedMin = Math.min(...values);
      const calculatedAvg = Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);
      
      expect(statistics.max).toBe(calculatedMax);
      expect(statistics.min).toBe(calculatedMin);
      expect(statistics.average).toBe(calculatedAvg);
      
      // 驗證趨勢計算邏輯
      expect(['increasing', 'decreasing', 'stable']).toContain(statistics.trend);
    });
    
    it('應該拒絕無效的時間範圍參數', async () => {
      const response = await request(app)
        .get('/api/efficiency/trends?period=invalid')
        .expect(400);
      
      expect(response.body).toMatchObject({
        success: false,
        code: 'INVALID_PERIOD',
        message: '無效的時間範圍參數',
        validValues: ['7d', '30d', '90d']
      });
    });
    
    it('應該拒絕無效的指標參數', async () => {
      const response = await request(app)
        .get('/api/efficiency/trends?metric=invalid')
        .expect(400);
      
      expect(response.body).toMatchObject({
        success: false,
        code: 'INVALID_METRIC',
        message: '無效的指標參數',
        validValues: ['efficiency', 'quality', 'oee', 'production']
      });
    });
  });
  
  describe('API 整合流程測試', () => {
    
    it('應該能夠順序調用所有 API 並保持一致性', async () => {
      const testDate = '2025-01-15';
      
      // 1. 獲取每日數據
      const dailyResponse = await request(app)
        .get(`/api/efficiency/daily?date=${testDate}`)
        .expect(200);
      
      // 2. 獲取該日所在週的數據
      const weeklyResponse = await request(app)
        .get(`/api/efficiency/weekly?date=${testDate}`)
        .expect(200);
      
      // 3. 獲取趨勢數據
      const trendsResponse = await request(app)
        .get('/api/efficiency/trends?period=7d&metric=efficiency')
        .expect(200);
      
      // 驗證數據一致性
      expect(dailyResponse.body.success).toBe(true);
      expect(weeklyResponse.body.success).toBe(true);
      expect(trendsResponse.body.success).toBe(true);
      
      // 檢查日期是否在週範圍內
      const weekStart = new Date(weeklyResponse.body.data.startDate);
      const weekEnd = new Date(weeklyResponse.body.data.endDate);
      const targetDate = new Date(testDate);
      
      expect(targetDate).toBeGreaterThanOrEqual(weekStart);
      expect(targetDate).toBeLessThanOrEqual(weekEnd);
      
      // 檢查每日數據是否包含在週數據中
      const dailyFound = weeklyResponse.body.data.dailyData.some(
        day => day.date === testDate
      );
      expect(dailyFound).toBe(true);
    });
    
    it('應該支持並發 API 調用', async () => {
      const promises = [
        request(app).get('/api/efficiency/daily'),
        request(app).get('/api/efficiency/weekly'),
        request(app).get('/api/efficiency/trends'),
        request(app).get('/api/efficiency/daily?workstation=A'),
        request(app).get('/api/efficiency/weekly?format=summary')
      ];
      
      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        console.log(`✓ 並發請求 ${index + 1} 成功`);
      });
    });
  });
  
  describe('錯誤處理整合測試', () => {
    
    it('所有端點都應該正確處理無效參數', async () => {
      const invalidRequests = [
        { endpoint: '/api/efficiency/daily', params: '?date=invalid' },
        { endpoint: '/api/efficiency/daily', params: '?workstation=Z' },
        { endpoint: '/api/efficiency/daily', params: '?shift=invalid' },
        { endpoint: '/api/efficiency/weekly', params: '?date=2030-12-31' },
        { endpoint: '/api/efficiency/weekly', params: '?workstation=Z' },
        { endpoint: '/api/efficiency/trends', params: '?period=invalid' },
        { endpoint: '/api/efficiency/trends', params: '?metric=invalid' }
      ];
      
      for (const { endpoint, params } of invalidRequests) {
        const response = await request(app).get(endpoint + params);
        
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('code');
        expect(response.body).toHaveProperty('message');
        
        console.log(`✓ ${endpoint}${params} - 錯誤處理正確 (${response.status})`);
      }
    });
  });
  
  describe('性能與負載測試', () => {
    
    it('所有 API 端點應該在合理時間內響應', async () => {
      const endpoints = [
        '/api/efficiency/daily',
        '/api/efficiency/weekly', 
        '/api/efficiency/trends'
      ];
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get(endpoint)
          .expect(200);
        
        const responseTime = Date.now() - startTime;
        
        expect(responseTime).toBeLessThan(500); // 500ms 閾值
        expect(response.body.metadata.executionTime).toMatch(/^\d+ms$/);
        
        console.log(`✓ ${endpoint} - 響應時間: ${responseTime}ms`);
      }
    });
    
    it('應該能夠處理快速連續請求', async () => {
      const endpoint = '/api/efficiency/daily';
      const requestCount = 10;
      
      const startTime = Date.now();
      
      const promises = Array(requestCount).fill().map(() =>
        request(app).get(endpoint).expect(200)
      );
      
      const responses = await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / requestCount;
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
      
      expect(avgTime).toBeLessThan(100); // 平均每個請求不超過100ms
      console.log(`✓ ${requestCount} 個連續請求完成，平均時間: ${avgTime.toFixed(2)}ms`);
    });
  });
  
  describe('數據一致性測試', () => {
    
    it('相同參數的重複請求應該返回一致的結果', async () => {
      const testParams = '?date=2025-01-01&workstation=A';
      
      const response1 = await request(app)
        .get('/api/efficiency/daily' + testParams)
        .expect(200);
      
      const response2 = await request(app)
        .get('/api/efficiency/daily' + testParams)
        .expect(200);
      
      // 除了時間戳，其他數據應該完全一致
      expect(response1.body.data).toEqual(response2.body.data);
      expect(response1.body.message).toBe(response2.body.message);
      expect(response1.body.success).toBe(response2.body.success);
    });
    
    it('模擬數據應該符合業務邏輯約束', async () => {
      const response = await request(app)
        .get('/api/efficiency/weekly')
        .expect(200);
      
      const { data } = response.body;
      
      // 週總產量應該等於每日產量總和
      const calculatedTotal = data.dailyData.reduce(
        (sum, day) => sum + day.production, 0
      );
      expect(data.summary.totalProduction).toBe(calculatedTotal);
      
      // 平均效率應該在合理範圍內
      expect(data.summary.averageEfficiency).toBeGreaterThanOrEqual(0);
      expect(data.summary.averageEfficiency).toBeLessThanOrEqual(200);
      
      // 品質率應該在90-100%之間
      expect(data.summary.averageQualityRate).toBeGreaterThanOrEqual(90);
      expect(data.summary.averageQualityRate).toBeLessThanOrEqual(100);
    });
  });
});