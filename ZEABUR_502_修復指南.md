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

# 端口配置 (關鍵！)
PORT=${ZEABUR_PORT}

# JWT 認證密鑰 (使用下方的密鑰)
JWT_SECRET=06346e526ccb74f48aee709a8b08d8c8db7e6f068f51e5c95a82a20d23a85ddb7e0ca4700c7563f7d4ef2124b767eecd0b34bd63ac3946eb5
```

### 步驟 2：確認環境變數設置

在 Zeabur 控制台中，您應該看到：

| 變數名 | 值 |
|--------|-----|
| `NODE_ENV` | `production` |
| `PORT` | `${ZEABUR_PORT}` |
| `JWT_SECRET` | `06346e526ccb74f48aee709a8b08d8c8db7e6f068f51e5c95a82a20d23a85ddb7e0ca4700c7563f7d4ef2124b767eecd0b34bd63ac3946eb5` |

⚠️ **重要**：`PORT` 的值必須是 `${ZEABUR_PORT}`，這是 Zeabur 的特殊語法！

### 步驟 3：重新部署

1. 設置環境變數後，點擊「Redeploy」或「重新部署」
2. 等待部署完成
3. 檢查部署日誌

### 步驟 4：驗證部署

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
- [ ] 在 Zeabur 中設置 `PORT=${ZEABUR_PORT}`
- [ ] 在 Zeabur 中設置 `JWT_SECRET=[上方的長密鑰]`
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
