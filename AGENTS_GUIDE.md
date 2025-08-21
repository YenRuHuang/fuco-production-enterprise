# FUCO SubAgents 快速使用指南

> 為 FUCO Production Enterprise 專案量身定制的 AI 代理系統

## 🚀 快速啟動

### 啟動 Agents
```bash
# 方法 1: 互動式選擇器（推薦）
npm run agents

# 方法 2: 直接在 Claude Code 中使用
# Task(subagent_type="general-purpose", prompt="使用 fuco-dev agent 創建 API")
```

## 🤖 4 個專門 Agents

### 💻 Development Agent
**用途**: 代碼開發、API 創建、前端組件
```bash
# 示例用法
Task(subagent_type="general-purpose", 
     prompt="使用 fuco-dev agent 創建用戶管理 API")
```

### 🗃️ Database Agent  
**用途**: 資料庫設計、遷移、查詢優化
```bash
# 示例用法
Task(subagent_type="general-purpose",
     prompt="使用 fuco-db agent 創建資料庫遷移")
```

### 📈 Monitoring Agent
**用途**: 系統監控、健康檢查、性能分析
```bash
# 示例用法
Task(subagent_type="general-purpose",
     prompt="使用 fuco-monitor agent 執行系統健康檢查")
```

### 🔬 Testing Agent
**用途**: 自動化測試、CI/CD、品質保證
```bash
# 示例用法  
Task(subagent_type="general-purpose",
     prompt="使用 fuco-test agent 生成測試套件")
```

## 📋 常用命令

```bash
# Agent 管理
npm run agents              # 啟動選擇器
npm run mcp:status         # 檢查 Agent 狀態

# 系統診斷
npm run doctor             # 健康檢查
npm run health:full        # 完整健康檢查

# 測試相關
npm run test:unit          # 單元測試
npm run test:integration   # 整合測試
npm run test:coverage      # 覆蓋率測試
```

## 🎯 使用技巧

### 1. 明確描述需求
```javascript
// ❌ 不好的提示
"創建一個 API"

// ✅ 好的提示
"使用 fuco-dev agent 創建用戶管理 API，包含 CRUD 操作，支援認證和權限控制"
```

### 2. 指定 Agent 類型
```javascript
// 總是指定要使用的 Agent
Task(subagent_type="general-purpose", 
     prompt="使用 fuco-XXX agent [具體需求]")
```

### 3. 分步驟執行複雜任務
```javascript
// 步驟 1: 設計
Task(subagent_type="general-purpose",
     prompt="使用 fuco-dev agent 設計用戶 API 結構")

// 步驟 2: 實現  
Task(subagent_type="general-purpose",
     prompt="使用 fuco-dev agent 實現用戶 API")

// 步驟 3: 測試
Task(subagent_type="general-purpose", 
     prompt="使用 fuco-test agent 為用戶 API 創建測試")
```

## 🔍 實際使用案例

### 案例 1: 新功能開發
```javascript
// 1. 創建 API
Task(subagent_type="general-purpose",
     prompt="使用 fuco-dev agent 創建生產記錄 API，支援 CRUD 和搜尋功能")

// 2. 創建前端  
Task(subagent_type="general-purpose",
     prompt="使用 fuco-dev agent 創建生產記錄管理頁面，包含表格和表單")

// 3. 資料庫支援
Task(subagent_type="general-purpose", 
     prompt="使用 fuco-db agent 為生產記錄創建資料庫索引優化")

// 4. 添加測試
Task(subagent_type="general-purpose",
     prompt="使用 fuco-test agent 為生產記錄功能創建完整測試套件")
```

### 案例 2: 性能優化
```javascript
// 1. 系統診斷
Task(subagent_type="general-purpose",
     prompt="使用 fuco-monitor agent 分析系統性能瓶頸")

// 2. 資料庫優化  
Task(subagent_type="general-purpose",
     prompt="使用 fuco-db agent 優化慢查詢和添加索引")

// 3. 代碼重構
Task(subagent_type="general-purpose",
     prompt="使用 fuco-dev agent 重構性能關鍵代碼")
```

### 案例 3: 部署準備
```javascript
// 1. 測試覆蓋
Task(subagent_type="general-purpose",
     prompt="使用 fuco-test agent 確保測試覆蓋率達到 95%")

// 2. 健康檢查
Task(subagent_type="general-purpose", 
     prompt="使用 fuco-monitor agent 設置生產環境監控")

// 3. 資料庫備份
Task(subagent_type="general-purpose",
     prompt="使用 fuco-db agent 設置自動備份策略")
```

## 🛠️ 故障排除

### Agent 無回應
```bash
# 1. 檢查 MCP 狀態
claude mcp list

# 2. 重新註冊（如果需要）
cd ~/Documents/fuco-production-enterprise
claude mcp add fuco-dev --scope project -- node ~/Documents/fuco-agents/fuco-dev-agent.js

# 3. 檢查進程
ps aux | grep fuco-agent
```

### 找不到專案檔案
```bash
# 確保在正確目錄執行
cd ~/Documents/fuco-production-enterprise

# 檢查環境變數
echo $FUCO_PROJECT_PATH
```

## 📊 狀態列說明

Claude Code 底部狀態列顯示：
```
[FUCO] main ✓ | Health: 86% | 4 Agents | 14:30
```

- `[FUCO]`: 當前專案
- `main ✓`: Git 分支和狀態
- `Health: 86%`: 系統健康度
- `4 Agents`: 可用 Agent 數量  
- `14:30`: 當前時間

## 💡 最佳實踐

### 1. Agent 選擇原則
- **Development**: 創建、修改、重構代碼
- **Database**: 資料結構、查詢、遷移  
- **Monitoring**: 系統狀態、性能、告警
- **Testing**: 測試、品質、CI/CD

### 2. 協作流程
1. 使用 Development Agent 創建功能
2. 使用 Database Agent 優化資料層
3. 使用 Testing Agent 確保品質
4. 使用 Monitoring Agent 監控上線

### 3. 任務分解
- 將大任務分解成小任務
- 每個任務明確指定 Agent
- 按邏輯順序執行任務

---

💡 **提示**: 如需詳細文檔，請查看 `~/Documents/fuco-agents/README.md`

🔗 **相關命令**: `npm run agents`, `npm run doctor`, `npm run health:full`