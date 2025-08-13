# FUCO Production System - Zeabur RWD 部署指南

## RWD 修復完成 ✅
已完成全系統的響應式網頁設計修復，可部署到 Zeabur 進行手機測試。

## 部署前檢查清單

### 1. 檔案完整性
- ✅ `src/frontend/rwd-fixes.css` - 通用 RWD 修復樣式
- ✅ `src/frontend/index.html` - 主儀表板（已修復響應式）
- ✅ `src/frontend/production-record.html` - 生產記錄（已修復響應式）
- ✅ `src/frontend/login.html` - 登入頁面（已修復響應式）
- ✅ `src/backend/server-simple.js` - 後端服務
- ✅ `package.json` - 已添加 bcrypt 依賴
- ✅ `zeabur.json` - 部署配置

### 2. 部署配置
```json
{
  "name": "@mursfoto/fuco-production-enterprise",
  "build": {
    "commands": ["npm install"],
    "outputDir": "."
  },
  "run": {
    "command": "node src/backend/server-simple.js"
  },
  "environment": {
    "NODE_ENV": "production",
    "PORT": "8847"
  }
}
```

### 3. 依賴項目
```json
{
  "bcrypt": "^5.1.1",
  "cors": "^2.8.5", 
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "jsonwebtoken": "^9.0.2"
}
```

## Zeabur 部署步驟

### 方法一：Git 連接部署
1. 確保專案已推送到 Git 儲存庫
2. 在 Zeabur 控制台創建新專案
3. 連接 Git 儲存庫
4. 選擇分支進行部署
5. Zeabur 會自動讀取 `zeabur.json` 配置

### 方法二：CLI 部署
```bash
# 進入專案目錄
cd fuco-production-enterprise

# 安裝 Zeabur CLI（如未安裝）
npm install -g @zeabur/cli

# 登入 Zeabur
zeabur auth login

# 部署專案
zeabur deploy
```

## RWD 測試重點

### 手機版 (≤ 576px)
- 🔍 側邊欄：應為滑出式，點擊外部能關閉
- 🔍 登入頁面：演示帳號區域應為單列顯示
- 🔍 統計卡片：單列或雙列排列
- 🔍 表單：按鈕應為全寬度
- 🔍 表格：應轉為堆疊式卡片顯示

### 平板版 (576px - 768px)
- 🔍 統計卡片：雙列排列
- 🔍 工作站卡片：雙列顯示
- 🔍 側邊欄：應縮減寬度但保持可見

### 桌面版 (≥ 768px)
- 🔍 完整功能顯示
- 🔍 多列網格佈局
- 🔍 正常側邊欄行為

## 測試用演示帳號

| 角色 | 帳號 | 密碼 | 權限 |
|------|------|------|------|
| 管理員 | admin | admin123 | 全部功能 |
| 操作員 | emp001 | password | 生產記錄 |
| 主管 | supervisor | super123 | 報表查看 |
| 品管 | qc001 | qc123 | 品質檢查 |

## 手機測試流程

### 1. 登入測試
- 打開部署後的網址
- 測試登入頁面在手機上的顯示
- 嘗試點擊演示帳號快速填入
- 完成登入流程

### 2. 主儀表板測試
- 測試側邊欄展開/收合
- 確認統計卡片響應式排列
- 測試工作站卡片顯示
- 確認表格能正常顯示

### 3. 生產記錄測試
- 測試表單填寫
- 確認品質檢查項目顯示
- 測試按鈕觸摸友好性
- 驗證提交功能

### 4. 響應式測試
- 旋轉手機測試橫向顯示
- 在不同手機（iOS/Android）測試
- 確認觸摸區域大小適當
- 測試滾動和縮放行為

## 預期部署 URL 格式
部署成功後，Zeabur 會提供類似以下的 URL：
```
https://fuco-production-enterprise-[random].zeabur.app
```

## 故障排除

### 如果部署失敗
1. 檢查 `package.json` 中的 Node.js 版本要求
2. 確認所有依賴都已正確安裝
3. 查看 Zeabur 部署日誌
4. 確認 `zeabur.json` 配置正確

### 如果 RWD 顯示異常
1. 確認 `rwd-fixes.css` 已正確引入
2. 檢查瀏覽器開發者工具的控制台錯誤
3. 驗證 CSS 媒體查詢語法
4. 測試不同瀏覽器的相容性

## 部署後確認項目

- ✅ 網站能正常載入
- ✅ 登入功能正常
- ✅ 手機版側邊欄正常運作
- ✅ 統計卡片響應式正確
- ✅ 表格在手機上能正常顯示
- ✅ 表單填寫體驗良好
- ✅ 觸摸操作反應靈敏

---

**準備部署！** 🚀
所有 RWD 修復已完成，系統已準備好部署到 Zeabur 進行手機測試。
