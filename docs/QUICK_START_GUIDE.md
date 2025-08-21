# FUCO Production 快速開始指南 🚀

> 10 分鐘內完成 FUCO Production Enterprise 系統部署和 SubAgents 配置

## 🎯 快速部署檢查清單

- [ ] **系統需求確認**: Docker 20.10+, Node.js 18+, 8GB+ RAM
- [ ] **下載項目**: `git clone https://github.com/YenRuHuang/fuco-production-enterprise.git`
- [ ] **環境配置**: 複製並編輯 `.env` 檔案
- [ ] **一鍵部署**: `docker-compose up -d`
- [ ] **SubAgents 設置**: `./bin/fuco-agents.js`
- [ ] **系統驗證**: 訪問 http://localhost:8848

## 📦 一鍵安裝腳本

```bash
#!/bin/bash
# FUCO Production 一鍵安裝腳本

echo "🚀 開始安裝 FUCO Production Enterprise..."

# 1. 檢查系統需求
echo "📋 檢查系統需求..."
command -v docker >/dev/null 2>&1 || { echo "❌ 需要安裝 Docker"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ 需要安裝 Node.js 18+"; exit 1; }

# 2. 下載項目
echo "📥 下載 FUCO Production..."
git clone https://github.com/YenRuHuang/fuco-production-enterprise.git
cd fuco-production-enterprise

# 3. 環境配置
echo "⚙️ 配置環境變數..."
cp .env.example .env

# 4. 安裝依賴
echo "📦 安裝依賴套件..."
npm install

# 5. 啟動服務
echo "🐳 啟動 Docker 服務..."
docker-compose -f deployment/docker/docker-compose.yml up -d

# 6. 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 30

# 7. 健康檢查
echo "🔍 檢查服務狀態..."
curl -f http://localhost:8847/health || { echo "❌ 服務啟動失敗"; exit 1; }

# 8. 設置 SubAgents
echo "🤖 設置 MCP SubAgents..."
chmod +x ./bin/fuco-agents.js

echo "✅ FUCO Production 安裝完成！"
echo "🌐 訪問: http://localhost:8848"
echo "🔐 默認帳號: admin / admin123"
echo "🤖 啟動 SubAgents: ./bin/fuco-agents.js"
```

## 🔧 手動安裝步驟

### 步驟 1: 環境準備

```bash
# 檢查 Docker 版本
docker --version  # 需要 >= 20.10

# 檢查 Node.js 版本  
node --version     # 需要 >= 18.0

# 檢查可用記憶體
free -h           # 需要至少 8GB
```

### 步驟 2: 下載與配置

```bash
# 下載項目
git clone https://github.com/YenRuHuang/fuco-production-enterprise.git
cd fuco-production-enterprise

# 複製環境配置
cp .env.example .env

# 編輯環境變數（重要！）
nano .env
```

**必要的環境變數配置**:
```env
# 資料庫配置
DB_PASSWORD=your_secure_password_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fuco_production

# JWT 密鑰
JWT_SECRET=your_jwt_secret_minimum_32_characters

# 加密密鑰
ENCRYPTION_KEY=your_32_byte_encryption_key_here

# 應用程式設定
NODE_ENV=production
PORT=8847
FRONTEND_PORT=8848
```

### 步驟 3: 啟動系統

```bash
# 使用 Docker Compose 部署
docker-compose -f deployment/docker/docker-compose.yml up -d

# 檢查服務狀態
docker-compose -f deployment/docker/docker-compose.yml ps

# 查看啟動日誌
docker-compose -f deployment/docker/docker-compose.yml logs -f
```

### 步驟 4: 驗證安裝

```bash
# 檢查後端 API
curl http://localhost:8847/health

# 檢查前端
curl http://localhost:8848

# 檢查資料庫連接
docker-compose -f deployment/docker/docker-compose.yml exec db pg_isready
```

預期輸出:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-21T10:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected", 
    "filesystem": "accessible"
  },
  "version": "1.0.0"
}
```

## 🤖 SubAgents 設置指南

### 快速設置

```bash
# 進入項目目錄
cd fuco-production-enterprise

# 設置執行權限
chmod +x ./bin/fuco-agents.js

# 啟動統一選擇器
./bin/fuco-agents.js
```

### 手動註冊 MCP 服務器

```bash
# 註冊所有 SubAgents
claude mcp add fuco-dev --scope project -- node ~/Documents/fuco-agents/fuco-dev-agent.js
claude mcp add fuco-db --scope project -- node ~/Documents/fuco-agents/fuco-db-agent.js  
claude mcp add fuco-monitor --scope project -- node ~/Documents/fuco-agents/fuco-monitor-agent.js
claude mcp add fuco-test --scope project -- node ~/Documents/fuco-agents/fuco-test-agent.js
claude mcp add fuco-planning --scope project -- node ~/Documents/fuco-agents/fuco-planning-agent.js

# 驗證註冊
claude mcp list
```

### SubAgents 功能測試

```bash
# 測試 Development Agent
claude mcp invoke fuco-dev create_api_endpoint --endpoint "/api/test" --method "GET"

# 測試 Planning Agent  
claude mcp invoke fuco-planning create_production_schedule --orders 10 --timeframe "1 day"

# 測試 Database Agent
claude mcp invoke fuco-db analyze_schema --table "work_orders"
```

## 📊 首次使用設置

### 1. 管理員登入

訪問 http://localhost:8848，使用預設帳號：
- **用戶名**: admin
- **密碼**: admin123

**⚠️ 重要**: 首次登入後請立即修改密碼！

### 2. 基礎數據設置

```bash
# 創建工作站數據
curl -X POST http://localhost:8847/api/workstations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "工作站A",
    "code": "WS-A",
    "capacity": 100,
    "skills": ["焊接", "組裝"]
  }'

# 創建測試工單
curl -X POST http://localhost:8847/api/work-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "orderNumber": "WO-001",
    "productCode": "PROD-001", 
    "quantity": 100,
    "dueDate": "2025-08-25T10:00:00Z"
  }'
```

### 3. 智能排程測試

```bash
# 啟動 SubAgents
./bin/fuco-agents.js

# 選擇 Planning Agent (選項 5)
# 輸入: 創建生產排程，工單數量 10，時間範圍 7 天

# 系統將自動：
# 1. 分析現有工單和工作站
# 2. 執行遺傳算法優化
# 3. 生成最優排程方案
# 4. 顯示瓶頸分析結果
```

## 🔍 常見問題快速解決

### Q1: Docker 容器啟動失敗

```bash
# 檢查端口占用
netstat -tlnp | grep :8847
netstat -tlnp | grep :8848

# 清理舊容器
docker-compose -f deployment/docker/docker-compose.yml down
docker system prune -f

# 重新啟動
docker-compose -f deployment/docker/docker-compose.yml up -d
```

### Q2: SubAgents 無法註冊

```bash
# 檢查文件權限
ls -la ~/Documents/fuco-agents/
chmod +x ~/Documents/fuco-agents/*.js

# 檢查 Claude Code 連接
claude mcp list
claude config get

# 重新註冊
claude mcp remove fuco-dev
claude mcp add fuco-dev --scope project -- node ~/Documents/fuco-agents/fuco-dev-agent.js
```

### Q3: 資料庫連接失敗

```bash
# 檢查資料庫容器狀態
docker-compose -f deployment/docker/docker-compose.yml logs db

# 重置資料庫
docker-compose -f deployment/docker/docker-compose.yml down
docker volume rm fuco-production-enterprise_postgres_data
docker-compose -f deployment/docker/docker-compose.yml up -d
```

### Q4: 前端無法訪問

```bash
# 檢查前端容器
docker-compose -f deployment/docker/docker-compose.yml logs frontend

# 檢查網路連接
docker network ls
docker network inspect fuco-production-enterprise_default
```

## 📈 性能調優建議

### 生產環境優化

```bash
# 增加 Docker 記憶體限制
# 編輯 docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
```

### 資料庫性能調優

```sql
-- PostgreSQL 性能設置
ALTER SYSTEM SET shared_buffers = '1GB';
ALTER SYSTEM SET effective_cache_size = '3GB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET work_mem = '64MB';
SELECT pg_reload_conf();
```

### SubAgents 性能調優

```json
// .mcp.json 性能配置
{
  "servers": {
    "fuco-planning": {
      "env": {
        "GENETIC_ALGORITHM_POPULATION": "150",
        "GENETIC_ALGORITHM_GENERATIONS": "300",
        "OPTIMIZATION_CACHE_SIZE": "1000",
        "PARALLEL_WORKERS": "4"
      }
    }
  }
}
```

## 🎯 下一步學習

- 📚 **深入學習**: [技術實現指南](./SUBAGENTS_TECHNICAL_GUIDE.md)
- 🏭 **生產部署**: [企業級部署指南](./PRODUCTION_DEPLOYMENT.md)
- 🔧 **自訂開發**: [API 開發指南](./API_DEVELOPMENT.md)
- 📊 **監控管理**: [系統監控設置](./MONITORING_SETUP.md)

## 📞 技術支援

- **快速問題**: [FAQ](./FAQ.md)
- **GitHub Issues**: [問題回報](https://github.com/YenRuHuang/fuco-production-enterprise/issues)
- **技術討論**: [Discussions](https://github.com/YenRuHuang/fuco-production-enterprise/discussions)
- **Email 支援**: support@mursfoto.com

---

**🎉 恭喜！您已成功完成 FUCO Production Enterprise 的安裝和配置！**

立即體驗智能生產排程的強大功能：`./bin/fuco-agents.js` → 選擇 Planning Agent → 開始您的智能製造之旅！