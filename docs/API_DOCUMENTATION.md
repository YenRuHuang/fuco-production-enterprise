# FUCO Production API 完整文檔 📚

> FUCO Production Enterprise 系統的 RESTful API 完整參考文檔

## 📋 API 概述

FUCO Production 提供完整的 RESTful API，支持生產管理的各個環節。所有 API 都遵循統一的響應格式和錯誤處理機制。

### 🌐 基礎資訊

- **Base URL**: `http://localhost:8847/api`
- **API 版本**: v1.0
- **數據格式**: JSON
- **認證方式**: JWT Token
- **字符編碼**: UTF-8

### 📊 統一響應格式

```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2025-08-21T10:00:00.000Z",
  "requestId": "req_123456789"
}
```

**錯誤響應格式**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "輸入數據驗證失敗",
    "details": [
      {
        "field": "email",
        "message": "email 格式不正確"
      }
    ]
  },
  "timestamp": "2025-08-21T10:00:00.000Z",
  "requestId": "req_123456789"
}
```

## 🔐 認證 API

### POST /auth/login
用戶登入獲取 JWT Token

**請求示例**:
```bash
curl -X POST http://localhost:8847/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**請求參數**:
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| username | string | ✅ | 用戶名或員工編號 |
| password | string | ✅ | 密碼 |
| rememberMe | boolean | ❌ | 是否記住登入狀態 |

**響應示例**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": 1,
      "username": "admin",
      "name": "系統管理員",
      "role": "admin",
      "permissions": ["read", "write", "admin"],
      "workstations": ["WS-A", "WS-B"]
    }
  },
  "message": "登入成功"
}
```

### POST /auth/logout
用戶登出

**請求示例**:
```bash
curl -X POST http://localhost:8847/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### GET /auth/profile
獲取當前用戶資訊

**請求示例**:
```bash
curl -X GET http://localhost:8847/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### PUT /auth/profile
更新用戶資訊

**請求示例**:
```bash
curl -X PUT http://localhost:8847/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "新名稱",
    "email": "new@email.com"
  }'
```

### POST /auth/change-password
修改密碼

**請求參數**:
```json
{
  "currentPassword": "current_password",
  "newPassword": "new_password",
  "confirmPassword": "new_password"
}
```

## 🏭 工作站管理 API

### GET /workstations
獲取工作站列表

**請求示例**:
```bash
curl -X GET "http://localhost:8847/api/workstations?page=1&limit=10&status=active" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**查詢參數**:
| 參數 | 類型 | 說明 |
|------|------|------|
| page | number | 頁碼 (默認: 1) |
| limit | number | 每頁數量 (默認: 10) |
| status | string | 狀態篩選: active/inactive/maintenance |
| search | string | 搜索關鍵字 |
| sortBy | string | 排序欄位: name/code/capacity |
| sortOrder | string | 排序方向: asc/desc |

**響應示例**:
```json
{
  "success": true,
  "data": {
    "workstations": [
      {
        "id": 1,
        "code": "WS-A",
        "name": "工作站A",
        "description": "焊接工作站",
        "capacity": 100,
        "status": "active",
        "location": "車間A-01",
        "skills": ["焊接", "組裝"],
        "currentOperator": {
          "id": 10,
          "name": "張師傅",
          "employeeId": "EMP-010"
        },
        "equipment": [
          {
            "id": 1,
            "name": "焊接機A",
            "model": "WM-2000",
            "status": "running"
          }
        ],
        "utilizationRate": 85.5,
        "lastMaintenance": "2025-08-15T10:00:00Z",
        "nextMaintenance": "2025-09-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    },
    "summary": {
      "totalStations": 25,
      "activeStations": 20,
      "maintenanceStations": 3,
      "inactiveStations": 2,
      "averageUtilization": 78.2
    }
  }
}
```

### POST /workstations
創建新工作站

**請求示例**:
```bash
curl -X POST http://localhost:8847/api/workstations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "code": "WS-NEW",
    "name": "新工作站",
    "description": "新設立的工作站",
    "capacity": 120,
    "location": "車間B-05",
    "skills": ["切割", "打磨"],
    "equipment": [
      {
        "name": "切割機",
        "model": "CM-3000"
      }
    ]
  }'
```

### GET /workstations/:id
獲取特定工作站詳情

### PUT /workstations/:id
更新工作站資訊

### DELETE /workstations/:id
刪除工作站

### GET /workstations/:id/status
獲取工作站即時狀態

**響應示例**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "running",
    "currentOrder": {
      "id": 123,
      "orderNumber": "WO-2025-001",
      "startTime": "2025-08-21T08:00:00Z",
      "estimatedEndTime": "2025-08-21T16:00:00Z",
      "progress": 65.5
    },
    "operator": {
      "id": 10,
      "name": "張師傅",
      "checkInTime": "2025-08-21T07:30:00Z"
    },
    "metrics": {
      "hourlyOutput": 12,
      "qualityRate": 98.5,
      "efficiency": 92.3,
      "temperature": 25.5,
      "vibration": "normal"
    }
  }
}
```

## 📋 工單管理 API

### GET /work-orders
獲取工單列表

**請求示例**:
```bash
curl -X GET "http://localhost:8847/api/work-orders?status=pending&priority=high" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**查詢參數**:
| 參數 | 類型 | 說明 |
|------|------|------|
| status | string | 狀態: pending/in_progress/completed/cancelled |
| priority | string | 優先級: low/medium/high/urgent |
| startDate | string | 開始日期 (ISO 8601) |
| endDate | string | 結束日期 (ISO 8601) |
| workstationId | number | 工作站 ID |
| productCode | string | 產品代碼 |

**響應示例**:
```json
{
  "success": true,
  "data": {
    "workOrders": [
      {
        "id": 123,
        "orderNumber": "WO-2025-001",
        "productCode": "PROD-001",
        "productName": "汽車零件A",
        "quantity": 100,
        "completedQuantity": 65,
        "priority": "high",
        "status": "in_progress",
        "dueDate": "2025-08-25T18:00:00Z",
        "estimatedDuration": 480,
        "actualDuration": 312,
        "workstation": {
          "id": 1,
          "code": "WS-A",
          "name": "工作站A"
        },
        "operator": {
          "id": 10,
          "name": "張師傅"
        },
        "bom": [
          {
            "materialCode": "MAT-001",
            "materialName": "鋼材A",
            "requiredQuantity": 200,
            "unit": "kg"
          }
        ],
        "progress": 65,
        "qualityMetrics": {
          "passRate": 98.5,
          "defectCount": 1,
          "reworkCount": 0
        },
        "createdAt": "2025-08-21T00:00:00Z",
        "updatedAt": "2025-08-21T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    },
    "summary": {
      "totalOrders": 45,
      "pendingOrders": 12,
      "inProgressOrders": 18,
      "completedOrders": 15,
      "averageCompletionRate": 82.3
    }
  }
}
```

### POST /work-orders
創建新工單

**請求示例**:
```bash
curl -X POST http://localhost:8847/api/work-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "orderNumber": "WO-2025-002",
    "productCode": "PROD-002",
    "quantity": 50,
    "priority": "medium",
    "dueDate": "2025-08-30T18:00:00Z",
    "requiredSkills": ["焊接", "組裝"],
    "bom": [
      {
        "materialCode": "MAT-002",
        "requiredQuantity": 100,
        "unit": "pcs"
      }
    ],
    "instructions": "特別注意焊接溫度控制",
    "qualityRequirements": {
      "toleranceLevel": "±0.1mm",
      "inspectionPoints": ["焊縫", "尺寸"]
    }
  }'
```

### GET /work-orders/:id
獲取特定工單詳情

### PUT /work-orders/:id
更新工單資訊

### DELETE /work-orders/:id
刪除工單

### POST /work-orders/:id/start
開始執行工單

**請求示例**:
```bash
curl -X POST http://localhost:8847/api/work-orders/123/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "workstationId": 1,
    "operatorId": 10,
    "notes": "開始執行，材料已準備完成"
  }'
```

### POST /work-orders/:id/pause
暫停工單執行

### POST /work-orders/:id/resume
恢復工單執行

### POST /work-orders/:id/complete
完成工單

**請求參數**:
```json
{
  "completedQuantity": 100,
  "qualityReport": {
    "passQuantity": 98,
    "defectQuantity": 2,
    "reworkQuantity": 0,
    "inspectionNotes": "品質良好"
  },
  "actualDuration": 450,
  "notes": "按時完成，品質符合要求"
}
```

## 🏭 生產排程 API

### GET /scheduling/dashboard
獲取排程儀表板數據

**響應示例**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalOrders": 156,
      "scheduledOrders": 132,
      "unscheduledOrders": 24,
      "averageUtilization": 83.5,
      "onTimeDeliveryRate": 94.2
    },
    "todaySchedule": [
      {
        "workstationId": 1,
        "workstationName": "工作站A",
        "schedule": [
          {
            "orderId": 123,
            "orderNumber": "WO-2025-001",
            "startTime": "08:00",
            "endTime": "16:00",
            "status": "in_progress",
            "progress": 65
          }
        ]
      }
    ],
    "bottlenecks": [
      {
        "workstationId": 5,
        "workstationName": "工作站E",
        "utilizationRate": 98.5,
        "queuedOrders": 8,
        "recommendedAction": "增加班次或分配至其他工作站"
      }
    ],
    "kpis": {
      "efficiency": 87.3,
      "productivity": 92.1,
      "qualityRate": 96.8,
      "deliveryPerformance": 94.2
    }
  }
}
```

### POST /scheduling/optimize
執行智能排程優化

**請求示例**:
```bash
curl -X POST http://localhost:8847/api/scheduling/optimize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "orderIds": [123, 124, 125],
    "timeHorizon": "7 days",
    "objectives": {
      "minimizeMakespan": 0.4,
      "maximizeUtilization": 0.3,
      "minimizeTardiness": 0.3
    },
    "constraints": {
      "skillRequirements": true,
      "maintenanceWindows": true,
      "operatorAvailability": true
    },
    "algorithmConfig": {
      "populationSize": 100,
      "generations": 300,
      "mutationRate": 0.1
    }
  }'
```

**響應示例**:
```json
{
  "success": true,
  "data": {
    "optimizationId": "opt_20250821_001",
    "status": "completed",
    "executionTime": 28.5,
    "results": {
      "makespan": 2880,
      "totalUtilization": 87.3,
      "tardiness": 0,
      "fitnessScore": 0.924
    },
    "schedule": [
      {
        "orderId": 123,
        "workstationId": 1,
        "startTime": "2025-08-22T08:00:00Z",
        "endTime": "2025-08-22T16:00:00Z",
        "operatorId": 10
      }
    ],
    "bottleneckAnalysis": {
      "criticalPath": ["WS-A", "WS-C", "WS-E"],
      "bottleneckStations": [
        {
          "workstationId": 5,
          "utilizationRate": 95.8,
          "impact": "high"
        }
      ]
    },
    "recommendations": [
      {
        "type": "capacity_increase",
        "workstationId": 5,
        "suggestion": "建議增加第二班次或購買額外設備"
      }
    ]
  }
}
```

### GET /scheduling/gantt-chart
獲取甘特圖數據

**查詢參數**:
| 參數 | 類型 | 說明 |
|------|------|------|
| startDate | string | 開始日期 (ISO 8601) |
| endDate | string | 結束日期 (ISO 8601) |
| workstationIds | array | 工作站 ID 陣列 |
| includeUnscheduled | boolean | 是否包含未排程工單 |

### POST /scheduling/manual-assign
手動分配工單到工作站

**請求示例**:
```bash
curl -X POST http://localhost:8847/api/scheduling/manual-assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "orderId": 123,
    "workstationId": 1,
    "operatorId": 10,
    "startTime": "2025-08-22T08:00:00Z",
    "notes": "手動指派，優先處理"
  }'
```

## 📊 報表與分析 API

### GET /reports/production-summary
生產摘要報表

**請求示例**:
```bash
curl -X GET "http://localhost:8847/api/reports/production-summary?period=monthly&year=2025&month=8" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**響應示例**:
```json
{
  "success": true,
  "data": {
    "period": "2025-08",
    "summary": {
      "totalOrders": 156,
      "completedOrders": 132,
      "totalQuantity": 15600,
      "completedQuantity": 14850,
      "completionRate": 95.2,
      "onTimeDeliveryRate": 94.2,
      "averageLeadTime": 3.2,
      "efficiency": 87.3
    },
    "dailyTrends": [
      {
        "date": "2025-08-01",
        "completedOrders": 6,
        "completedQuantity": 580,
        "efficiency": 85.2
      }
    ],
    "workstationPerformance": [
      {
        "workstationId": 1,
        "name": "工作站A",
        "utilizationRate": 88.5,
        "efficiency": 92.1,
        "qualityRate": 97.8,
        "completedOrders": 28
      }
    ],
    "topProducts": [
      {
        "productCode": "PROD-001",
        "quantity": 2800,
        "percentage": 18.9
      }
    ]
  }
}
```

### GET /reports/quality-analysis
品質分析報表

### GET /reports/utilization-analysis
設備利用率分析

### GET /reports/efficiency-trends
效率趨勢分析

### POST /reports/custom
自訂報表生成

**請求示例**:
```bash
curl -X POST http://localhost:8847/api/reports/custom \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "自訂生產效率報表",
    "dateRange": {
      "startDate": "2025-08-01",
      "endDate": "2025-08-21"
    },
    "filters": {
      "workstationIds": [1, 2, 3],
      "productCodes": ["PROD-001", "PROD-002"]
    },
    "metrics": ["efficiency", "quality", "utilization"],
    "groupBy": "workstation",
    "format": "json"
  }'
```

### GET /reports/export/:reportId
導出報表

**支援格式**: JSON, CSV, Excel, PDF

## 🔍 系統監控 API

### GET /monitoring/health
系統健康檢查

**響應示例**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-08-21T10:00:00Z",
    "services": {
      "database": {
        "status": "healthy",
        "responseTime": 15,
        "connectionPool": {
          "active": 5,
          "idle": 10,
          "total": 15
        }
      },
      "redis": {
        "status": "healthy",
        "responseTime": 2,
        "memory": "45.2MB"
      },
      "filesystem": {
        "status": "healthy",
        "diskUsage": "65%",
        "availableSpace": "125GB"
      }
    },
    "metrics": {
      "cpuUsage": 35.2,
      "memoryUsage": 68.5,
      "diskUsage": 45.8,
      "networkLatency": 12
    }
  }
}
```

### GET /monitoring/metrics
系統指標監控

### GET /monitoring/alerts
告警資訊

### POST /monitoring/alerts
創建自訂告警規則

## 🔧 SubAgents 整合 API

### GET /subagents/status
獲取 SubAgents 狀態

**響應示例**:
```json
{
  "success": true,
  "data": {
    "agents": {
      "development": {
        "status": "active",
        "lastUsed": "2025-08-21T09:30:00Z",
        "totalCalls": 156,
        "avgResponseTime": 2.3
      },
      "planning": {
        "status": "active", 
        "lastUsed": "2025-08-21T10:00:00Z",
        "totalCalls": 42,
        "avgResponseTime": 15.8
      }
    },
    "systemMetrics": {
      "tokenUsageReduction": 92.5,
      "developmentEfficiency": 87.3,
      "codeQuality": 94.2
    }
  }
}
```

### POST /subagents/invoke
調用 SubAgent 功能

**請求示例**:
```bash
curl -X POST http://localhost:8847/api/subagents/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "agent": "planning",
    "tool": "create_production_schedule", 
    "parameters": {
      "orders": 50,
      "timeframe": "7 days",
      "objectives": {
        "minimizeMakespan": 0.4,
        "maximizeUtilization": 0.6
      }
    }
  }'
```

## 📝 錯誤碼參考

| 錯誤碼 | HTTP 狀態 | 說明 |
|--------|-----------|------|
| AUTH_001 | 401 | Token 無效或已過期 |
| AUTH_002 | 403 | 權限不足 |
| VAL_001 | 400 | 請求參數驗證失敗 |
| VAL_002 | 400 | 必填欄位缺失 |
| RES_001 | 404 | 資源不存在 |
| RES_002 | 409 | 資源衝突 |
| SYS_001 | 500 | 內部伺服器錯誤 |
| SYS_002 | 503 | 服務暫時不可用 |
| BIZ_001 | 422 | 業務邏輯錯誤 |
| BIZ_002 | 422 | 工單狀態不允許此操作 |

## 🔒 安全性說明

### JWT Token 使用
- Token 有效期: 1 小時
- Refresh Token 有效期: 7 天
- 自動更新機制: Token 過期前 5 分鐘自動刷新

### API 限流
- 一般 API: 1000 次/小時
- 認證 API: 100 次/小時
- 重要操作: 10 次/分鐘

### 數據加密
- 傳輸: HTTPS/TLS 1.3
- 儲存: AES-256-GCM
- 密碼: bcrypt hash

## 📞 技術支援

- **API 問題**: [GitHub Issues](https://github.com/YenRuHuang/fuco-production-enterprise/issues)
- **技術討論**: [Discussions](https://github.com/YenRuHuang/fuco-production-enterprise/discussions)
- **Email 支援**: api-support@mursfoto.com

---

**版本**: 1.0.0  
**最後更新**: 2025-08-21  
**維護團隊**: FUCO Development Team