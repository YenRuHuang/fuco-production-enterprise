/**
 * FUCO Production System - Main Server
 * 企業級生產管理系統後端伺服器
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// 引入自定義模組
const { initDatabase } = require('./config/database');
const { logger } = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware: authenticateToken } = require('./middleware/auth');

// 引入路由
const authRoutes = require('./routes/auth');
const workstationRoutes = require('./routes/workstation');
const workOrderRoutes = require('./routes/workOrder');
const productionRoutes = require('./routes/production');
const defectRoutes = require('./routes/defect');
const bomRoutes = require('./routes/bom');
const reportRoutes = require('./routes/report');
const adminRoutes = require('./routes/admin');
const efficiencyRoutes = require('./routes/efficiency');
const planningRoutes = require('./routes/planning');

// 初始化 Express 應用
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8848'],
    credentials: true
  }
});

// 基礎配置
const PORT = process.env.APP_PORT || 8847;
const HOST = process.env.APP_HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'production';

// ========================================
// 中間件配置
// ========================================

// 安全性中間件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS 配置
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8848'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// 壓縮
app.use(compression());

// 請求解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 速率限制
if (process.env.RATE_LIMIT_ENABLED === 'true') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: '請求過於頻繁，請稍後再試',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);
}

// 靜態檔案服務
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
app.use('/sop-images', express.static(path.join(__dirname, '../../uploads/sop-images')));
app.use('/', express.static(path.join(__dirname, '../frontend')));

// 請求日誌
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  next();
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
    environment: NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0',
  });
});

// API 根路徑
app.get('/api', (req, res) => {
  res.json({
    name: 'FUCO Production System API',
    version: process.env.APP_VERSION || '1.0.0',
    status: 'operational',
    documentation: '/api/docs',
  });
});

// 認證路由（不需要 token）
app.use('/api/auth', authRoutes);

// 受保護的路由（需要 token）
app.use('/api/workstations', authenticateToken, workstationRoutes);
app.use('/api/work-orders', authenticateToken, workOrderRoutes);
app.use('/api/production', authenticateToken, productionRoutes);
app.use('/api/defects', authenticateToken, defectRoutes);
app.use('/api/bom', authenticateToken, bomRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/efficiency', authenticateToken, efficiencyRoutes);
app.use('/api/planning', authenticateToken, planningRoutes);

// ========================================
// WebSocket 配置
// ========================================

// WebSocket 連接管理
const connections = new Map();

io.on('connection', (socket) => {
  logger.info(`WebSocket 連接建立: ${socket.id}`);
  
  // 身份驗證
  socket.on('authenticate', (data) => {
    const { userId, workstationId } = data;
    connections.set(socket.id, { userId, workstationId, socket });
    
    // 加入房間
    if (workstationId) {
      socket.join(`workstation-${workstationId}`);
    }
    socket.join(`user-${userId}`);
    
    socket.emit('authenticated', { success: true });
  });
  
  // 生產數據更新
  socket.on('production-update', (data) => {
    const { workstationId, workOrderId, data: productionData } = data;
    
    // 廣播到相關工作站
    io.to(`workstation-${workstationId}`).emit('production-data', {
      workOrderId,
      data: productionData,
      timestamp: new Date().toISOString(),
    });
    
    // 記錄到資料庫（異步）
    saveProductionData(workOrderId, productionData).catch(err => {
      logger.error('保存生產數據失敗:', err);
    });
  });
  
  // 不良品報告
  socket.on('defect-report', (data) => {
    const { workstationId, defectData } = data;
    
    // 通知主管
    io.to('supervisor-room').emit('new-defect', {
      workstationId,
      defectData,
      timestamp: new Date().toISOString(),
    });
  });
  
  // 斷線處理
  socket.on('disconnect', () => {
    connections.delete(socket.id);
    logger.info(`WebSocket 斷線: ${socket.id}`);
  });
});

// 將 io 實例附加到 app，供路由使用
app.set('io', io);

// ========================================
// 錯誤處理
// ========================================

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: '請求的資源不存在',
    path: req.url,
  });
});

// 全域錯誤處理
app.use(errorHandler);

// ========================================
// 優雅關閉
// ========================================

const gracefulShutdown = async (signal) => {
  logger.info(`收到 ${signal} 信號，開始優雅關閉...`);
  
  // 停止接受新的連接
  server.close(() => {
    logger.info('HTTP 伺服器已關閉');
  });
  
  // 關閉 WebSocket 連接
  io.close(() => {
    logger.info('WebSocket 伺服器已關閉');
  });
  
  // 關閉資料庫連接
  try {
    await closeDatabase();
    logger.info('資料庫連接已關閉');
  } catch (err) {
    logger.error('關閉資料庫連接失敗:', err);
  }
  
  // 等待所有異步操作完成
  setTimeout(() => {
    logger.info('優雅關閉完成');
    process.exit(0);
  }, 5000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ========================================
// 啟動伺服器
// ========================================

const startServer = async () => {
  try {
    // 初始化資料庫
    await initDatabase();
    logger.info('資料庫連接成功');
    
    // 啟動 HTTP 伺服器
    server.listen(PORT, HOST, () => {
      logger.info(`
        ========================================
        FUCO Production System Server
        ========================================
        環境: ${NODE_ENV}
        地址: http://${HOST}:${PORT}
        API: http://${HOST}:${PORT}/api
        健康檢查: http://${HOST}:${PORT}/health
        WebSocket: ws://${HOST}:${PORT}
        ========================================
      `);
    });
    
  } catch (error) {
    logger.error('伺服器啟動失敗:', error);
    process.exit(1);
  }
};

// 處理未捕獲的異常
process.on('uncaughtException', (error) => {
  logger.error('未捕獲的異常:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未處理的 Promise 拒絕:', reason);
  gracefulShutdown('unhandledRejection');
});

// 輔助函數（示例）
async function saveProductionData(workOrderId, data) {
  // 實際的資料庫保存邏輯
  // 這裡只是示例
  logger.info(`保存生產數據: 工單 ${workOrderId}`);
}

async function closeDatabase() {
  // 實際的資料庫關閉邏輯
  logger.info('關閉資料庫連接...');
}

// 啟動伺服器
startServer();

module.exports = app;
