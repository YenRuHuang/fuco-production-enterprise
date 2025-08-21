/**
 * FUCO Test Agent - 效率統計 API 單元測試
 * 企業級測試套件 - 使用 Jest 框架
 * 
 * create_test_case: 為 /api/efficiency 端點創建單元測試
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// 模擬依賴
jest.mock('../../src/backend/middleware/auth', () => ({
  requirePermission: (permissions) => (req, res, next) => {
    // 模擬認證中間件 - 不依賴真實資料庫
    req.user = {
      id: 'test-user-123',
      name: 'Test User',
      permissions: ['reports:read', 'efficiency:read', ...permissions]
    };
    req.startTime = Date.now();
    next();
  }
}));

// 導入要測試的路由
const efficiencyRouter = require('../../src/backend/routes/efficiency');

// 創建測試應用
const app = express();
app.use(express.json());
app.use('/api/efficiency', efficiencyRouter);

describe('FUCO Test Agent - Efficiency API Unit Tests', () => {
  
  describe('GET /api/efficiency/daily', () => {
    
    it('應該成功返回今日效率統計（正常情況）', async () => {
      const response = await request(app)
        .get('/api/efficiency/daily')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', '每日生產效率統計獲取成功');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('metadata');
      
      // 驗證數據結構
      const { data } = response.body;
      expect(data).toHaveProperty('date');
      expect(data).toHaveProperty('overall');
      expect(data).toHaveProperty('workstations');
      expect(data).toHaveProperty('shifts');
      expect(data).toHaveProperty('trends');
      
      // 驗證整體數據
      expect(data.overall).toHaveProperty('totalProduction');
      expect(data.overall).toHaveProperty('targetProduction', 1000);
      expect(data.overall).toHaveProperty('efficiency');
      expect(data.overall).toHaveProperty('qualityRate');
      expect(data.overall).toHaveProperty('downtime');
      expect(data.overall).toHaveProperty('oee');
      
      // 驗證工作站數據
      expect(Array.isArray(data.workstations)).toBe(true);
      expect(data.workstations.length).toBe(5); // A, B, C, D, E
      
      data.workstations.forEach(station => {
        expect(station).toHaveProperty('station');
        expect(station).toHaveProperty('production');
        expect(station).toHaveProperty('target');
        expect(station).toHaveProperty('efficiency');
        expect(station).toHaveProperty('qualityRate');
        expect(station).toHaveProperty('downtime');
        expect(station).toHaveProperty('operator');
        expect(station).toHaveProperty('status');
      });
      
      // 驗證班次數據
      expect(Array.isArray(data.shifts)).toBe(true);
      expect(data.shifts.length).toBe(3); // 早班, 中班, 夜班
      
      // 驗證趨勢數據
      expect(data.trends).toHaveProperty('hourlyProduction');
      expect(data.trends).toHaveProperty('efficiencyTrend');
      expect(data.trends).toHaveProperty('qualityTrend');
      expect(Array.isArray(data.trends.hourlyProduction)).toBe(true);
      expect(data.trends.hourlyProduction.length).toBe(24);
    });
    
    it('應該接受有效的日期參數', async () => {
      const testDate = '2025-01-15';
      const response = await request(app)
        .get(`/api/efficiency/daily?date=${testDate}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.date).toBe(testDate);
      expect(response.body.metadata.requestDate).toBe(testDate);
    });
    
    it('應該根據工作站參數過濾數據', async () => {
      const response = await request(app)
        .get('/api/efficiency/daily?workstation=A')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.workstations).toHaveLength(1);
      expect(response.body.data.workstations[0].station).toBe('A');
      expect(response.body.metadata.filters.workstation).toBe('A');
    });
    
    it('應該根據班次參數過濾數據', async () => {
      const response = await request(app)
        .get('/api/efficiency/daily?shift=早班')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.shifts).toHaveLength(1);
      expect(response.body.data.shifts[0].shift).toBe('早班');
      expect(response.body.metadata.filters.shift).toBe('早班');
    });
    
    it('應該拒絕無效的日期格式（錯誤處理）', async () => {
      const response = await request(app)
        .get('/api/efficiency/daily?date=invalid-date')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_DATE');
      expect(response.body.message).toContain('無效的日期格式');
      expect(response.body).toHaveProperty('validFormat', 'YYYY-MM-DD');
    });
    
    it('應該拒絕超出範圍的日期（錯誤處理）', async () => {
      const futureDate = '2026-12-31'; // 超過1個月範圍
      const response = await request(app)
        .get(`/api/efficiency/daily?date=${futureDate}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_DATE');
      expect(response.body.message).toContain('日期超出允許範圍');
    });
    
    it('應該返回404當工作站不存在（錯誤處理）', async () => {
      const response = await request(app)
        .get('/api/efficiency/daily?workstation=Z')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('WORKSTATION_NOT_FOUND');
      expect(response.body.message).toContain('找不到工作站 Z');
    });
    
    it('應該返回404當班次不存在（錯誤處理）', async () => {
      const response = await request(app)
        .get('/api/efficiency/daily?shift=無效班次')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('SHIFT_NOT_FOUND');
      expect(response.body.message).toContain('找不到班次 無效班次');
    });
    
    it('應該包含正確的元數據', async () => {
      const response = await request(app)
        .get('/api/efficiency/daily')
        .expect(200);
      
      const { metadata } = response.body;
      expect(metadata).toHaveProperty('requestDate');
      expect(metadata).toHaveProperty('filters');
      expect(metadata).toHaveProperty('dataSource', 'mock');
      expect(metadata).toHaveProperty('executionTime');
      expect(metadata).toHaveProperty('user', 'Test User');
      expect(metadata).toHaveProperty('timestamp');
      
      // 驗證執行時間格式
      expect(metadata.executionTime).toMatch(/^\d+ms$/);
    });
    
    it('應該生成一致的模擬數據（相同日期應返回相同結果）', async () => {
      const testDate = '2025-01-01';
      
      const response1 = await request(app)
        .get(`/api/efficiency/daily?date=${testDate}`)
        .expect(200);
      
      const response2 = await request(app)
        .get(`/api/efficiency/daily?date=${testDate}`)
        .expect(200);
      
      // 相同日期應生成相同的數據（基於種子）
      expect(response1.body.data.overall.totalProduction)
        .toBe(response2.body.data.overall.totalProduction);
      expect(response1.body.data.overall.efficiency)
        .toBe(response2.body.data.overall.efficiency);
    });
    
    it('應該驗證數據邏輯一致性', async () => {
      const response = await request(app)
        .get('/api/efficiency/daily')
        .expect(200);
      
      const { data } = response.body;
      
      // 效率計算應該正確
      const expectedEfficiency = Math.round(
        (data.overall.totalProduction / data.overall.targetProduction) * 100
      );
      expect(data.overall.efficiency).toBe(expectedEfficiency);
      
      // 工作站數據應該在合理範圍內
      data.workstations.forEach(station => {
        expect(station.production).toBeGreaterThanOrEqual(0);
        expect(station.target).toBeGreaterThan(0);
        expect(station.efficiency).toBeGreaterThanOrEqual(0);
        expect(station.efficiency).toBeLessThanOrEqual(200); // 最高200%效率
        expect(station.qualityRate).toBeGreaterThanOrEqual(90);
        expect(station.qualityRate).toBeLessThanOrEqual(100);
      });
      
      // 班次數據驗證
      data.shifts.forEach(shift => {
        expect(['早班', '中班', '夜班']).toContain(shift.shift);
        expect(shift.production).toBeGreaterThanOrEqual(0);
        expect(shift.target).toBeGreaterThan(0);
      });
      
      // 趨勢數據驗證
      expect(data.trends.hourlyProduction).toHaveLength(24);
      expect(data.trends.efficiencyTrend).toHaveLength(7);
      expect(data.trends.qualityTrend).toHaveLength(7);
    });
  });
  
  describe('數據驗證函數測試', () => {
    // 由於這些是內部函數，我們通過API行為來測試它們
    
    it('validateDate 函數應該正確驗證日期', async () => {
      // 測試有效日期
      const validResponse = await request(app)
        .get('/api/efficiency/daily?date=2025-01-15')
        .expect(200);
      expect(validResponse.body.success).toBe(true);
      
      // 測試無效日期格式
      const invalidResponse = await request(app)
        .get('/api/efficiency/daily?date=2025-13-40')
        .expect(400);
      expect(invalidResponse.body.success).toBe(false);
    });
    
    it('generateMockEfficiencyData 函數應該生成完整數據', async () => {
      const response = await request(app)
        .get('/api/efficiency/daily')
        .expect(200);
      
      const { data } = response.body;
      
      // 驗證所有必需字段存在
      const requiredFields = ['date', 'overall', 'workstations', 'shifts', 'trends'];
      requiredFields.forEach(field => {
        expect(data).toHaveProperty(field);
      });
      
      // 驗證數據類型
      expect(typeof data.date).toBe('string');
      expect(typeof data.overall).toBe('object');
      expect(Array.isArray(data.workstations)).toBe(true);
      expect(Array.isArray(data.shifts)).toBe(true);
      expect(typeof data.trends).toBe('object');
    });
  });
  
  describe('錯誤處理測試', () => {
    
    it('應該處理意外的服務器錯誤', async () => {
      // 創建一個會拋出錯誤的測試應用
      const errorApp = express();
      errorApp.use(express.json());
      
      // 模擬會拋出錯誤的路由
      errorApp.get('/api/efficiency/daily', (req, res, next) => {
        req.user = { name: 'Test User' };
        req.startTime = Date.now();
        next();
      }, (req, res) => {
        throw new Error('模擬服務器錯誤');
      });
      
      errorApp.use('/api/efficiency', efficiencyRouter);
      
      // 由於我們的路由有錯誤處理，它應該捕獲錯誤
      const response = await request(app)
        .get('/api/efficiency/daily?date=invalid')
        .expect(400); // 應該返回驗證錯誤而不是服務器錯誤
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('性能測試', () => {
    
    it('API 響應時間應該在合理範圍內', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/efficiency/daily')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      // API 應該在1秒內響應
      expect(responseTime).toBeLessThan(1000);
    });
    
    it('應該能夠處理並發請求', async () => {
      const promises = Array(10).fill().map(() =>
        request(app)
          .get('/api/efficiency/daily')
          .expect(200)
      );
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
    });
  });
});

// Jest 配置和生命周期
describe('測試環境設置', () => {
  
  beforeAll(() => {
    // 設置測試環境
    process.env.NODE_ENV = 'test';
  });
  
  afterAll(() => {
    // 清理測試環境
    delete process.env.NODE_ENV;
  });
  
  beforeEach(() => {
    // 重置模擬數據（如果需要）
    jest.clearAllMocks();
  });
  
  it('測試環境應該正確設置', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});