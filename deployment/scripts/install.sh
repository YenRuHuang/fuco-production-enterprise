#!/bin/bash

# FUCO Production System - 快速安裝腳本
# 一鍵部署企業級生產管理系統

set -e

echo "========================================="
echo "FUCO Production System - Enterprise Edition"
echo "福桑聯合生產管理系統 - 企業版安裝程序"
echo "========================================="

# 檢查系統要求
check_requirements() {
    echo "📋 檢查系統要求..."
    
    # 檢查 Docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker 未安裝"
        echo "請先安裝 Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    echo "✅ Docker 已安裝: $(docker --version)"
    
    # 檢查 Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose 未安裝"
        echo "請先安裝 Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    echo "✅ Docker Compose 已安裝: $(docker-compose --version)"
    
    # 檢查 Node.js (可選)
    if command -v node &> /dev/null; then
        echo "✅ Node.js 已安裝: $(node --version)"
    else
        echo "⚠️  Node.js 未安裝（僅 Docker 部署不需要）"
    fi
}

# 初始化環境配置
setup_environment() {
    echo "🔧 設定環境配置..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        echo "✅ 已創建 .env 檔案"
        
        # 生成隨機密鑰
        JWT_SECRET=$(openssl rand -base64 32)
        ENCRYPTION_KEY=$(openssl rand -base64 32)
        DB_PASSWORD=$(openssl rand -base64 16)
        
        # 更新 .env 檔案
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/your_jwt_secret_key_here/$JWT_SECRET/g" .env
            sed -i '' "s/your_32_byte_encryption_key_here/$ENCRYPTION_KEY/g" .env
            sed -i '' "s/your_secure_password/$DB_PASSWORD/g" .env
        else
            # Linux
            sed -i "s/your_jwt_secret_key_here/$JWT_SECRET/g" .env
            sed -i "s/your_32_byte_encryption_key_here/$ENCRYPTION_KEY/g" .env
            sed -i "s/your_secure_password/$DB_PASSWORD/g" .env
        fi
        
        echo "✅ 已生成安全密鑰"
    else
        echo "⚠️  .env 檔案已存在，跳過配置"
    fi
}

# 創建必要目錄
create_directories() {
    echo "📁 創建必要目錄..."
    
    mkdir -p uploads/sop-images
    mkdir -p uploads/bom-files
    mkdir -p logs
    mkdir -p reports
    mkdir -p backups
    mkdir -p ai-models/vision-local
    mkdir -p ai-models/llm-local
    
    echo "✅ 目錄結構已創建"
}

# Docker 部署
docker_deploy() {
    echo "🐳 開始 Docker 部署..."
    
    cd deployment/docker
    
    # 建置映像
    echo "📦 建置 Docker 映像..."
    docker-compose build
    
    # 啟動服務
    echo "🚀 啟動服務..."
    docker-compose up -d
    
    # 等待服務啟動
    echo "⏳ 等待服務啟動..."
    sleep 10
    
    # 檢查服務狀態
    docker-compose ps
    
    cd ../..
    echo "✅ Docker 部署完成"
}

# 初始化資料庫
init_database() {
    echo "🗄️ 初始化資料庫..."
    
    # 等待 PostgreSQL 啟動
    echo "等待資料庫就緒..."
    sleep 5
    
    # 執行遷移
    docker exec -i fuco-db psql -U fuco_admin -d fuco_production < database/migrations/001_create_tables.sql
    
    echo "✅ 資料庫初始化完成"
}

# 健康檢查
health_check() {
    echo "🏥 執行健康檢查..."
    
    # 檢查後端 API
    if curl -f http://localhost:8847/health > /dev/null 2>&1; then
        echo "✅ 後端 API 運行正常"
    else
        echo "⚠️  後端 API 尚未就緒"
    fi
    
    # 檢查資料庫
    if docker exec fuco-db pg_isready -U fuco_admin > /dev/null 2>&1; then
        echo "✅ 資料庫運行正常"
    else
        echo "⚠️  資料庫尚未就緒"
    fi
}

# 顯示訪問信息
show_access_info() {
    echo ""
    echo "========================================="
    echo "🎉 安裝完成！"
    echo "========================================="
    echo ""
    echo "📌 系統訪問信息："
    echo "   後端 API: http://localhost:8847"
    echo "   前端介面: http://localhost:8848"
    echo "   健康檢查: http://localhost:8847/health"
    echo ""
    echo "👤 預設管理員帳號："
    echo "   用戶名: admin"
    echo "   密碼: admin123"
    echo "   ⚠️  請立即登入並修改密碼！"
    echo ""
    echo "📚 檢視日誌："
    echo "   docker-compose -f deployment/docker/docker-compose.yml logs -f"
    echo ""
    echo "🛑 停止服務："
    echo "   docker-compose -f deployment/docker/docker-compose.yml down"
    echo ""
    echo "========================================="
}

# 主程序
main() {
    check_requirements
    setup_environment
    create_directories
    docker_deploy
    init_database
    health_check
    show_access_info
}

# 執行主程序
main
