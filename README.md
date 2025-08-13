# FUCO Production System Enterprise Edition
# 福桑聯合生產管理系統 - 企業版

## 📋 系統概述

FUCO Production System 是一個專為製造業設計的企業級生產管理系統，實現無紙化、即時化、數位化的生產流程管理。本系統整合了 mursfoto-cli 的先進技術架構，提供完整的 On-Premise 部署方案。

### 核心特色

- 🏭 **完全私有化部署** - 所有數據儲存在客戶內部，支援離線運行
- 🚀 **一鍵部署** - Docker 容器化，快速部署到生產環境
- 🔧 **靈活整合** - 支援 ERP/MES 系統整合，提供多種 API 接口
- 🤖 **智慧功能** - 整合本地 AI 模型，無需外部 API
- 📊 **即時監控** - WebSocket 即時數據推送，生產狀況一目了然
- 🔐 **企業級安全** - 支援 LDAP/AD 整合，完整的權限管理

## 🚀 快速開始

### 系統需求

- **作業系統**: Linux (推薦 Ubuntu 20.04+) / Windows Server 2019+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **硬體需求**:
  - CPU: 4 核心以上
  - RAM: 8GB 以上（推薦 16GB）
  - 硬碟: 100GB 以上可用空間

### 安裝步驟

#### 1. 複製環境配置

```bash
cp .env.example .env
```

編輯 `.env` 檔案，設定您的環境參數：

```bash
# 必要設定
DB_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_32_byte_encryption_key
```

#### 2. 使用 Docker 部署（推薦）

```bash
# 建置並啟動所有服務
docker-compose -f deployment/docker/docker-compose.yml up -d

# 檢查服務狀態
docker-compose -f deployment/docker/docker-compose.yml ps

# 查看日誌
docker-compose -f deployment/docker/docker-compose.yml logs -f
```

#### 3. 手動安裝

```bash
# 安裝依賴
npm install

# 初始化資料庫
npm run db:migrate

# 生成初始數據
npm run db:seed

# 啟動服務
npm start
```

### 驗證安裝

訪問以下 URL 確認系統運行正常：

- 健康檢查: http://localhost:8847/health
- API 狀態: http://localhost:8847/api
- 前端介面: http://localhost:8848

預設管理員帳號：
- 用戶名: admin
- 密碼: admin123 (首次登入後請立即修改)

## 📁 專案結構

```
fuco-production-enterprise/
├── src/                        # 原始碼
│   ├── frontend/              # React/Next.js 前端
│   ├── backend/               # Node.js 後端
│   └── shared/                # 共用模組
├── deployment/                 # 部署配置
│   ├── docker/                # Docker 容器配置
│   ├── scripts/               # 安裝與維護腳本
│   └── config/                # 配置範本
├── integration/                # 系統整合
│   ├── erp-connectors/        # ERP 連接器
│   ├── mes-adapters/          # MES 轉接器
│   └── api-gateway/           # API 閘道
├── database/                   # 資料庫
│   ├── migrations/            # 資料庫遷移
│   └── seeds/                 # 種子數據
├── docs/                       # 文檔
│   ├── installation/          # 安裝指南
│   ├── user-manual/           # 使用手冊
│   └── api-docs/              # API 文檔
└── license/                    # 授權管理
```

## 🔧 功能模組

### 1. 身份驗證與權限管理
- 工號/密碼登入
- LDAP/AD 整合支援
- 角色權限管理（管理員、主管、操作員、訪客）
- 工作站權限控制

### 2. 工作站管理
- A-T 工作站配置
- 設備狀態監控
- 操作員分配
- 維護排程管理

### 3. 製令管理
- 工單創建與分配
- 生產排程
- BOM 表管理
- SOP 文件管理

### 4. 生產執行
- 即時生產數據記錄
- 良品/不良品統計
- 暫停/恢復功能
- 工時記錄

### 5. 品質管理
- 不良品標記與追蹤
- 維修作業管理
- 根因分析
- 品質報表

### 6. 即時監控
- 生產進度即時追蹤
- 設備使用狀態
- 異常告警
- 數據視覺化看板

## 🔌 系統整合

### ERP 系統整合

支援以下 ERP 系統：
- SAP (RFC/BAPI)
- Oracle (REST API)
- 自定義 ERP (Database Direct)

配置範例：

```env
ERP_INTEGRATION_ENABLED=true
ERP_TYPE=SAP
ERP_API_URL=http://your-erp-system/api
ERP_API_KEY=your_api_key
```

### MES 系統整合

支援協議：
- OPC UA
- MQTT
- Modbus TCP/RTU

配置範例：

```env
MES_INTEGRATION_ENABLED=true
MES_PROTOCOL=OPCUA
MES_SERVER_URL=opc.tcp://your-mes-server:4840
```

## 🤖 AI 功能

系統內建本地 AI 功能，無需外部 API：

- **視覺檢測**: 不良品自動檢測、SOP 圖像識別
- **生產優化**: 排程優化、產能預測
- **智慧分析**: 異常檢測、趨勢分析

## 📊 API 文檔

### 認證 API

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "employee001",
  "password": "password123"
}
```

### 工作站 API

```http
GET /api/workstations
Authorization: Bearer {token}

# 獲取所有工作站列表
```

### WebSocket 事件

```javascript
// 連接到 WebSocket
const socket = io('ws://localhost:8847');

// 身份驗證
socket.emit('authenticate', {
  userId: 123,
  workstationId: 456
});

// 監聽生產數據
socket.on('production-data', (data) => {
  console.log('生產數據更新:', data);
});
```

## 🔐 安全性

### 數據加密
- 使用 AES-256-GCM 加密敏感數據
- HTTPS/TLS 傳輸加密
- JWT Token 認證

### 存取控制
- 基於角色的權限控制 (RBAC)
- 工作站級別權限
- API 速率限制

### 審計日誌
- 所有操作記錄
- 登入/登出追蹤
- 數據修改歷史

## 📝 授權

本系統採用永久授權模式：

- **授權類型**: 永久授權 (Perpetual License)
- **授權範圍**: 單一站點部署
- **包含內容**:
  - 所有核心功能模組
  - 1 年免費更新
  - 1 年技術支援
  - 無用戶數限制

## 🛠️ 維護與支援

### 備份

系統自動備份配置：

```bash
# 手動備份
npm run backup

# 恢復備份
npm run restore -- --file=backup-20240101.tar.gz
```

### 更新

```bash
# 檢查更新
npm run check-updates

# 應用更新
npm run update
```

### 監控

- 健康檢查端點: `/health`
- Metrics 端點: `:9090/metrics` (Prometheus 格式)
- 日誌目錄: `./logs`

## 📞 技術支援

- **Email**: support@mursfoto.com
- **電話**: +886-2-1234-5678
- **線上文檔**: https://docs.fuco-production.com
- **工單系統**: https://support.fuco-production.com

## 🏆 貢獻者

- Mursfoto Team - 核心開發團隊
- FUCO 福桑聯合 - 需求分析與測試

## 📄 版權聲明

Copyright © 2024 FUCO Production System. All rights reserved.

本軟體為專有軟體，未經授權不得複製、修改或分發。

---

**版本**: 1.0.0  
**最後更新**: 2024-08-12  
**狀態**: Production Ready
