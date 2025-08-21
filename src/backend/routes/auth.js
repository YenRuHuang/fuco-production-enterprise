/**
 * FUCO Production System - 認證路由
 * 處理用戶登入、登出、token 刷新等認證相關功能
 */

const express = require('express');
const router = express.Router();
const { authenticateUser, generateToken, refreshToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * 用戶登入
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '請提供用戶名和密碼',
        code: 'MISSING_CREDENTIALS'
      });
    }
    
    const user = await authenticateUser(username, password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用戶名或密碼錯誤',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    const token = generateToken(user);
    
    res.json({
      success: true,
      message: '登入成功',
      data: {
        user,
        token,
        expiresIn: '8h'
      }
    });
    
  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({
      success: false,
      message: '登入時發生錯誤',
      code: 'LOGIN_ERROR'
    });
  }
});

/**
 * POST /api/auth/refresh
 * 刷新 token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: '請提供 token',
        code: 'TOKEN_REQUIRED'
      });
    }
    
    const newToken = refreshToken(token);
    
    if (!newToken) {
      return res.status(401).json({
        success: false,
        message: 'Token 無效或已過期',
        code: 'INVALID_TOKEN'
      });
    }
    
    res.json({
      success: true,
      message: 'Token 刷新成功',
      data: {
        token: newToken,
        expiresIn: '8h'
      }
    });
    
  } catch (error) {
    console.error('Token 刷新錯誤:', error);
    res.status(500).json({
      success: false,
      message: 'Token 刷新時發生錯誤',
      code: 'REFRESH_ERROR'
    });
  }
});

module.exports = router;