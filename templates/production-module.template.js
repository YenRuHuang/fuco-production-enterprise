/**
 * FUCO Production System - 生產模組模板
 * 基於 mursfoto-cli 模板驅動開發最佳實踐
 * 
 * 使用方式:
 * 1. 複製此模板
 * 2. 替換 {{MODULE_NAME}}, {{API_ENDPOINT}} 等占位符
 * 3. 實現具體業務邏輯
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission } = require('../middleware/auth');

// ================================
// {{MODULE_NAME}} 模組配置
// ================================

const MODULE_CONFIG = {
  name: '{{MODULE_NAME}}',
  version: '1.0.0',
  description: '{{MODULE_DESCRIPTION}}',
  permissions: {
    read: '{{MODULE_NAME}}:read',
    write: '{{MODULE_NAME}}:write',
    delete: '{{MODULE_NAME}}:delete',
    admin: '{{MODULE_NAME}}:admin'
  },
  endpoints: {
    list: '/{{API_ENDPOINT}}',
    detail: '/{{API_ENDPOINT}}/:id',
    create: '/{{API_ENDPOINT}}',
    update: '/{{API_ENDPOINT}}/:id',
    delete: '/{{API_ENDPOINT}}/:id'
  }
};

// ================================
// 數據模型 (模擬)
// ================================

class {{MODULE_CLASS}} {
  constructor() {
    this.data = new Map();
    this.nextId = 1;
    
    // 初始化示例數據
    this.initializeSampleData();
  }

  // 初始化示例數據
  initializeSampleData() {
    const sampleData = {{SAMPLE_DATA}};
    
    sampleData.forEach(item => {
      item.id = this.nextId++;
      item.createdAt = new Date().toISOString();
      item.updatedAt = new Date().toISOString();
      this.data.set(item.id, item);
    });
  }

  // 獲取所有項目
  getAll(filters = {}) {
    let items = Array.from(this.data.values());
    
    // 應用過濾器
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        items = items.filter(item => {
          if (typeof item[key] === 'string') {
            return item[key].toLowerCase().includes(value.toLowerCase());
          }
          return item[key] === value;
        });
      }
    });
    
    return items;
  }

  // 根據 ID 獲取項目
  getById(id) {
    return this.data.get(parseInt(id));
  }

  // 創建新項目
  create(itemData) {
    const newItem = {
      id: this.nextId++,
      ...itemData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.data.set(newItem.id, newItem);
    return newItem;
  }

  // 更新項目
  update(id, updateData) {
    const item = this.data.get(parseInt(id));
    if (!item) {
      return null;
    }
    
    const updatedItem = {
      ...item,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    this.data.set(parseInt(id), updatedItem);
    return updatedItem;
  }

  // 刪除項目
  delete(id) {
    return this.data.delete(parseInt(id));
  }

  // 獲取統計
  getStats() {
    const items = Array.from(this.data.values());
    
    return {
      total: items.length,
      active: items.filter(item => item.status === 'active').length,
      inactive: items.filter(item => item.status === 'inactive').length,
      lastUpdated: new Date().toISOString()
    };
  }
}

// 創建模組實例
const {{MODULE_INSTANCE}} = new {{MODULE_CLASS}}();

// ================================
// 驗證中間件
// ================================

function validate{{MODULE_CLASS}}Data(req, res, next) {
  const { {{REQUIRED_FIELDS}} } = req.body;
  
  // 檢查必需欄位
  const requiredFields = [{{REQUIRED_FIELDS_ARRAY}}];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `缺少必需欄位: ${missingFields.join(', ')}`,
      code: 'MISSING_REQUIRED_FIELDS',
      missingFields
    });
  }
  
  // 自定義驗證邏輯
  {{CUSTOM_VALIDATION}}
  
  next();
}

// ================================
// API 路由
// ================================

/**
 * GET {{API_ENDPOINT}}
 * 獲取{{MODULE_NAME}}列表
 */
router.get('/', requirePermission(MODULE_CONFIG.permissions.read), (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      ...filters 
    } = req.query;
    
    // 獲取數據
    let items = {{MODULE_INSTANCE}}.getAll(filters);
    
    // 排序
    items.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      } else {
        return aVal > bVal ? 1 : -1;
      }
    });
    
    // 分頁
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = items.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: items.length,
        totalPages: Math.ceil(items.length / limit),
        hasNextPage: endIndex < items.length,
        hasPrevPage: page > 1
      },
      filters: filters
    });
    
  } catch (error) {
    console.error(`${MODULE_CONFIG.name} 列表獲取錯誤:`, error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET {{API_ENDPOINT}}/:id
 * 獲取特定{{MODULE_NAME}}詳情
 */
router.get('/:id', requirePermission(MODULE_CONFIG.permissions.read), (req, res) => {
  try {
    const { id } = req.params;
    const item = {{MODULE_INSTANCE}}.getById(id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: '{{MODULE_NAME}}不存在',
        code: 'ITEM_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: item
    });
    
  } catch (error) {
    console.error(`${MODULE_CONFIG.name} 詳情獲取錯誤:`, error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST {{API_ENDPOINT}}
 * 創建新{{MODULE_NAME}}
 */
router.post('/', 
  requirePermission(MODULE_CONFIG.permissions.write),
  validate{{MODULE_CLASS}}Data,
  (req, res) => {
    try {
      const newItem = {{MODULE_INSTANCE}}.create(req.body);
      
      // 記錄操作
      console.log(`${MODULE_CONFIG.name} 已創建:`, {
        id: newItem.id,
        operator: req.user.username,
        timestamp: new Date().toISOString()
      });
      
      res.status(201).json({
        success: true,
        message: '{{MODULE_NAME}}創建成功',
        data: newItem
      });
      
    } catch (error) {
      console.error(`${MODULE_CONFIG.name} 創建錯誤:`, error);
      res.status(500).json({
        success: false,
        message: '創建失敗',
        code: 'CREATE_FAILED'
      });
    }
  }
);

/**
 * PUT {{API_ENDPOINT}}/:id
 * 更新{{MODULE_NAME}}
 */
router.put('/:id', 
  requirePermission(MODULE_CONFIG.permissions.write),
  validate{{MODULE_CLASS}}Data,
  (req, res) => {
    try {
      const { id } = req.params;
      const updatedItem = {{MODULE_INSTANCE}}.update(id, req.body);
      
      if (!updatedItem) {
        return res.status(404).json({
          success: false,
          message: '{{MODULE_NAME}}不存在',
          code: 'ITEM_NOT_FOUND'
        });
      }
      
      // 記錄操作
      console.log(`${MODULE_CONFIG.name} 已更新:`, {
        id: updatedItem.id,
        operator: req.user.username,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        message: '{{MODULE_NAME}}更新成功',
        data: updatedItem
      });
      
    } catch (error) {
      console.error(`${MODULE_CONFIG.name} 更新錯誤:`, error);
      res.status(500).json({
        success: false,
        message: '更新失敗',
        code: 'UPDATE_FAILED'
      });
    }
  }
);

/**
 * DELETE {{API_ENDPOINT}}/:id
 * 刪除{{MODULE_NAME}}
 */
router.delete('/:id', 
  requirePermission(MODULE_CONFIG.permissions.delete),
  (req, res) => {
    try {
      const { id } = req.params;
      const item = {{MODULE_INSTANCE}}.getById(id);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: '{{MODULE_NAME}}不存在',
          code: 'ITEM_NOT_FOUND'
        });
      }
      
      const deleted = {{MODULE_INSTANCE}}.delete(id);
      
      if (deleted) {
        // 記錄操作
        console.log(`${MODULE_CONFIG.name} 已刪除:`, {
          id: parseInt(id),
          operator: req.user.username,
          timestamp: new Date().toISOString()
        });
        
        res.json({
          success: true,
          message: '{{MODULE_NAME}}刪除成功'
        });
      } else {
        res.status(500).json({
          success: false,
          message: '刪除失敗',
          code: 'DELETE_FAILED'
        });
      }
      
    } catch (error) {
      console.error(`${MODULE_CONFIG.name} 刪除錯誤:`, error);
      res.status(500).json({
        success: false,
        message: '刪除失敗',
        code: 'DELETE_FAILED'
      });
    }
  }
);

/**
 * GET {{API_ENDPOINT}}/stats
 * 獲取{{MODULE_NAME}}統計信息
 */
router.get('/stats', requirePermission(MODULE_CONFIG.permissions.read), (req, res) => {
  try {
    const stats = {{MODULE_INSTANCE}}.getStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error(`${MODULE_CONFIG.name} 統計獲取錯誤:`, error);
    res.status(500).json({
      success: false,
      message: '統計獲取失敗',
      code: 'STATS_ERROR'
    });
  }
});

// ================================
// 導出模組
// ================================

module.exports = {
  router,
  model: {{MODULE_INSTANCE}},
  config: MODULE_CONFIG
};

// ================================
// 模板變數替換指南
// ================================

/*
替換下列占位符：

{{MODULE_NAME}} - 模組名稱 (例如: 品質管理)
{{MODULE_DESCRIPTION}} - 模組描述
{{MODULE_CLASS}} - 類別名稱 (例如: QualityManager)
{{MODULE_INSTANCE}} - 實例名稱 (例如: qualityManager)
{{API_ENDPOINT}} - API 端點 (例如: quality-records)
{{REQUIRED_FIELDS}} - 必需欄位 (例如: name, type, status)
{{REQUIRED_FIELDS_ARRAY}} - 必需欄位陣列 (例如: ['name', 'type', 'status'])
{{SAMPLE_DATA}} - 示例數據陣列
{{CUSTOM_VALIDATION}} - 自定義驗證邏輯

範例替換：
- {{MODULE_NAME}} → 品質管理
- {{MODULE_CLASS}} → QualityManager
- {{API_ENDPOINT}} → quality-records
- {{REQUIRED_FIELDS}} → recordType, workOrderId, checkResult
*/