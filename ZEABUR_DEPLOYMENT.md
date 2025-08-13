# 🚀 FUCO Production System - Zeabur 部署指南

## 📋 部署步驟

### 1. 訪問 Zeabur Dashboard
前往 [Zeabur Dashboard](https://dash.zeabur.com) 並登入您的帳戶。

### 2. 創建新專案
1. 點擊 "Create Project" 按鈕
2. 輸入專案名稱：`fuco-production-enterprise`
3. 選擇合適的 region（建議選擇 Asia）

### 3. 連接 GitHub 倉庫
1. 點擊 "Deploy New Service"
2. 選擇 "GitHub" 作為來源
3. 連接您的 GitHub 帳戶（如果尚未連接）
4. 選擇倉庫：`YenRuHuang/fuco-production-enterprise`
5. 選擇分支：`main`

### 4. 配置部署設定
Zeabur 會自動偵測到這是一個 Node.js 專案，並使用我們提供的 `zeabur.json` 配置。

#### 環境變數設定
在 Zeabur Dashboard 中設定以下環境變數：
- `NODE_ENV`: `production`
- `PORT`: `8847` (或使用 Zeabur 自動分配的端口)
- `JWT_SECRET`: `your-super-secure-jwt-secret-key-here`

### 5. 確認部署配置
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node src/backend/server-simple.js`
- **Port**: 8847

### 6. 部署
點擊 "Deploy" 按鈕開始部署。

## 🔧 部署後設定

### 自定義域名（可選）
1. 在 Zeabur Dashboard 中進入您的服務
2. 點擊 "Domains" 頁籤
3. 添加您的自定義域名
4. 配置 DNS 設定

### SSL 憑證
Zeabur 會自動為您的域名提供 SSL 憑證。

## 📊 監控與日誌

### 查看應用日誌
1. 在 Zeabur Dashboard 中進入您的服務
2. 點擊 "Logs" 頁籤查看即時日誌

### 效能監控
1. 在 "Metrics" 頁籤查看 CPU、記憶體使用情況
2. 監控請求數量和回應時間

## 🚨 故障排除

### 常見問題

1. **部署失敗**
   - 檢查 GitHub 倉庫權限
   - 確認 package.json 中的依賴完整
   - 查看構建日誌找出具體錯誤

2. **服務無法啟動**
   - 確認環境變數設定正確
   - 檢查端口配置
   - 查看啟動日誌

3. **資料庫連接問題**
   - 目前使用模擬資料，無需額外資料庫配置
   - 如需真實資料庫，可在 Zeabur 中添加 PostgreSQL 或 MySQL 服務

## 🔄 自動部署

一旦設定完成，每次您推送代碼到 GitHub 的 `main` 分支，Zeabur 將自動重新部署您的應用。

## 📞 支援

如遇到問題，請查看：
- [Zeabur 官方文檔](https://zeabur.com/docs)
- [專案 GitHub Issues](https://github.com/YenRuHuang/fuco-production-enterprise/issues)

## 🎯 部署完成後的訪問

部署成功後，您將獲得一個 Zeabur 提供的 URL，格式類似：
`https://fuco-production-enterprise-xxx.zeabur.app`

### 測試帳號
- **管理員**: admin / admin123
- **操作員**: emp001 / password
- **主管**: supervisor / super123
- **品管**: qc001 / qc123

祝您部署順利！🎉
