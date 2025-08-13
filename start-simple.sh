#!/bin/bash

# FUCO Production System - 簡單測試啟動腳本
# 快速啟動測試伺服器

echo "========================================="
echo "FUCO Production System - 快速啟動"
echo "========================================="
echo ""

# 進入專案目錄
cd "$(dirname "$0")"

# 檢查是否已安裝依賴
if [ ! -d "node_modules" ]; then
    echo "📦 首次執行，正在安裝依賴..."
    npm install
    echo ""
fi

# 檢查端口是否被佔用
if lsof -Pi :8847 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  端口 8847 已被佔用"
    echo "請先停止占用該端口的服務"
    exit 1
fi

# 啟動伺服器
echo "🚀 啟動測試伺服器..."
echo ""
node src/backend/server-simple.js
