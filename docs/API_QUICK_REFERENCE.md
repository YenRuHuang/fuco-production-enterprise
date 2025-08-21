# FUCO Production API 快速參考 ⚡

> 常用 API 端點的快速參考指南

## 🚀 快速開始

**Base URL**: `http://localhost:8847/api`

**認證**: 所有 API (除了登入) 都需要在 Header 中包含：
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🔐 認證 API

```bash
# 登入
POST /auth/login
{
  "username": "admin",
  "password": "admin123"
}

# 獲取用戶資訊
GET /auth/profile

# 登出
POST /auth/logout
```

## 🏭 工作站 API

```bash
# 獲取所有工作站
GET /workstations

# 獲取工作站詳情
GET /workstations/{id}

# 創建工作站
POST /workstations
{
  "code": "WS-NEW",
  "name": "新工作站",
  "capacity": 100,
  "skills": ["焊接", "組裝"]
}

# 獲取工作站即時狀態
GET /workstations/{id}/status
```

## 📋 工單 API

```bash
# 獲取工單列表
GET /work-orders?status=pending&priority=high

# 創建工單
POST /work-orders
{
  "orderNumber": "WO-001",
  "productCode": "PROD-001",
  "quantity": 100,
  "dueDate": "2025-08-25T18:00:00Z"
}

# 開始工單
POST /work-orders/{id}/start
{
  "workstationId": 1,
  "operatorId": 10
}

# 完成工單
POST /work-orders/{id}/complete
{
  "completedQuantity": 100,
  "qualityReport": {
    "passQuantity": 98,
    "defectQuantity": 2
  }
}
```

## 🏭 生產排程 API

```bash
# 排程儀表板
GET /scheduling/dashboard

# 執行智能排程
POST /scheduling/optimize
{
  "orderIds": [123, 124, 125],
  "timeHorizon": "7 days",
  "objectives": {
    "minimizeMakespan": 0.4,
    "maximizeUtilization": 0.6
  }
}

# 甘特圖數據
GET /scheduling/gantt-chart?startDate=2025-08-21&endDate=2025-08-28

# 手動分配工單
POST /scheduling/manual-assign
{
  "orderId": 123,
  "workstationId": 1,
  "startTime": "2025-08-22T08:00:00Z"
}
```

## 📊 報表 API

```bash
# 生產摘要報表
GET /reports/production-summary?period=monthly&year=2025&month=8

# 品質分析報表
GET /reports/quality-analysis?startDate=2025-08-01&endDate=2025-08-21

# 設備利用率分析
GET /reports/utilization-analysis

# 自訂報表
POST /reports/custom
{
  "name": "效率報表",
  "dateRange": {
    "startDate": "2025-08-01",
    "endDate": "2025-08-21"
  },
  "metrics": ["efficiency", "quality"]
}
```

## 🔍 監控 API

```bash
# 系統健康檢查
GET /monitoring/health

# 系統指標
GET /monitoring/metrics

# 告警資訊
GET /monitoring/alerts
```

## 🤖 SubAgents API

```bash
# SubAgents 狀態
GET /subagents/status

# 調用 SubAgent
POST /subagents/invoke
{
  "agent": "planning",
  "tool": "create_production_schedule",
  "parameters": {
    "orders": 50,
    "timeframe": "7 days"
  }
}
```

## 📝 常用 curl 範例

### 完整登入流程
```bash
# 1. 登入獲取 Token
TOKEN=$(curl -s -X POST http://localhost:8847/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.data.token')

# 2. 使用 Token 調用 API
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8847/api/workstations
```

### 創建並執行工單
```bash
# 1. 創建工單
ORDER_ID=$(curl -s -X POST http://localhost:8847/api/work-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderNumber": "WO-001",
    "productCode": "PROD-001", 
    "quantity": 100,
    "dueDate": "2025-08-25T18:00:00Z"
  }' | jq -r '.data.id')

# 2. 開始執行工單
curl -X POST http://localhost:8847/api/work-orders/$ORDER_ID/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "workstationId": 1,
    "operatorId": 10
  }'
```

### 生產排程優化
```bash
# 執行智能排程並獲取結果
curl -X POST http://localhost:8847/api/scheduling/optimize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderIds": [123, 124, 125],
    "timeHorizon": "7 days",
    "objectives": {
      "minimizeMakespan": 0.4,
      "maximizeUtilization": 0.3,
      "minimizeTardiness": 0.3
    }
  }' | jq '.data.results'
```

## 🔄 WebSocket 事件

### 連接設置
```javascript
const socket = io('ws://localhost:8847');

// 身份驗證
socket.emit('authenticate', {
  token: 'YOUR_JWT_TOKEN'
});
```

### 監聽事件
```javascript
// 生產數據更新
socket.on('production-data', (data) => {
  console.log('生產數據:', data);
});

// 工作站狀態變更
socket.on('workstation-status', (data) => {
  console.log('工作站狀態:', data);
});

// 告警通知
socket.on('alert', (alert) => {
  console.log('告警:', alert);
});

// 排程更新
socket.on('schedule-updated', (schedule) => {
  console.log('排程更新:', schedule);
});
```

## ⚠️ 錯誤處理

### 常見錯誤響應
```json
// 認證失敗
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "Token 無效或已過期"
  }
}

// 驗證錯誤
{
  "success": false,
  "error": {
    "code": "VAL_001", 
    "message": "輸入數據驗證失敗",
    "details": [
      {
        "field": "quantity",
        "message": "數量必須大於 0"
      }
    ]
  }
}
```

### 錯誤處理範例
```bash
# 使用 jq 檢查響應狀態
RESPONSE=$(curl -s -X GET http://localhost:8847/api/workstations \
  -H "Authorization: Bearer $TOKEN")

if [[ $(echo $RESPONSE | jq -r '.success') == "true" ]]; then
  echo "成功: $(echo $RESPONSE | jq -r '.data')"
else
  echo "錯誤: $(echo $RESPONSE | jq -r '.error.message')"
fi
```

## 🎯 效能最佳化

### 分頁查詢
```bash
# 使用分頁減少數據量
GET /work-orders?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

### 欄位過濾
```bash
# 只獲取必要欄位
GET /workstations?fields=id,name,status,utilizationRate
```

### 快取控制
```bash
# 設置快取控制 Header
curl -H "Cache-Control: max-age=300" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8847/api/reports/production-summary
```

## 📱 前端整合範例

### JavaScript/React
```javascript
// API 客戶端設置
const apiClient = axios.create({
  baseURL: 'http://localhost:8847/api',
  timeout: 10000
});

// 自動添加 Token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 獲取工作站列表
const getWorkstations = async () => {
  try {
    const response = await apiClient.get('/workstations');
    return response.data.data.workstations;
  } catch (error) {
    console.error('獲取工作站失敗:', error.response.data.error);
    throw error;
  }
};
```

### Python
```python
import requests

class FUCOClient:
    def __init__(self, base_url="http://localhost:8847/api"):
        self.base_url = base_url
        self.token = None
    
    def login(self, username, password):
        response = requests.post(f"{self.base_url}/auth/login", json={
            "username": username,
            "password": password
        })
        if response.json()["success"]:
            self.token = response.json()["data"]["token"]
            return True
        return False
    
    def get_workstations(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{self.base_url}/workstations", headers=headers)
        return response.json()["data"]["workstations"]

# 使用範例
client = FUCOClient()
client.login("admin", "admin123")
workstations = client.get_workstations()
```

---

**快速參考版本**: 1.0.0  
**對應 API 版本**: 1.0.0  
**最後更新**: 2025-08-21