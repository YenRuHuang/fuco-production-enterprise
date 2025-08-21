#!/bin/bash

# FUCO Production System 專案助手
# 使用 Gemini 來協助專案開發

PROJECT_DIR="$(dirname "$0")"
cd "$PROJECT_DIR"

show_menu() {
    echo "🏭 FUCO Production System 助手"
    echo "================================"
    echo "1) 檢查專案狀態"
    echo "2) 啟動開發環境"
    echo "3) 執行資料庫遷移"
    echo "4) 生成測試數據"
    echo "5) 開發前端頁面"
    echo "6) 開發後端 API"
    echo "7) 執行測試"
    echo "8) 部署到 Docker"
    echo "9) 生成技術文檔"
    echo "10) 分析效能問題"
    echo "0) 退出"
    echo "================================"
}

# 檢查專案狀態
check_status() {
    echo "📊 檢查專案狀態..."
    
    # 檢查 Node.js 環境
    echo "Node.js 版本: $(node --version)"
    echo "NPM 版本: $(npm --version)"
    
    # 檢查依賴
    echo ""
    echo "📦 依賴狀態："
    npm list --depth=0
    
    # 檢查資料庫
    echo ""
    echo "🗄️ 資料庫連線："
    node -e "
    const pg = require('pg');
    const client = new pg.Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fuco_production'
    });
    client.connect()
        .then(() => {
            console.log('✅ 資料庫連線成功');
            return client.end();
        })
        .catch(err => console.log('❌ 資料庫連線失敗:', err.message));
    "
    
    # 使用 Gemini 分析專案狀態
    echo ""
    echo "🤖 使用 Gemini 分析專案..."
    gemini -p "分析這個專案目前的開發狀態，列出已完成和待完成的功能：$(ls -la)"
}

# 啟動開發環境
start_dev() {
    echo "🚀 啟動開發環境..."
    
    # 選擇啟動模式
    echo "選擇啟動模式："
    echo "1) 簡單模式 (server-simple.js)"
    echo "2) 完整模式 (server.js)"
    echo "3) Docker 模式"
    read -p "選擇 (1-3): " mode
    
    case $mode in
        1)
            echo "啟動簡單模式..."
            npm run dev:simple
            ;;
        2)
            echo "啟動完整模式..."
            npm run dev
            ;;
        3)
            echo "啟動 Docker..."
            docker-compose up -d
            ;;
        *)
            echo "無效選擇"
            ;;
    esac
}

# 執行資料庫遷移
run_migration() {
    echo "🗄️ 執行資料庫遷移..."
    
    # 確認資料庫連線
    read -p "資料庫連線字串 (預設: postgresql://postgres:postgres@localhost:5432/fuco_production): " db_url
    if [ -z "$db_url" ]; then
        db_url="postgresql://postgres:postgres@localhost:5432/fuco_production"
    fi
    
    export DATABASE_URL="$db_url"
    
    # 執行遷移
    echo "執行遷移檔案..."
    psql "$DATABASE_URL" < database/schema.sql
    
    # 讓 Gemini 分析資料庫結構
    echo ""
    echo "🤖 使用 Gemini 分析資料庫..."
    cat database/schema.sql | gemini -p "分析這個資料庫 schema，說明各個表的用途和關聯"
}

# 生成測試數據
generate_test_data() {
    echo "📊 生成測試數據..."
    
    # 執行測試數據腳本
    if [ -f "database/seed.sql" ]; then
        psql "$DATABASE_URL" < database/seed.sql
        echo "✅ 測試數據已生成"
    else
        echo "⚠️ 找不到 seed.sql，使用 Gemini 生成..."
        gemini -p "為 FUCO 生產管理系統生成 SQL 測試數據，包含用戶、工作站、工單等" > database/seed.sql
        echo "✅ 已生成 seed.sql"
    fi
}

# 開發前端頁面
develop_frontend() {
    echo "🎨 開發前端頁面..."
    
    echo "選擇要開發的頁面："
    echo "1) 生產記錄頁面"
    echo "2) 報表中心"
    echo "3) 品質管理"
    echo "4) 物料管理"
    read -p "選擇 (1-4): " page
    
    case $page in
        1)
            echo "開發生產記錄頁面..."
            gemini -p "為 FUCO 系統生成生產記錄頁面的 HTML/CSS/JS 代碼，包含工單選擇、數量輸入、品質記錄功能" > src/frontend/production-record.html
            ;;
        2)
            echo "開發報表中心..."
            gemini -p "為 FUCO 系統生成報表中心頁面，包含生產統計圖表、效率分析、品質趨勢" > src/frontend/reports.html
            ;;
        3)
            echo "開發品質管理..."
            gemini -p "為 FUCO 系統生成品質管理頁面，包含不良品記錄、原因分析、改善追蹤" > src/frontend/quality.html
            ;;
        4)
            echo "開發物料管理..."
            gemini -p "為 FUCO 系統生成物料管理頁面，包含 BOM 管理、領料單、庫存查詢" > src/frontend/material.html
            ;;
    esac
    
    echo "✅ 頁面已生成"
}

# 開發後端 API
develop_backend() {
    echo "⚙️ 開發後端 API..."
    
    echo "選擇要開發的 API："
    echo "1) 生產記錄 API"
    echo "2) 報表統計 API"
    echo "3) WebSocket 即時通訊"
    echo "4) 檔案上傳 API"
    read -p "選擇 (1-4): " api
    
    case $api in
        1)
            echo "生成生產記錄 API..."
            gemini -p "為 FUCO 系統生成 Node.js Express 生產記錄 CRUD API，包含資料驗證和錯誤處理" > src/routes/production.js
            ;;
        2)
            echo "生成報表統計 API..."
            gemini -p "為 FUCO 系統生成報表統計 API，包含生產效率、品質分析、趨勢預測" > src/routes/reports.js
            ;;
        3)
            echo "生成 WebSocket 功能..."
            gemini -p "為 FUCO 系統生成 Socket.io WebSocket 即時通訊功能，支援生產數據推送" > src/websocket.js
            ;;
        4)
            echo "生成檔案上傳 API..."
            gemini -p "為 FUCO 系統生成檔案上傳 API，支援 SOP 文件、圖片上傳" > src/routes/upload.js
            ;;
    esac
    
    echo "✅ API 已生成"
}

# 執行測試
run_tests() {
    echo "🧪 執行測試..."
    
    # 檢查是否有測試檔案
    if [ -d "tests" ]; then
        npm test
    else
        echo "⚠️ 找不到測試檔案，生成測試..."
        mkdir -p tests
        gemini -p "為 FUCO 系統生成 Jest 測試套件，測試認證、工作站、生產記錄等主要功能" > tests/main.test.js
        echo "✅ 測試檔案已生成"
    fi
}

# 部署到 Docker
deploy_docker() {
    echo "🐳 部署到 Docker..."
    
    # 建置映像
    echo "建置 Docker 映像..."
    docker-compose -f deployment/docker/docker-compose.yml build
    
    # 啟動服務
    echo "啟動服務..."
    docker-compose -f deployment/docker/docker-compose.yml up -d
    
    # 檢查狀態
    echo ""
    echo "檢查服務狀態..."
    docker-compose -f deployment/docker/docker-compose.yml ps
    
    echo "✅ 部署完成"
    echo "🌐 訪問 http://localhost:3000"
}

# 生成技術文檔
generate_docs() {
    echo "📚 生成技術文檔..."
    
    echo "選擇文檔類型："
    echo "1) API 文檔"
    echo "2) 部署指南"
    echo "3) 使用手冊"
    echo "4) 開發指南"
    read -p "選擇 (1-4): " doc_type
    
    case $doc_type in
        1)
            echo "生成 API 文檔..."
            gemini -p "基於 FUCO 系統的路由檔案，生成完整的 API 文檔，包含端點、參數、回應格式" > docs/API.md
            ;;
        2)
            echo "生成部署指南..."
            gemini -p "為 FUCO 系統生成詳細的部署指南，包含環境需求、安裝步驟、配置說明" > docs/DEPLOYMENT.md
            ;;
        3)
            echo "生成使用手冊..."
            gemini -p "為 FUCO 系統生成使用手冊，包含各功能模組的操作說明和截圖示例" > docs/USER_MANUAL.md
            ;;
        4)
            echo "生成開發指南..."
            gemini -p "為 FUCO 系統生成開發指南，包含架構說明、開發規範、擴展方法" > docs/DEVELOPER_GUIDE.md
            ;;
    esac
    
    echo "✅ 文檔已生成"
}

# 分析效能問題
analyze_performance() {
    echo "⚡ 分析效能問題..."
    
    # 使用 Gemini 分析
    echo "🤖 使用 Gemini 分析專案效能..."
    
    # 分析前端效能
    echo ""
    echo "分析前端效能..."
    ls -la src/frontend/*.html | gemini -p "分析這些前端檔案可能的效能問題，提供優化建議"
    
    # 分析後端效能
    echo ""
    echo "分析後端效能..."
    cat src/server*.js | gemini -p "分析這個 Node.js 伺服器的效能瓶頸，提供優化建議"
    
    # 分析資料庫效能
    echo ""
    echo "分析資料庫效能..."
    cat database/schema.sql | gemini -p "分析這個資料庫 schema 的效能問題，建議索引優化和查詢優化"
}

# 主程序
main() {
    while true; do
        show_menu
        read -p "請選擇功能 (0-10): " choice
        
        case $choice in
            1) check_status ;;
            2) start_dev ;;
            3) run_migration ;;
            4) generate_test_data ;;
            5) develop_frontend ;;
            6) develop_backend ;;
            7) run_tests ;;
            8) deploy_docker ;;
            9) generate_docs ;;
            10) analyze_performance ;;
            0) echo "👋 再見！"; exit 0 ;;
            *) echo "❌ 無效選擇" ;;
        esac
        
        echo ""
        echo "按 Enter 繼續..."
        read
        clear
    done
}

# 執行主程序
main