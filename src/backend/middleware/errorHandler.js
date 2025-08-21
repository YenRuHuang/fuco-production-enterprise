/**
 * FUCO Production System - 全域錯誤處理中間件
 * 統一處理應用程式錯誤，提供一致的錯誤回應格式
 */

/**
 * 自定義錯誤類別
 */
class APIError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 業務邏輯錯誤
 */
class BusinessError extends APIError {
  constructor(message, code = 'BUSINESS_ERROR') {
    super(message, 400, code);
  }
}

/**
 * 驗證錯誤
 */
class ValidationError extends APIError {
  constructor(message, details = null, code = 'VALIDATION_ERROR') {
    super(message, 400, code);
    this.details = details;
  }
}

/**
 * 權限錯誤
 */
class AuthorizationError extends APIError {
  constructor(message = '權限不足', code = 'AUTHORIZATION_ERROR') {
    super(message, 403, code);
  }
}

/**
 * 資源未找到錯誤
 */
class NotFoundError extends APIError {
  constructor(message = '資源不存在', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

/**
 * 資料庫錯誤
 */
class DatabaseError extends APIError {
  constructor(message = '資料庫操作失敗', originalError = null, code = 'DATABASE_ERROR') {
    super(message, 500, code);
    this.originalError = originalError;
  }
}

/**
 * 格式化錯誤回應
 * @param {Error} error 錯誤對象
 * @param {Object} req 請求對象
 * @returns {Object} 格式化的錯誤回應
 */
function formatErrorResponse(error, req) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response = {
    success: false,
    message: error.message || '內部伺服器錯誤',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    requestId: req.id || generateRequestId()
  };
  
  // 在開發環境下提供更多錯誤詳情
  if (isDevelopment) {
    response.stack = error.stack;
    
    if (error.details) {
      response.details = error.details;
    }
    
    if (error.originalError) {
      response.originalError = {
        message: error.originalError.message,
        stack: error.originalError.stack
      };
    }
  }
  
  // 記錄用戶資訊（如果有）
  if (req.user) {
    response.user = {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    };
  }
  
  return response;
}

/**
 * 生成請求 ID
 * @returns {string} 請求 ID
 */
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 記錄錯誤日誌
 * @param {Error} error 錯誤對象
 * @param {Object} req 請求對象
 */
function logError(error, req) {
  const logLevel = error.statusCode >= 500 ? 'error' : 'warn';
  
  const logData = {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id || generateRequestId(),
    timestamp: new Date().toISOString()
  };
  
  if (req.user) {
    logData.user = {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    };
  }
  
  if (error.stack) {
    logData.stack = error.stack;
  }
  
  // 使用 console 記錄（實際應用中應使用專業日誌庫如 winston）
  if (logLevel === 'error') {
    console.error('API 錯誤:', logData);
  } else {
    console.warn('API 警告:', logData);
  }
}

/**
 * 主要錯誤處理中間件
 * @param {Error} error 錯誤對象
 * @param {Object} req 請求對象
 * @param {Object} res 回應對象
 * @param {Function} next 下一個中間件
 */
function errorHandler(error, req, res, next) {
  // 如果回應已經發送，委託給預設的 Express 錯誤處理器
  if (res.headersSent) {
    return next(error);
  }
  
  let processedError = error;
  
  // 處理特定類型的錯誤
  if (error.name === 'ValidationError') {
    processedError = new ValidationError(error.message, error.details);
  } else if (error.name === 'CastError') {
    processedError = new ValidationError('無效的資料格式');
  } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
    processedError = new DatabaseError('資料庫操作失敗', error);
  } else if (error.name === 'JsonWebTokenError') {
    processedError = new AuthorizationError('無效的認證令牌');
  } else if (error.name === 'TokenExpiredError') {
    processedError = new AuthorizationError('認證令牌已過期');
  } else if (error.code === 'ENOTFOUND') {
    processedError = new APIError('網路連接失敗', 503, 'NETWORK_ERROR');
  } else if (error.code === 'ECONNREFUSED') {
    processedError = new APIError('服務暫時無法使用', 503, 'SERVICE_UNAVAILABLE');
  } else if (!error.isOperational) {
    // 未預期的錯誤，轉換為通用錯誤
    processedError = new APIError(
      process.env.NODE_ENV === 'production' ? '內部伺服器錯誤' : error.message,
      500,
      'INTERNAL_ERROR'
    );
  }
  
  // 記錄錯誤
  logError(processedError, req);
  
  // 格式化並發送錯誤回應
  const errorResponse = formatErrorResponse(processedError, req);
  const statusCode = processedError.statusCode || 500;
  
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 錯誤處理中間件
 * @param {Object} req 請求對象
 * @param {Object} res 回應對象
 * @param {Function} next 下一個中間件
 */
function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`路由 ${req.method} ${req.path} 不存在`);
  next(error);
}

/**
 * 異步錯誤捕獲包裝器
 * @param {Function} fn 異步函數
 * @returns {Function} 包裝後的函數
 */
function asyncErrorHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 未捕獲異常處理器
 */
function setupGlobalErrorHandlers() {
  // 未捕獲的 Promise 拒絕
  process.on('unhandledRejection', (reason, promise) => {
    console.error('未處理的 Promise 拒絕:', reason);
    console.error('在:', promise);
    
    // 優雅關閉應用程式
    process.exit(1);
  });
  
  // 未捕獲的異常
  process.on('uncaughtException', (error) => {
    console.error('未捕獲的異常:', error);
    
    // 優雅關閉應用程式
    process.exit(1);
  });
}

module.exports = {
  // 錯誤類別
  APIError,
  BusinessError,
  ValidationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  
  // 中間件
  errorHandler,
  notFoundHandler,
  asyncErrorHandler,
  
  // 工具函數
  formatErrorResponse,
  logError,
  setupGlobalErrorHandlers
};