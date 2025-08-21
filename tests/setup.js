/**
 * FUCO Test Agent - Jest 測試環境設置
 * 全域測試配置和模擬設置
 */

// 設置測試環境變數
process.env.NODE_ENV = 'test';
process.env.FUCO_TEST_MODE = 'true';
process.env.JWT_SECRET = 'test-secret-key';
process.env.TEST_DATABASE_URL = 'mock://test-database';

// 設置全域測試超時
jest.setTimeout(10000);

// 模擬 console 方法以減少測試輸出噪音
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error // 保留錯誤訊息用於偵錯
};

// 全域測試工具
global.testUtils = {
  // 生成測試用戶
  createTestUser: (permissions = ['reports:read', 'efficiency:read']) => ({
    id: 'test-user-' + Math.random().toString(36).substr(2, 9),
    name: 'Test User',
    email: 'test@fuco.com',
    permissions,
    createdAt: new Date().toISOString()
  }),
  
  // 生成測試日期
  createTestDate: (daysOffset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  },
  
  // 驗證 API 響應格式
  validateApiResponse: (response) => {
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('message');
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('metadata');
    
    if (response.metadata) {
      expect(response.metadata).toHaveProperty('timestamp');
      expect(response.metadata).toHaveProperty('user');
    }
  },
  
  // 驗證錯誤響應格式
  validateErrorResponse: (response) => {
    expect(response).toHaveProperty('success', false);
    expect(response).toHaveProperty('message');
    expect(response).toHaveProperty('code');
  },
  
  // 模擬認證中間件
  mockAuthMiddleware: (permissions = ['reports:read', 'efficiency:read']) => 
    (req, res, next) => {
      req.user = global.testUtils.createTestUser(permissions);
      req.startTime = Date.now();
      next();
    },
  
  // 等待異步操作
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // 驗證日期格式
  isValidDateString: (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
};

// 全域 beforeEach 設置
beforeEach(() => {
  // 重置所有模擬
  jest.clearAllMocks();
  
  // 重置時間模擬
  if (jest.isMockFunction(Date.now)) {
    Date.now.mockRestore();
  }
});

// 全域 afterEach 清理
afterEach(() => {
  // 清理任何設置的定時器
  jest.clearAllTimers();
});

// 測試完成後的清理
afterAll(() => {
  // 恢復 console
  global.console = originalConsole;
  
  // 清理環境變數
  delete process.env.FUCO_TEST_MODE;
  delete process.env.JWT_SECRET;
  delete process.env.TEST_DATABASE_URL;
});

// 自定義匹配器
expect.extend({
  // 驗證是否為有效的效率數據
  toBeValidEfficiencyData(received) {
    const pass = received &&
      typeof received === 'object' &&
      typeof received.date === 'string' &&
      typeof received.overall === 'object' &&
      Array.isArray(received.workstations) &&
      Array.isArray(received.shifts) &&
      typeof received.trends === 'object';
    
    if (pass) {
      return {
        message: () => `expected ${this.utils.printReceived(received)} not to be valid efficiency data`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${this.utils.printReceived(received)} to be valid efficiency data`,
        pass: false,
      };
    }
  },
  
  // 驗證覆蓋率是否達標
  toMeetCoverageThreshold(received, threshold) {
    const pass = typeof received === 'number' && received >= threshold;
    
    if (pass) {
      return {
        message: () => `expected coverage ${received}% not to meet threshold ${threshold}%`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected coverage ${received}% to meet threshold ${threshold}%`,
        pass: false,
      };
    }
  }
});

// 輸出測試環境信息
console.log('🧪 FUCO Test Agent - 測試環境已初始化');
console.log(`   Node.js: ${process.version}`);
console.log(`   環境: ${process.env.NODE_ENV}`);
console.log(`   測試模式: ${process.env.FUCO_TEST_MODE}`);