/**
 * FUCO Test Agent - Jest 測試框架配置
 * 企業級測試環境配置
 */

module.exports = {
  // 測試環境
  testEnvironment: 'node',
  
  // 測試文件路徑模式
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // 忽略的測試文件
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/build/',
    '/dist/'
  ],
  
  // 覆蓋率配置
  collectCoverage: true,
  collectCoverageFrom: [
    'src/backend/**/*.js',
    '!src/backend/**/*.test.js',
    '!src/backend/**/*.spec.js',
    '!**/node_modules/**'
  ],
  
  // 覆蓋率報告格式
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'json',
    'lcov'
  ],
  
  // 覆蓋率輸出目錄
  coverageDirectory: 'coverage',
  
  // 覆蓋率閾值 (analyze_test_coverage: threshold 80%)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // 效率模組特別要求
    'src/backend/routes/efficiency.js': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    }
  },
  
  // 設置文件
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // 模擬配置
  clearMocks: true,
  restoreMocks: true,
  
  // 測試超時
  testTimeout: 10000,
  
  // 詳細輸出
  verbose: true,
  
  // 測試結果報告
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test-reports',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'FUCO 測試報告'
      }
    ]
  ],
  
  // 全域變數
  globals: {
    'NODE_ENV': 'test',
    'FUCO_TEST_MODE': true
  },
  
  // 轉換配置
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // 模組目錄
  moduleDirectories: ['node_modules', 'src'],
  
  // 模組名稱映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@backend/(.*)$': '<rootDir>/src/backend/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  }
};