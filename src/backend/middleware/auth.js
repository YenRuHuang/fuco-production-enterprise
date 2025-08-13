/**
 * FUCO Production System - JWT 認證中間件
 * 處理用戶認證、權限驗證和 JWT Token 管理
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// JWT 密鑰 (生產環境應使用環境變數)
const JWT_SECRET = process.env.JWT_SECRET || 'fuco-production-system-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// 模擬用戶資料庫
const users = [
  {
    id: 1,
    username: 'admin',
    // 密碼: admin123 (bcrypt 加密)
    password: '$2a$10$yJytAjebVHzzf2KppTSBMuDC/V/7hbgbjXZCU90F1JFIgVnDN.JRS',
    name: '系統管理員',
    role: 'admin',
    permissions: ['*'],
    department: '資訊部',
    active: true
  },
  {
    id: 2,
    username: 'emp001',
    // 密碼: password (bcrypt 加密)
    password: '$2a$10$Sd2B4eIDsGLpRGmMUaK88OTlJuQL8osevMFY4rzPlrYi7g5tKwuhu',
    name: '張三',
    role: 'operator',
    permissions: ['workstation:read', 'workstation:write', 'production:write'],
    department: '生產部',
    workstation: 'A',
    active: true
  },
  {
    id: 3,
    username: 'supervisor',
    // 密碼: super123 (bcrypt 加密)
    password: '$2a$10$XAjchHTgXIp/eEZAUXtmOe108zrP3YXpFJL5o68BpdTi/FTFmDYz2',
    name: '李主管',
    role: 'supervisor', 
    permissions: ['workstation:*', 'production:*', 'reports:read'],
    department: '生產部',
    active: true
  },
  {
    id: 4,
    username: 'qc001',
    // 密碼: qc123 (bcrypt 加密)
    password: '$2a$10$Vc6F81vbKfAS/ayEFYsBGeqMOKBKYV1k9/LvP84NTsjCMGP2LXWNu',
    name: '王品管',
    role: 'quality',
    permissions: ['quality:*', 'reports:read', 'workstation:read'],
    department: '品質部',
    active: true
  }
];

/**
 * 生成 JWT Token
 * @param {Object} user 用戶資訊
 * @returns {string} JWT Token
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    department: user.department,
    permissions: user.permissions
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'fuco-production-system',
    audience: 'fuco-users'
  });
}

/**
 * 驗證 JWT Token
 * @param {string} token JWT Token
 * @returns {Object|null} 解析後的用戶資訊
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'fuco-production-system',
      audience: 'fuco-users'
    });
  } catch (error) {
    console.error('JWT 驗證失敗:', error.message);
    return null;
  }
}

/**
 * 用戶登入認證
 * @param {string} username 用戶名
 * @param {string} password 密碼
 * @returns {Object|null} 認證結果
 */
async function authenticateUser(username, password) {
  const user = users.find(u => u.username === username && u.active);
  
  if (!user) {
    return null;
  }
  
  const isValidPassword = await bcrypt.compare(password, user.password);
  
  if (!isValidPassword) {
    return null;
  }
  
  // 返回用戶資訊（不包含密碼）
  const { password: _, ...userInfo } = user;
  return userInfo;
}

/**
 * JWT 認證中間件
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '未提供有效的認證 Token',
      code: 'AUTH_TOKEN_MISSING'
    });
  }
  
  const token = authHeader.substring(7); // 移除 "Bearer " 前綴
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: '認證 Token 無效或已過期',
      code: 'AUTH_TOKEN_INVALID'
    });
  }
  
  // 檢查用戶是否仍然活躍
  const user = users.find(u => u.id === decoded.id && u.active);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: '用戶帳號已被停用',
      code: 'USER_INACTIVE'
    });
  }
  
  // 將用戶資訊附加到請求對象
  req.user = decoded;
  next();
}

/**
 * 權限檢查中間件
 * @param {string|Array} requiredPermissions 所需權限
 */
function requirePermission(requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '請先進行身份認證',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const userPermissions = req.user.permissions || [];
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    // 超級管理員擁有所有權限
    if (userPermissions.includes('*')) {
      return next();
    }
    
    // 檢查是否有所需權限
    const hasPermission = permissions.some(permission => {
      return userPermissions.some(userPerm => {
        // 完全匹配
        if (userPerm === permission) return true;
        
        // 萬用字元匹配 (例如: workstation:* 包含 workstation:read)
        const [module, action] = userPerm.split(':');
        const [reqModule] = permission.split(':');
        return module === reqModule && action === '*';
      });
    });
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '權限不足，無法執行此操作',
        code: 'PERMISSION_DENIED',
        required: permissions,
        current: userPermissions
      });
    }
    
    next();
  };
}

/**
 * 角色檢查中間件
 * @param {string|Array} requiredRoles 所需角色
 */
function requireRole(requiredRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '請先進行身份認證',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '角色權限不足',
        code: 'ROLE_DENIED',
        required: roles,
        current: req.user.role
      });
    }
    
    next();
  };
}

/**
 * 可選認證中間件（不強制要求認證）
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded) {
      req.user = decoded;
    }
  }
  
  next();
}

/**
 * 刷新 Token
 * @param {string} token 現有 Token
 * @returns {string|null} 新 Token
 */
function refreshToken(token) {
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return null;
  }
  
  const user = users.find(u => u.id === decoded.id && u.active);
  
  if (!user) {
    return null;
  }
  
  return generateToken(user);
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateUser,
  authMiddleware,
  requirePermission,
  requireRole,
  optionalAuth,
  refreshToken,
  users // 導出用於測試和管理
};
