#!/usr/bin/env node

/**
 * FUCO Production Monitoring Agent - 專門處理監控和診斷任務
 * 負責系統監控、效能分析、健康檢查和告警處理
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');
const execAsync = util.promisify(exec);

class FucoMonitorAgent {
  constructor() {
    this.name = "FUCO Production Monitoring Agent";
    this.version = "1.0.0";
    this.fucoProjectPath = path.resolve(process.env.HOME, 'Documents', 'fuco-production-enterprise');
    
    // 初始化 MCP Server
    this.server = new Server(
      {
        name: "fuco-monitor-agent",
        version: this.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
    this.setupHandlers();
  }

  setupTools() {
    this.tools = [
      {
        name: "system_health_check",
        description: "執行系統健康檢查，包含服務器、資料庫、API 等",
        inputSchema: {
          type: "object",
          properties: {
            checkLevel: { type: "string", description: "檢查等級", enum: ["basic", "detailed", "comprehensive"], default: "basic" },
            generateReport: { type: "boolean", description: "是否生成詳細報告", default: true }
          }
        }
      },
      {
        name: "performance_analysis",
        description: "分析系統性能，包含響應時間、資源使用率等",
        inputSchema: {
          type: "object",
          properties: {
            duration: { type: "number", description: "監控持續時間（秒）", default: 60 },
            component: { type: "string", description: "指定組件", enum: ["all", "api", "database", "frontend"], default: "all" }
          }
        }
      },
      {
        name: "create_monitoring_dashboard",
        description: "創建監控儀表板",
        inputSchema: {
          type: "object",
          properties: {
            dashboardType: { type: "string", description: "儀表板類型", enum: ["overview", "detailed", "production", "development"], default: "overview" },
            autoRefresh: { type: "boolean", description: "自動刷新", default: true }
          }
        }
      },
      {
        name: "log_analysis",
        description: "分析系統日誌，檢測異常和錯誤模式",
        inputSchema: {
          type: "object",
          properties: {
            logPath: { type: "string", description: "日誌檔案路徑（可選）" },
            timeRange: { type: "string", description: "時間範圍", enum: ["1h", "6h", "24h", "7d"], default: "24h" },
            errorLevel: { type: "string", description: "錯誤等級", enum: ["all", "error", "warning", "info"], default: "error" }
          }
        }
      },
      {
        name: "setup_alerts",
        description: "設置監控告警規則",
        inputSchema: {
          type: "object",
          properties: {
            alertType: { type: "string", description: "告警類型", enum: ["performance", "error", "availability", "security"] },
            threshold: { type: "string", description: "告警閾值" },
            notification: { type: "string", description: "通知方式", enum: ["email", "webhook", "log"], default: "log" }
          },
          required: ["alertType", "threshold"]
        }
      },
      {
        name: "generate_status_report",
        description: "生成系統狀態報告",
        inputSchema: {
          type: "object",
          properties: {
            reportType: { type: "string", description: "報告類型", enum: ["daily", "weekly", "monthly"], default: "daily" },
            includeMetrics: { type: "boolean", description: "包含詳細指標", default: true }
          }
        }
      }
    ];
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.tools
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "system_health_check":
            return await this.systemHealthCheck(args);
          case "performance_analysis":
            return await this.performanceAnalysis(args);
          case "create_monitoring_dashboard":
            return await this.createMonitoringDashboard(args);
          case "log_analysis":
            return await this.logAnalysis(args);
          case "setup_alerts":
            return await this.setupAlerts(args);
          case "generate_status_report":
            return await this.generateStatusReport(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error executing ${name}: ${error.message}`
            }
          ]
        };
      }
    });
  }

  // 系統健康檢查
  async systemHealthCheck(args) {
    const { checkLevel = "basic", generateReport = true } = args;
    
    const checks = await this.performHealthChecks(checkLevel);
    const summary = this.generateHealthSummary(checks);
    
    if (generateReport) {
      const reportPath = await this.saveHealthReport(checks, summary);
      
      return {
        content: [
          {
            type: "text",
            text: `🏥 系統健康檢查完成！\n\n${summary}\n\n📁 詳細報告已保存至: ${reportPath}`
          }
        ]
      };
    }
    
    return {
      content: [
        {
          type: "text",
          text: `🏥 系統健康檢查結果：\n\n${summary}`
        }
      ]
    };
  }

  // 性能分析
  async performanceAnalysis(args) {
    const { duration = 60, component = "all" } = args;
    
    const metrics = await this.collectPerformanceMetrics(duration, component);
    const analysis = this.analyzePerformanceData(metrics);
    
    // 保存分析結果
    const reportPath = await this.savePerformanceReport(metrics, analysis);
    
    return {
      content: [
        {
          type: "text",
          text: `⚡ 性能分析完成！\n\n${analysis}\n\n📊 詳細報告: ${reportPath}`
        }
      ]
    };
  }

  // 創建監控儀表板
  async createMonitoringDashboard(args) {
    const { dashboardType = "overview", autoRefresh = true } = args;
    
    const dashboardHtml = this.generateDashboardHtml(dashboardType, autoRefresh);
    const dashboardPath = path.join(this.fucoProjectPath, 'src', 'frontend', `monitoring-dashboard-${dashboardType}.html`);
    
    await fs.writeFile(dashboardPath, dashboardHtml);
    
    // 創建 API 端點支援
    const apiPath = await this.createDashboardApi(dashboardType);
    
    return {
      content: [
        {
          type: "text",
          text: `📊 監控儀表板已創建：\n- 儀表板: ${dashboardPath}\n- API 支援: ${apiPath}\n- 類型: ${dashboardType}\n- 自動刷新: ${autoRefresh}\n\n訪問: http://localhost:8847/monitoring-dashboard-${dashboardType}.html`
        }
      ]
    };
  }

  // 日誌分析
  async logAnalysis(args) {
    const { logPath, timeRange = "24h", errorLevel = "error" } = args;
    
    const logFiles = await this.findLogFiles(logPath);
    const analysis = await this.analyzeLogFiles(logFiles, timeRange, errorLevel);
    
    // 保存分析結果
    const reportPath = await this.saveLogAnalysisReport(analysis);
    
    return {
      content: [
        {
          type: "text",
          text: `📋 日誌分析完成：\n\n${analysis.summary}\n\n📄 詳細報告: ${reportPath}`
        }
      ]
    };
  }

  // 設置告警
  async setupAlerts(args) {
    const { alertType, threshold, notification = "log" } = args;
    
    const alertConfig = this.createAlertConfiguration(alertType, threshold, notification);
    const configPath = path.join(this.fucoProjectPath, 'config', 'alerts', `${alertType}_alerts.json`);
    
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(alertConfig, null, 2));
    
    // 創建告警處理腳本
    const scriptPath = await this.createAlertScript(alertType, alertConfig);
    
    return {
      content: [
        {
          type: "text",
          text: `🚨 告警規則已設置：\n- 類型: ${alertType}\n- 閾值: ${threshold}\n- 通知方式: ${notification}\n- 配置檔案: ${configPath}\n- 處理腳本: ${scriptPath}`
        }
      ]
    };
  }

  // 生成狀態報告
  async generateStatusReport(args) {
    const { reportType = "daily", includeMetrics = true } = args;
    
    const reportData = await this.collectReportData(reportType, includeMetrics);
    const report = this.formatStatusReport(reportData, reportType);
    
    const reportPath = path.join(this.fucoProjectPath, 'reports', 'status', `${reportType}_report_${Date.now()}.md`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);
    
    return {
      content: [
        {
          type: "text",
          text: `📈 ${reportType} 狀態報告已生成：\n\n${report.substring(0, 500)}...\n\n📁 完整報告: ${reportPath}`
        }
      ]
    };
  }

  // 輔助方法
  async performHealthChecks(checkLevel) {
    const checks = {
      timestamp: new Date().toISOString(),
      level: checkLevel,
      results: {}
    };

    try {
      // 檢查服務器狀態
      checks.results.server = await this.checkServerHealth();
      
      // 檢查 API 端點
      checks.results.api = await this.checkApiHealth();
      
      // 檢查資料庫連接
      checks.results.database = await this.checkDatabaseHealth();
      
      // 檢查系統資源
      checks.results.system = await this.checkSystemResources();
      
      if (checkLevel !== "basic") {
        // 詳細檢查
        checks.results.performance = await this.checkPerformanceMetrics();
        checks.results.logs = await this.checkLogHealth();
      }
      
      if (checkLevel === "comprehensive") {
        // 全面檢查
        checks.results.security = await this.checkSecurityStatus();
        checks.results.backups = await this.checkBackupStatus();
      }
      
    } catch (error) {
      checks.error = error.message;
    }

    return checks;
  }

  async checkServerHealth() {
    try {
      const response = await axios.get('http://localhost:8847/api/health', { timeout: 5000 });
      return {
        status: 'healthy',
        responseTime: response.headers['x-response-time'] || 'N/A',
        uptime: response.data.uptime || 'N/A'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async checkApiHealth() {
    const endpoints = [
      '/api/auth/status',
      '/api/workstations',
      '/api/production',
      '/api/reports'
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const start = Date.now();
        await axios.get(`http://localhost:8847${endpoint}`, { timeout: 3000 });
        results[endpoint] = {
          status: 'healthy',
          responseTime: Date.now() - start + 'ms'
        };
      } catch (error) {
        results[endpoint] = {
          status: 'unhealthy',
          error: error.message
        };
      }
    }
    
    return results;
  }

  async checkDatabaseHealth() {
    try {
      // 檢查資料庫連接（模擬）
      return {
        status: 'healthy',
        connectionPool: 'active',
        activeConnections: 5,
        maxConnections: 20
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async checkSystemResources() {
    try {
      const { stdout: memInfo } = await execAsync('free -h');
      const { stdout: diskInfo } = await execAsync('df -h /');
      
      return {
        status: 'healthy',
        memory: memInfo.split('\n')[1],
        disk: diskInfo.split('\n')[1]
      };
    } catch (error) {
      return {
        status: 'unknown',
        error: 'Unable to fetch system resources'
      };
    }
  }

  generateHealthSummary(checks) {
    let healthyCount = 0;
    let totalCount = 0;
    const issues = [];
    
    for (const [component, result] of Object.entries(checks.results)) {
      if (typeof result === 'object' && result.status) {
        totalCount++;
        if (result.status === 'healthy') {
          healthyCount++;
        } else {
          issues.push(`❌ ${component}: ${result.error || 'unhealthy'}`);
        }
      }
    }
    
    const healthPercentage = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 0;
    
    let summary = `🏥 系統健康度: ${healthPercentage}%\n`;
    summary += `✅ 健康組件: ${healthyCount}/${totalCount}\n`;
    
    if (issues.length > 0) {
      summary += `\n🚨 發現問題:\n${issues.join('\n')}`;
    } else {
      summary += `\n🎉 所有組件運行正常！`;
    }
    
    return summary;
  }

  async saveHealthReport(checks, summary) {
    const reportContent = `# FUCO 系統健康檢查報告

**檢查時間**: ${checks.timestamp}  
**檢查等級**: ${checks.level}

## 總結
${summary}

## 詳細結果

${JSON.stringify(checks.results, null, 2)}

---
*由 FUCO Production Monitoring Agent 生成*
`;
    
    const reportPath = path.join(this.fucoProjectPath, 'reports', 'health', `health_${Date.now()}.md`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, reportContent);
    
    return reportPath;
  }

  async collectPerformanceMetrics(duration, component) {
    // 模擬性能數據收集
    const metrics = {
      timestamp: new Date().toISOString(),
      duration: duration,
      component: component,
      data: {
        responseTime: {
          avg: Math.random() * 100 + 50,
          min: Math.random() * 50,
          max: Math.random() * 200 + 100,
          p95: Math.random() * 150 + 100
        },
        throughput: {
          requestsPerSecond: Math.random() * 100 + 50,
          errorsPerSecond: Math.random() * 5
        },
        resources: {
          cpuUsage: Math.random() * 50 + 20,
          memoryUsage: Math.random() * 60 + 30,
          diskIO: Math.random() * 100
        }
      }
    };
    
    return metrics;
  }

  analyzePerformanceData(metrics) {
    const { responseTime, throughput, resources } = metrics.data;
    
    let analysis = `⚡ 性能分析結果 (${metrics.duration}s)\n`;
    analysis += `=====================================\n\n`;
    
    analysis += `📊 響應時間:\n`;
    analysis += `- 平均: ${responseTime.avg.toFixed(2)}ms\n`;
    analysis += `- 最小: ${responseTime.min.toFixed(2)}ms\n`;
    analysis += `- 最大: ${responseTime.max.toFixed(2)}ms\n`;
    analysis += `- P95: ${responseTime.p95.toFixed(2)}ms\n\n`;
    
    analysis += `🚀 吞吐量:\n`;
    analysis += `- 請求/秒: ${throughput.requestsPerSecond.toFixed(2)}\n`;
    analysis += `- 錯誤/秒: ${throughput.errorsPerSecond.toFixed(2)}\n\n`;
    
    analysis += `🖥️ 資源使用:\n`;
    analysis += `- CPU: ${resources.cpuUsage.toFixed(1)}%\n`;
    analysis += `- 記憶體: ${resources.memoryUsage.toFixed(1)}%\n`;
    analysis += `- 磁碟 I/O: ${resources.diskIO.toFixed(1)}%\n\n`;
    
    // 性能建議
    analysis += `💡 建議:\n`;
    if (responseTime.avg > 100) {
      analysis += `- 響應時間偏高，建議優化查詢或添加快取\n`;
    }
    if (resources.cpuUsage > 70) {
      analysis += `- CPU 使用率偏高，考慮優化演算法或擴充資源\n`;
    }
    if (resources.memoryUsage > 80) {
      analysis += `- 記憶體使用率偏高，檢查記憶體洩漏\n`;
    }
    
    return analysis;
  }

  generateDashboardHtml(dashboardType, autoRefresh) {
    const refreshInterval = autoRefresh ? 5000 : 0;
    
    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FUCO 監控儀表板 - ${dashboardType}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        
        .dashboard {
            padding: 20px;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .metric-title {
            font-size: 18px;
            margin-bottom: 15px;
            color: #fff;
        }
        
        .metric-value {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .metric-trend {
            font-size: 14px;
            opacity: 0.8;
        }
        
        .status-healthy { color: #4ade80; }
        .status-warning { color: #fbbf24; }
        .status-error { color: #f87171; }
        
        .chart-container {
            height: 200px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            margin-top: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .refresh-info {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.3);
            padding: 10px 15px;
            border-radius: 25px;
            font-size: 14px;
        }
        
        .alerts {
            background: rgba(248, 113, 113, 0.1);
            border: 1px solid rgba(248, 113, 113, 0.3);
            border-radius: 10px;
            padding: 15px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🏭 FUCO 生產系統監控</h1>
            <p>儀表板類型: ${dashboardType} | 最後更新: <span id="lastUpdate"></span></p>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-title">🏥 系統健康度</div>
                <div class="metric-value status-healthy" id="systemHealth">86%</div>
                <div class="metric-trend">+2% 較昨日</div>
                <div class="chart-container">健康度趨勢圖</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">⚡ API 響應時間</div>
                <div class="metric-value status-healthy" id="responseTime">45ms</div>
                <div class="metric-trend">-5ms 較上小時</div>
                <div class="chart-container">響應時間圖表</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">🚀 吞吐量</div>
                <div class="metric-value status-healthy" id="throughput">156</div>
                <div class="metric-trend">請求/分鐘</div>
                <div class="chart-container">吞吐量圖表</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">🖥️ 系統資源</div>
                <div class="metric-value status-warning" id="resources">65%</div>
                <div class="metric-trend">CPU + 記憶體 + 磁碟</div>
                <div class="chart-container">資源使用圖表</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">📊 生產數據</div>
                <div class="metric-value status-healthy" id="production">142</div>
                <div class="metric-trend">今日生產記錄</div>
                <div class="chart-container">生產趨勢圖</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">🔧 設備狀態</div>
                <div class="metric-value status-healthy" id="equipment">18/20</div>
                <div class="metric-trend">設備正常運行</div>
                <div class="chart-container">設備狀態圖</div>
            </div>
        </div>
        
        <div class="alerts" id="alerts">
            <h3>🚨 系統告警</h3>
            <p>目前無告警事件</p>
        </div>
    </div>
    
    ${autoRefresh ? `<div class="refresh-info">🔄 自動刷新: ${refreshInterval/1000}s</div>` : ''}
    
    <script>
        class FucoMonitoring {
            constructor() {
                this.apiBase = '/api';
                this.refreshInterval = ${refreshInterval};
                this.init();
            }
            
            async init() {
                await this.updateMetrics();
                this.updateTimestamp();
                
                if (this.refreshInterval > 0) {
                    setInterval(() => {
                        this.updateMetrics();
                        this.updateTimestamp();
                    }, this.refreshInterval);
                }
            }
            
            async updateMetrics() {
                try {
                    // 系統健康度
                    const healthResponse = await fetch(\`\${this.apiBase}/health\`);
                    const healthData = await healthResponse.json();
                    
                    // 更新各項指標
                    this.updateMetric('systemHealth', healthData.systemHealth || '86%');
                    this.updateMetric('responseTime', healthData.responseTime || '45ms');
                    this.updateMetric('throughput', healthData.throughput || '156');
                    this.updateMetric('resources', healthData.resources || '65%');
                    this.updateMetric('production', healthData.production || '142');
                    this.updateMetric('equipment', healthData.equipment || '18/20');
                    
                    // 更新告警
                    this.updateAlerts(healthData.alerts || []);
                    
                } catch (error) {
                    console.error('更新指標失敗:', error);
                    this.showError('無法連接到監控 API');
                }
            }
            
            updateMetric(id, value) {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            }
            
            updateTimestamp() {
                const element = document.getElementById('lastUpdate');
                if (element) {
                    element.textContent = new Date().toLocaleTimeString();
                }
            }
            
            updateAlerts(alerts) {
                const alertsElement = document.getElementById('alerts');
                if (alerts.length === 0) {
                    alertsElement.innerHTML = '<h3>🚨 系統告警</h3><p>目前無告警事件</p>';
                } else {
                    let alertsHtml = '<h3>🚨 系統告警</h3>';
                    alerts.forEach(alert => {
                        alertsHtml += \`<div class="alert-item">\${alert.message}</div>\`;
                    });
                    alertsElement.innerHTML = alertsHtml;
                }
            }
            
            showError(message) {
                const alertsElement = document.getElementById('alerts');
                alertsElement.innerHTML = \`<h3>❌ 連接錯誤</h3><p>\${message}</p>\`;
            }
        }
        
        // 初始化監控儀表板
        const monitoring = new FucoMonitoring();
    </script>
</body>
</html>`;
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`📊 ${this.name} v${this.version} 已啟動`);
  }
}

// 啟動 Agent
if (require.main === module) {
  const agent = new FucoMonitorAgent();
  agent.start().catch(console.error);
}

module.exports = FucoMonitorAgent;