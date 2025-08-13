# ZEABUR 502 錯誤修復指南

## 🚨 問題診斷
502 SERVICE_UNAVAILABLE 通常是因為：
1. 環境變數配置錯誤
2. 端口綁定問題
3. 應用啟動失敗

## ✅ 解決方案

### 步驟 1：在 Zeabur 控制台設置環境變數

1. **進入專案設置**：
   - 訪問：https://dash.zeabur.com
   - 選擇您的 FUCO Production System 專案
   - 點擊您的服務 (Service)
   - 點擊「Variables」或「環境變數」選項卡

2. **添加以下環境變數**：

```bash
# 基礎配置
NODE_ENV=production

# JWT 認證密鑰 (使用下方的密鑰)
JWT_SECRET=06346e526ccb74f48aee709a8b08d8c8db7e6f068f51e5c95a82a20d23a85ddb7e0ca4700c7563f7d4ef2124b767eecd0b34bd63ac3946eb5
```

⚠️ **重要**：不要設置 `PORT` 環境變數！PORT 是 Zeabur 的保留變數，會自動配置。

### 步驟 2：配置端口設定

1. **在 Zeabur 控制台中**：
   - 點擊您的服務
   - 找到「公網存取」或「Networking」區域
   - 點擊「連線埠設定」或「Port Settings」
   - 確認端口配置正確（通常 Zeabur 會自動檢測）

### 步驟 3：確認環境變數設置

在 Zeabur 控制台中，您應該看到：

| 變數名 | 值 |
|--------|-----|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | `06346e526ccb74f48aee709a8b08d8c8db7e6f068f51e5c95a82a20d23a85ddb7e0ca4700c7563f7d4ef2124b767eecd0b34bd63ac3946eb5` |

⚠️ **注意**：不要手動設置 PORT 變數，Zeabur 會自動提供！

### 步驟 4：重新部署

1. 設置環境變數後，點擊「Redeploy」或「重新部署」
2. 等待部署完成
3. 檢查部署日誌

### 步驟 5：驗證部署

部署成功後，您應該能夠：
- 訪問您的 Zeabur URL（無 502 錯誤）
- 看到 FUCO Production System 登入頁面
- 使用 `admin` / `admin123` 成功登入

## 🔍 故障排除

### 如果仍然 502 錯誤：

1. **檢查構建日誌**：
   - 在 Zeabur 控制台查看「Logs」
   - 確認沒有構建錯誤

2. **檢查運行日誌**：
   - 查看應用運行時日誌
   - 尋找端口綁定錯誤

3. **確認起始命令**：
   - 確保使用 `node src/backend/server-simple.js`
   - 檢查 package.json 中的 start 腳本

## 📋 快速設置檢查清單

- [ ] 在 Zeabur 中設置 `NODE_ENV=production`
- [ ] 在 Zeabur 中設置 `JWT_SECRET=[上方的長密鑰]`
- [ ] **不要**手動設置 `PORT` 環境變數
- [ ] 檢查「公網存取」>「連線埠設定」配置
- [ ] 點擊重新部署
- [ ] 等待部署完成
- [ ] 測試訪問

## 🎯 成功指標

✅ 無 502 錯誤
✅ 能夠載入登入頁面
✅ 能夠成功登入系統
✅ API 端點正常回應

---

**需要幫助？** 如果按照此指南操作後仍有問題，請提供 Zeabur 的部署日誌以進一步診斷。
