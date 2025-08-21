#!/bin/bash

# FUCO Production System - 快速啟動腳本
# 基於 mursfoto-cli 優秀實踐，提供一鍵式開發環境設置

set -e  # 遇到錯誤時退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 項目根目錄
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 顯示歡迎信息
show_welcome() {
    echo -e "${CYAN}"
    echo "🏭 FUCO Production System - 快速啟動"
    echo "======================================"
    echo -e "${NC}"
    echo -e "${PURPLE}福桑聯合生產管理系統 - 企業版${NC}"
    echo -e "${GRAY}基於 mursfoto-cli 優秀實踐${NC}"
    echo ""
}

# 檢查系統需求
check_requirements() {
    echo -e "${BLUE}🔍 檢查系統需求...${NC}"
    
    # 檢查 Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安裝${NC}"
        echo -e "${YELLOW}💡 請訪問 https://nodejs.org 下載安裝${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}❌ Node.js 版本過低 (需要 >= 18.0.0)${NC}"
        echo -e "${YELLOW}💡 當前版本: $(node --version)${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Node.js $(node --version)${NC}"
    
    # 檢查 npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm 未安裝${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ npm $(npm --version)${NC}"
    
    # 檢查 Git
    if ! command -v git &> /dev/null; then
        echo -e "${YELLOW}⚠️  Git 未安裝 (可選)${NC}"
    else
        echo -e "${GREEN}✅ Git $(git --version | cut -d' ' -f3)${NC}"
    fi
}

# 安裝依賴
install_dependencies() {
    echo -e "\n${BLUE}📦 安裝專案依賴...${NC}"
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}正在安裝依賴項...${NC}"
        npm install
        
        # 安裝開發依賴 (新增的優化工具)
        echo -e "${YELLOW}安裝開發工具...${NC}"
        npm install --save-dev colors commander figlet inquirer supertest axios
        
        echo -e "${GREEN}✅ 依賴安裝完成${NC}"
    else
        echo -e "${GREEN}✅ 依賴已存在${NC}"
        
        # 檢查是否需要更新
        if [ "package.json" -nt "node_modules" ]; then
            echo -e "${YELLOW}🔄 檢測到 package.json 更新，正在更新依賴...${NC}"
            npm install
        fi
    fi
}

# 設置環境配置
setup_environment() {
    echo -e "\n${BLUE}⚙️  設置環境配置...${NC}"
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            echo -e "${YELLOW}正在創建 .env 檔案...${NC}"
            cp .env.example .env
            echo -e "${GREEN}✅ .env 檔案已創建${NC}"
            echo -e "${YELLOW}💡 請編輯 .env 檔案設置您的配置${NC}"
        else
            echo -e "${YELLOW}⚠️  找不到 .env.example，創建基本配置...${NC}"
            cat > .env << EOF
NODE_ENV=development
APP_PORT=8847
APP_HOST=0.0.0.0
JWT_SECRET=fuco-dev-secret-$(date +%s)
EOF
            echo -e "${GREEN}✅ 基本 .env 檔案已創建${NC}"
        fi
    else
        echo -e "${GREEN}✅ .env 檔案已存在${NC}"
    fi
    
    # 創建必要目錄
    echo -e "${YELLOW}創建必要目錄...${NC}"
    mkdir -p logs test-reports backups docs
    echo -e "${GREEN}✅ 目錄結構已準備${NC}"
}

# 執行系統診斷
run_diagnosis() {
    echo -e "\n${BLUE}🏥 執行系統診斷...${NC}"
    
    if [ -f "src/utils/doctor.js" ]; then
        node src/utils/doctor.js
    else
        echo -e "${YELLOW}⚠️  Doctor 工具尚未安裝${NC}"
        echo -e "${YELLOW}💡 將在下一步安裝優化工具${NC}"
    fi
}

# 啟動服務器
start_server() {
    echo -e "\n${BLUE}🚀 啟動開發服務器...${NC}"
    
    # 檢查端口是否被占用
    if lsof -i :8847 &> /dev/null; then
        echo -e "${YELLOW}⚠️  端口 8847 已被使用${NC}"
        echo -e "${YELLOW}🔄 嘗試關閉現有進程...${NC}"
        pkill -f "node.*server" || true
        sleep 2
    fi
    
    echo -e "${GREEN}🌟 服務器啟動中...${NC}"
    echo -e "${CYAN}📍 訪問地址: http://localhost:8847${NC}"
    echo -e "${CYAN}📊 監控界面: http://localhost:8847/monitoring-gui.html${NC}"
    echo -e "${CYAN}📋 主控台: http://localhost:8847/index.html${NC}"
    echo ""
    echo -e "${YELLOW}按 Ctrl+C 停止服務器${NC}"
    echo ""
    
    # 啟動服務器
    npm start
}

# 顯示使用指南
show_usage_guide() {
    echo -e "\n${PURPLE}📚 使用指南${NC}"
    echo -e "${CYAN}===================${NC}"
    echo ""
    echo -e "${GREEN}🏥 系統診斷:${NC}"
    echo -e "   npm run doctor"
    echo -e "   node src/utils/doctor.js"
    echo ""
    echo -e "${GREEN}🚀 啟動服務器:${NC}"
    echo -e "   npm start                    # 簡單模式"
    echo -e "   npm run start:full           # 完整模式"
    echo -e "   npm run dev                  # 開發模式"
    echo ""
    echo -e "${GREEN}🧪 執行測試:${NC}"
    echo -e "   npm test                     # 綜合測試"
    echo -e "   npm run test:system          # 系統測試"
    echo -e "   npm run test:auth            # 認證測試"
    echo ""
    echo -e "${GREEN}🔧 CLI 工具:${NC}"
    echo -e "   node bin/fuco-cli.js         # 互動式工具"
    echo -e "   node bin/fuco-cli.js doctor  # 系統診斷"
    echo -e "   node bin/fuco-cli.js server  # 服務器管理"
    echo ""
    echo -e "${GREEN}📊 監控界面:${NC}"
    echo -e "   http://localhost:8847/monitoring-gui.html"
    echo ""
    echo -e "${GREEN}📋 管理界面:${NC}"
    echo -e "   http://localhost:8847/index.html"
    echo -e "   http://localhost:8847/dashboard-live.html"
    echo ""
}

# 清理函數
cleanup() {
    echo -e "\n${YELLOW}🧹 清理進程...${NC}"
    pkill -f "node.*server" || true
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 註冊清理函數
trap cleanup EXIT

# 主函數
main() {
    show_welcome
    
    # 檢查命令行參數
    case "${1:-start}" in
        "check")
            check_requirements
            run_diagnosis
            ;;
        "setup")
            check_requirements
            install_dependencies
            setup_environment
            run_diagnosis
            show_usage_guide
            ;;
        "start")
            check_requirements
            install_dependencies
            setup_environment
            
            # 詢問是否要執行診斷
            echo -e "\n${YELLOW}是否執行系統診斷? (建議) [Y/n]:${NC}"
            read -r response
            if [[ ! "$response" =~ ^[Nn]$ ]]; then
                run_diagnosis
            fi
            
            start_server
            ;;
        "guide")
            show_usage_guide
            ;;
        "doctor")
            check_requirements
            run_diagnosis
            ;;
        *)
            echo -e "${RED}❌ 無效參數: $1${NC}"
            echo -e "${YELLOW}使用方式:${NC}"
            echo -e "  $0 start    # 完整啟動 (預設)"
            echo -e "  $0 setup    # 僅設置環境"
            echo -e "  $0 check    # 僅檢查需求"
            echo -e "  $0 doctor   # 僅執行診斷"
            echo -e "  $0 guide    # 顯示使用指南"
            exit 1
            ;;
    esac
}

# 執行主函數
main "$@"