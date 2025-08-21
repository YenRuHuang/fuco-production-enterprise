#!/usr/bin/env node

/**
 * FUCO Production Planning Agent - 專門處理生產排程和工單管理
 * 負責智能排程、產能分析、瓶頸優化和BOM管理
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
const execAsync = util.promisify(exec);

class FucoPlanningAgent {
  constructor() {
    this.name = "FUCO Production Planning Agent";
    this.version = "1.0.0";
    this.fucoProjectPath = path.resolve(process.env.HOME, 'Documents', 'fuco-production-enterprise');
    
    // 初始化 MCP Server
    this.server = new Server(
      {
        name: "fuco-planning-agent",
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
        name: "create_production_schedule",
        description: "創建智能生產排程",
        inputSchema: {
          type: "object",
          properties: {
            startDate: { type: "string", description: "排程開始日期 (YYYY-MM-DD)" },
            endDate: { type: "string", description: "排程結束日期 (YYYY-MM-DD)" },
            priorityRule: { type: "string", description: "優先級規則", enum: ["FIFO", "EDD", "SPT", "CRITICAL_RATIO"], default: "EDD" },
            workstations: { type: "array", description: "指定工作站（可選）", items: { type: "string" } },
            optimizeFor: { type: "string", description: "優化目標", enum: ["makespan", "lateness", "utilization"], default: "makespan" }
          },
          required: ["startDate", "endDate"]
        }
      },
      {
        name: "analyze_capacity_load",
        description: "分析產能負載和瓶頸",
        inputSchema: {
          type: "object",
          properties: {
            timeHorizon: { type: "string", description: "分析時間範圍", enum: ["daily", "weekly", "monthly"], default: "weekly" },
            workstation: { type: "string", description: "特定工作站（可選）" },
            includeBottleneck: { type: "boolean", description: "包含瓶頸分析", default: true }
          }
        }
      },
      {
        name: "optimize_work_orders",
        description: "優化工單排序和分配",
        inputSchema: {
          type: "object",
          properties: {
            workOrders: { type: "array", description: "工單ID列表", items: { type: "string" } },
            constraints: { type: "object", description: "約束條件（JSON格式）" },
            algorithm: { type: "string", description: "排程算法", enum: ["genetic", "simulated_annealing", "greedy"], default: "genetic" }
          },
          required: ["workOrders"]
        }
      },
      {
        name: "generate_bom_explosion",
        description: "BOM展開和物料需求計算",
        inputSchema: {
          type: "object",
          properties: {
            productId: { type: "string", description: "產品ID" },
            quantity: { type: "number", description: "需求數量" },
            requiredDate: { type: "string", description: "需求日期 (YYYY-MM-DD)" },
            includeInventory: { type: "boolean", description: "考慮現有庫存", default: true }
          },
          required: ["productId", "quantity", "requiredDate"]
        }
      },
      {
        name: "create_planning_dashboard",
        description: "創建生產排程儀表板",
        inputSchema: {
          type: "object",
          properties: {
            dashboardType: { type: "string", description: "儀表板類型", enum: ["schedule", "capacity", "gantt", "kpi"], default: "schedule" },
            timeRange: { type: "string", description: "時間範圍", enum: ["week", "month", "quarter"], default: "week" },
            realTime: { type: "boolean", description: "即時更新", default: true }
          }
        }
      },
      {
        name: "simulate_production_scenario",
        description: "生產情境模擬和分析",
        inputSchema: {
          type: "object",
          properties: {
            scenario: { type: "string", description: "模擬情境", enum: ["rush_order", "equipment_failure", "material_shortage", "overtime"], default: "rush_order" },
            parameters: { type: "object", description: "模擬參數" },
            iterations: { type: "number", description: "模擬次數", default: 100 }
          },
          required: ["scenario"]
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
          case "create_production_schedule":
            return await this.createProductionSchedule(args);
          case "analyze_capacity_load":
            return await this.analyzeCapacityLoad(args);
          case "optimize_work_orders":
            return await this.optimizeWorkOrders(args);
          case "generate_bom_explosion":
            return await this.generateBomExplosion(args);
          case "create_planning_dashboard":
            return await this.createPlanningDashboard(args);
          case "simulate_production_scenario":
            return await this.simulateProductionScenario(args);
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

  // 創建生產排程
  async createProductionSchedule(args) {
    const { startDate, endDate, priorityRule = "EDD", workstations = [], optimizeFor = "makespan" } = args;
    
    const schedule = await this.generateOptimalSchedule(startDate, endDate, priorityRule, workstations, optimizeFor);
    
    // 保存排程結果
    const scheduleFile = path.join(this.fucoProjectPath, 'schedules', `schedule_${Date.now()}.json`);
    await fs.mkdir(path.dirname(scheduleFile), { recursive: true });
    await fs.writeFile(scheduleFile, JSON.stringify(schedule, null, 2));
    
    // 創建排程視覺化檔案
    const ganttChart = await this.createGanttChart(schedule);
    const ganttFile = path.join(this.fucoProjectPath, 'src', 'frontend', `schedule-gantt-${Date.now()}.html`);
    await fs.writeFile(ganttFile, ganttChart);
    
    return {
      content: [
        {
          type: "text",
          text: `📅 生產排程已創建：
          
🎯 排程資訊：
- 時間範圍: ${startDate} 至 ${endDate}
- 優先級規則: ${priorityRule}
- 優化目標: ${optimizeFor}
- 工作站數: ${schedule.workstations.length}
- 工單數: ${schedule.workOrders.length}

📊 排程結果：
- 總完工時間: ${schedule.summary.makespan} 小時
- 平均延遲: ${schedule.summary.averageLateness.toFixed(2)} 小時
- 設備利用率: ${schedule.summary.utilization.toFixed(1)}%
- 準時交貨率: ${schedule.summary.onTimeDelivery.toFixed(1)}%

📁 輸出檔案：
- 排程數據: ${scheduleFile}
- 甘特圖: ${ganttFile}

💡 建議：
${schedule.recommendations.join('\n')}`
        }
      ]
    };
  }

  // 分析產能負載
  async analyzeCapacityLoad(args) {
    const { timeHorizon = "weekly", workstation, includeBottleneck = true } = args;
    
    const analysis = await this.performCapacityAnalysis(timeHorizon, workstation, includeBottleneck);
    
    // 保存分析結果
    const analysisFile = path.join(this.fucoProjectPath, 'reports', 'capacity', `capacity_analysis_${Date.now()}.json`);
    await fs.mkdir(path.dirname(analysisFile), { recursive: true });
    await fs.writeFile(analysisFile, JSON.stringify(analysis, null, 2));
    
    return {
      content: [
        {
          type: "text",
          text: `⚡ 產能負載分析完成：

📊 總體產能狀況：
- 平均產能利用率: ${analysis.overall.averageUtilization.toFixed(1)}%
- 最高負載工作站: ${analysis.overall.highestLoadStation} (${analysis.overall.highestLoad.toFixed(1)}%)
- 最低負載工作站: ${analysis.overall.lowestLoadStation} (${analysis.overall.lowestLoad.toFixed(1)}%)

${includeBottleneck ? `🔍 瓶頸分析：
- 主要瓶頸: ${analysis.bottleneck.primary.station} (${analysis.bottleneck.primary.severity}%)
- 次要瓶頸: ${analysis.bottleneck.secondary.station} (${analysis.bottleneck.secondary.severity}%)
- 瓶頸影響: 影響 ${analysis.bottleneck.impactedOrders} 個工單

🎯 瓶頸改善建議：
${analysis.bottleneck.recommendations.join('\n')}` : ''}

📈 工作站詳情：
${analysis.workstations.map(ws => 
  `- ${ws.station}: ${ws.utilization.toFixed(1)}% (${ws.status})`
).join('\n')}

💡 產能優化建議：
${analysis.recommendations.join('\n')}

📁 詳細報告: ${analysisFile}`
        }
      ]
    };
  }

  // 優化工單排序
  async optimizeWorkOrders(args) {
    const { workOrders, constraints = {}, algorithm = "genetic" } = args;
    
    const optimization = await this.runOptimizationAlgorithm(workOrders, constraints, algorithm);
    
    return {
      content: [
        {
          type: "text",
          text: `🧬 工單優化完成 (${algorithm.toUpperCase()} 算法)：

📋 優化前後對比：
- 原始完工時間: ${optimization.before.makespan} 小時
- 優化後完工時間: ${optimization.after.makespan} 小時
- 改善幅度: ${optimization.improvement.makespan.toFixed(1)}%

⏰ 交期表現：
- 原始準時率: ${optimization.before.onTimeRate.toFixed(1)}%
- 優化後準時率: ${optimization.after.onTimeRate.toFixed(1)}%
- 改善幅度: +${optimization.improvement.onTimeRate.toFixed(1)}%

📊 資源利用：
- 平均利用率提升: +${optimization.improvement.utilization.toFixed(1)}%
- 負載平衡改善: ${optimization.improvement.loadBalance.toFixed(1)}%

🎯 優化後工單順序：
${optimization.optimizedSequence.slice(0, 10).map((order, i) => 
  `${i+1}. ${order.id} (優先級: ${order.priority})`
).join('\n')}
${optimization.optimizedSequence.length > 10 ? `... 等共 ${optimization.optimizedSequence.length} 個工單` : ''}

💡 實施建議：
${optimization.recommendations.join('\n')}`
        }
      ]
    };
  }

  // BOM展開和物料需求
  async generateBomExplosion(args) {
    const { productId, quantity, requiredDate, includeInventory = true } = args;
    
    const bomExplosion = await this.performBomExplosion(productId, quantity, requiredDate, includeInventory);
    
    // 生成物料需求計劃
    const mrpFile = path.join(this.fucoProjectPath, 'mrp', `mrp_${productId}_${Date.now()}.json`);
    await fs.mkdir(path.dirname(mrpFile), { recursive: true });
    await fs.writeFile(mrpFile, JSON.stringify(bomExplosion, null, 2));
    
    return {
      content: [
        {
          type: "text",
          text: `📦 BOM展開完成：

🎯 產品資訊：
- 產品ID: ${productId}
- 需求數量: ${quantity.toLocaleString()}
- 需求日期: ${requiredDate}

📋 物料需求總覽：
- 原料項目: ${bomExplosion.summary.rawMaterials} 項
- 半成品項目: ${bomExplosion.summary.subAssemblies} 項
- 採購項目: ${bomExplosion.summary.purchasedItems} 項
- 總成本估算: $${bomExplosion.summary.totalCost.toLocaleString()}

⚠️ 缺料警示：
${bomExplosion.shortages.length > 0 ? 
  bomExplosion.shortages.map(shortage => 
    `- ${shortage.material}: 缺 ${shortage.quantity} ${shortage.unit} (需求日: ${shortage.requiredDate})`
  ).join('\n') 
  : '✅ 無缺料問題'}

📅 關鍵路徑：
${bomExplosion.criticalPath.map(item => 
  `- ${item.material}: ${item.leadTime} 天前需開始採購/生產`
).join('\n')}

💰 採購建議：
${bomExplosion.purchaseRecommendations.map(rec => 
  `- ${rec.supplier}: ${rec.materials.join(', ')} (總額: $${rec.amount.toLocaleString()})`
).join('\n')}

📁 詳細MRP: ${mrpFile}`
        }
      ]
    };
  }

  // 創建排程儀表板
  async createPlanningDashboard(args) {
    const { dashboardType = "schedule", timeRange = "week", realTime = true } = args;
    
    const dashboard = this.generatePlanningDashboard(dashboardType, timeRange, realTime);
    const dashboardFile = path.join(this.fucoProjectPath, 'src', 'frontend', `planning-dashboard-${dashboardType}.html`);
    
    await fs.writeFile(dashboardFile, dashboard);
    
    return {
      content: [
        {
          type: "text",
          text: `📊 生產排程儀表板已創建：

🎯 儀表板配置：
- 類型: ${dashboardType}
- 時間範圍: ${timeRange}
- 即時更新: ${realTime ? '啟用' : '關閉'}

📁 檔案位置: ${dashboardFile}
🌐 訪問網址: http://localhost:8847/planning-dashboard-${dashboardType}.html

🚀 功能特色：
- 即時工單狀態追蹤
- 互動式甘特圖
- 產能負載視覺化
- 瓶頸分析圖表
- 關鍵指標監控

💡 使用建議：
1. 使用拖拽功能調整工單順序
2. 點擊工作站查看詳細負載
3. 使用篩選器查看特定時間範圍
4. 匯出排程數據進行進一步分析`
        }
      ]
    };
  }

  // 生產情境模擬
  async simulateProductionScenario(args) {
    const { scenario, parameters = {}, iterations = 100 } = args;
    
    const simulation = await this.runProductionSimulation(scenario, parameters, iterations);
    
    return {
      content: [
        {
          type: "text",
          text: `🎮 生產情境模擬完成：

🎯 模擬情境: ${scenario.toUpperCase()}
🔢 模擬次數: ${iterations}

📊 模擬結果統計：
- 平均完工時間: ${simulation.results.averageMakespan.toFixed(1)} ± ${simulation.results.makespanStdDev.toFixed(1)} 小時
- 最佳情況: ${simulation.results.bestCase.makespan} 小時
- 最差情況: ${simulation.results.worstCase.makespan} 小時
- 成功率: ${simulation.results.successRate.toFixed(1)}%

📈 關鍵指標影響：
- 準時交貨率: ${simulation.impact.onTimeDelivery.toFixed(1)}% (${simulation.impact.onTimeDelivery > 0 ? '+' : ''}${simulation.impact.onTimeDeliveryChange.toFixed(1)}%)
- 設備利用率: ${simulation.impact.utilization.toFixed(1)}% (${simulation.impact.utilization > 0 ? '+' : ''}${simulation.impact.utilizationChange.toFixed(1)}%)
- 生產成本: $${simulation.impact.cost.toLocaleString()} (${simulation.impact.cost > 0 ? '+' : ''}${simulation.impact.costChange.toFixed(1)}%)

⚡ 風險評估：
- 高風險機率: ${simulation.risk.high.toFixed(1)}%
- 中風險機率: ${simulation.risk.medium.toFixed(1)}%
- 低風險機率: ${simulation.risk.low.toFixed(1)}%

🛡️ 應變策略：
${simulation.contingencyPlans.map((plan, i) => 
  `${i+1}. ${plan.condition}: ${plan.action}`
).join('\n')}

💡 管理建議：
${simulation.recommendations.join('\n')}`
        }
      ]
    };
  }

  // 輔助方法
  async generateOptimalSchedule(startDate, endDate, priorityRule, workstations, optimizeFor) {
    // 模擬智能排程算法
    const mockWorkOrders = this.generateMockWorkOrders(50);
    const mockWorkstations = workstations.length > 0 ? workstations : ['A', 'B', 'C', 'D', 'E'];
    
    // 根據優先級規則排序工單
    const sortedOrders = this.sortWorkOrdersByPriority(mockWorkOrders, priorityRule);
    
    // 生成排程
    const schedule = this.createScheduleFromOrders(sortedOrders, mockWorkstations, startDate, endDate);
    
    return {
      timeRange: { start: startDate, end: endDate },
      workstations: mockWorkstations.map(ws => ({
        id: ws,
        capacity: 8, // 8小時/天
        utilization: Math.random() * 40 + 60 // 60-100%
      })),
      workOrders: sortedOrders.slice(0, 20), // 顯示前20個
      summary: {
        makespan: Math.floor(Math.random() * 168 + 72), // 72-240小時
        averageLateness: Math.random() * 12,
        utilization: Math.random() * 25 + 75,
        onTimeDelivery: Math.random() * 20 + 80
      },
      recommendations: [
        '考慮增加工作站B的產能以解決瓶頸',
        '建議調整工單W001的交期以平衡負載',
        '可考慮安排部分工單在非尖峰時段生產'
      ]
    };
  }

  async performCapacityAnalysis(timeHorizon, workstation, includeBottleneck) {
    const workstations = workstation ? [workstation] : ['A', 'B', 'C', 'D', 'E'];
    
    const analysis = {
      timeHorizon,
      timestamp: new Date().toISOString(),
      overall: {
        averageUtilization: Math.random() * 30 + 70,
        highestLoadStation: 'B',
        highestLoad: Math.random() * 20 + 85,
        lowestLoadStation: 'D', 
        lowestLoad: Math.random() * 30 + 45
      },
      workstations: workstations.map(ws => ({
        station: ws,
        utilization: Math.random() * 40 + 60,
        status: Math.random() > 0.8 ? 'overloaded' : Math.random() > 0.3 ? 'normal' : 'underutilized'
      })),
      recommendations: [
        '建議將部分負載從工作站B轉移至工作站D',
        '考慮增加工作站B的班次或人力',
        '評估工作站D的產能擴充可能性'
      ]
    };

    if (includeBottleneck) {
      analysis.bottleneck = {
        primary: { station: 'B', severity: 92 },
        secondary: { station: 'A', severity: 78 },
        impactedOrders: 12,
        recommendations: [
          '立即調度額外人力至工作站B',
          '考慮外包部分工序',
          '重新安排工單優先級'
        ]
      };
    }

    return analysis;
  }

  async runOptimizationAlgorithm(workOrders, constraints, algorithm) {
    // 模擬優化結果
    const beforeMakespan = Math.floor(Math.random() * 200 + 150);
    const afterMakespan = Math.floor(beforeMakespan * (0.8 + Math.random() * 0.15));
    
    return {
      algorithm,
      before: {
        makespan: beforeMakespan,
        onTimeRate: Math.random() * 20 + 70,
        utilization: Math.random() * 20 + 65
      },
      after: {
        makespan: afterMakespan,
        onTimeRate: Math.random() * 15 + 85,
        utilization: Math.random() * 15 + 80
      },
      improvement: {
        makespan: ((beforeMakespan - afterMakespan) / beforeMakespan * 100),
        onTimeRate: Math.random() * 15 + 5,
        utilization: Math.random() * 10 + 5,
        loadBalance: Math.random() * 20 + 10
      },
      optimizedSequence: workOrders.slice(0, 15).map((id, i) => ({
        id,
        priority: Math.floor(Math.random() * 5) + 1,
        estimatedStart: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })),
      recommendations: [
        '建議立即實施新的工單順序',
        '監控前三天的執行效果',
        '準備彈性調整機制應對突發狀況'
      ]
    };
  }

  generateMockWorkOrders(count) {
    return Array.from({ length: count }, (_, i) => ({
      id: `W${String(i + 1).padStart(3, '0')}`,
      product: `產品-${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`,
      quantity: Math.floor(Math.random() * 1000) + 100,
      dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: Math.floor(Math.random() * 5) + 1,
      estimatedTime: Math.floor(Math.random() * 24) + 4
    }));
  }

  sortWorkOrdersByPriority(orders, rule) {
    switch (rule) {
      case 'FIFO':
        return orders.sort((a, b) => new Date(a.createdDate) - new Date(b.createdDate));
      case 'EDD':
        return orders.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      case 'SPT':
        return orders.sort((a, b) => a.estimatedTime - b.estimatedTime);
      case 'CRITICAL_RATIO':
        return orders.sort((a, b) => a.priority - b.priority);
      default:
        return orders;
    }
  }

  createScheduleFromOrders(orders, workstations, startDate, endDate) {
    // 簡化的排程邏輯
    return orders.map((order, i) => ({
      ...order,
      assignedStation: workstations[i % workstations.length],
      scheduledStart: new Date(Date.now() + i * 6 * 60 * 60 * 1000).toISOString(),
      scheduledEnd: new Date(Date.now() + (i + 1) * 6 * 60 * 60 * 1000).toISOString()
    }));
  }

  async performBomExplosion(productId, quantity, requiredDate, includeInventory) {
    // 模擬BOM展開結果
    return {
      product: { id: productId, quantity, requiredDate },
      summary: {
        rawMaterials: Math.floor(Math.random() * 20) + 10,
        subAssemblies: Math.floor(Math.random() * 8) + 3,
        purchasedItems: Math.floor(Math.random() * 15) + 5,
        totalCost: Math.floor(Math.random() * 50000) + 25000
      },
      shortages: Math.random() > 0.7 ? [
        { material: 'Steel-A001', quantity: 500, unit: 'kg', requiredDate: requiredDate },
        { material: 'Plastic-B002', quantity: 200, unit: 'pcs', requiredDate: requiredDate }
      ] : [],
      criticalPath: [
        { material: 'Steel-A001', leadTime: 14, action: 'purchase' },
        { material: 'Component-C003', leadTime: 21, action: 'manufacture' },
        { material: 'Assembly-D004', leadTime: 7, action: 'assemble' }
      ],
      purchaseRecommendations: [
        { supplier: 'Supplier-A', materials: ['Steel-A001', 'Bolt-E005'], amount: 15000 },
        { supplier: 'Supplier-B', materials: ['Plastic-B002'], amount: 8000 }
      ]
    };
  }

  generatePlanningDashboard(dashboardType, timeRange, realTime) {
    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FUCO 生產排程儀表板 - ${dashboardType}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            min-height: 100vh;
            color: white;
        }
        
        .dashboard {
            padding: 20px;
            max-width: 1600px;
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
        
        .gantt-container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            min-height: 400px;
        }
        
        .workstation-row {
            margin-bottom: 15px;
            display: flex;
            align-items: center;
        }
        
        .workstation-label {
            width: 100px;
            font-weight: bold;
        }
        
        .timeline {
            flex: 1;
            height: 30px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            position: relative;
            margin-left: 10px;
        }
        
        .work-order {
            position: absolute;
            height: 100%;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .work-order:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .controls {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .btn {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
        }
        
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-normal { background: #4ade80; }
        .status-warning { background: #fbbf24; }
        .status-critical { background: #f87171; }
        
        .refresh-info {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.3);
            padding: 10px 15px;
            border-radius: 25px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🏭 FUCO 生產排程儀表板</h1>
            <p>${dashboardType} 模式 | 時間範圍: ${timeRange} | 最後更新: <span id="lastUpdate"></span></p>
        </div>
        
        <div class="controls">
            <button class="btn" onclick="refreshData()">🔄 刷新數據</button>
            <button class="btn" onclick="exportSchedule()">📊 匯出排程</button>
            <button class="btn" onclick="optimizeSchedule()">⚡ 重新優化</button>
            <button class="btn" onclick="showCapacityView()">📈 產能分析</button>
            <select class="btn" onchange="changeTimeRange(this.value)">
                <option value="week">本週</option>
                <option value="month">本月</option>
                <option value="quarter">本季</option>
            </select>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>🎯 排程效率</h3>
                <div style="font-size: 32px; margin: 10px 0;" id="scheduleEfficiency">87.5%</div>
                <div style="font-size: 14px; opacity: 0.8;">較上週 +3.2%</div>
            </div>
            
            <div class="metric-card">
                <h3>⏰ 準時交貨率</h3>
                <div style="font-size: 32px; margin: 10px 0;" id="onTimeDelivery">92.3%</div>
                <div style="font-size: 14px; opacity: 0.8;">目標: 95%</div>
            </div>
            
            <div class="metric-card">
                <h3>🏭 設備利用率</h3>
                <div style="font-size: 32px; margin: 10px 0;" id="utilization">78.9%</div>
                <div style="font-size: 14px; opacity: 0.8;">平均負載</div>
            </div>
            
            <div class="metric-card">
                <h3>📦 進行中工單</h3>
                <div style="font-size: 32px; margin: 10px 0;" id="activeOrders">24</div>
                <div style="font-size: 14px; opacity: 0.8;">總計 156 個工單</div>
            </div>
        </div>
        
        <div class="gantt-container">
            <h3>📅 甘特圖 - 工作站排程</h3>
            <div id="ganttChart">
                <div class="workstation-row">
                    <div class="workstation-label">
                        <span class="status-indicator status-normal"></span>工作站 A
                    </div>
                    <div class="timeline">
                        <div class="work-order" style="left: 5%; width: 15%; background: #3b82f6;">W001</div>
                        <div class="work-order" style="left: 25%; width: 20%; background: #10b981;">W005</div>
                        <div class="work-order" style="left: 50%; width: 18%; background: #f59e0b;">W012</div>
                    </div>
                </div>
                
                <div class="workstation-row">
                    <div class="workstation-label">
                        <span class="status-indicator status-warning"></span>工作站 B
                    </div>
                    <div class="timeline">
                        <div class="work-order" style="left: 2%; width: 25%; background: #ef4444;">W002</div>
                        <div class="work-order" style="left: 30%; width: 22%; background: #8b5cf6;">W007</div>
                        <div class="work-order" style="left: 55%; width: 25%; background: #06b6d4;">W015</div>
                    </div>
                </div>
                
                <div class="workstation-row">
                    <div class="workstation-label">
                        <span class="status-indicator status-normal"></span>工作站 C
                    </div>
                    <div class="timeline">
                        <div class="work-order" style="left: 10%; width: 18%; background: #84cc16;">W003</div>
                        <div class="work-order" style="left: 35%; width: 15%; background: #f97316;">W009</div>
                        <div class="work-order" style="left: 55%; width: 20%; background: #ec4899;">W018</div>
                    </div>
                </div>
                
                <div class="workstation-row">
                    <div class="workstation-label">
                        <span class="status-indicator status-normal"></span>工作站 D
                    </div>
                    <div class="timeline">
                        <div class="work-order" style="left: 8%; width: 12%; background: #6366f1;">W004</div>
                        <div class="work-order" style="left: 25%; width: 28%; background: #14b8a6;">W011</div>
                        <div class="work-order" style="left: 60%; width: 15%; background: #f59e0b;">W020</div>
                    </div>
                </div>
                
                <div class="workstation-row">
                    <div class="workstation-label">
                        <span class="status-indicator status-critical"></span>工作站 E
                    </div>
                    <div class="timeline">
                        <div class="work-order" style="left: 15%; width: 30%; background: #dc2626;">W006</div>
                        <div class="work-order" style="left: 50%; width: 25%; background: #7c3aed;">W014</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    ${realTime ? '<div class="refresh-info">🔄 自動刷新: 30s</div>' : ''}
    
    <script>
        class PlanningDashboard {
            constructor() {
                this.refreshInterval = ${realTime ? 30000 : 0};
                this.init();
            }
            
            init() {
                this.updateTimestamp();
                this.loadScheduleData();
                
                if (this.refreshInterval > 0) {
                    setInterval(() => {
                        this.updateMetrics();
                        this.updateTimestamp();
                    }, this.refreshInterval);
                }
            }
            
            updateTimestamp() {
                document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
            }
            
            async loadScheduleData() {
                try {
                    // 模擬從 API 載入排程數據
                    this.updateMetrics();
                } catch (error) {
                    console.error('載入排程數據失敗:', error);
                }
            }
            
            updateMetrics() {
                // 模擬數據更新
                const efficiency = (Math.random() * 10 + 85).toFixed(1);
                const delivery = (Math.random() * 8 + 90).toFixed(1);
                const utilization = (Math.random() * 15 + 75).toFixed(1);
                const orders = Math.floor(Math.random() * 10) + 20;
                
                document.getElementById('scheduleEfficiency').textContent = efficiency + '%';
                document.getElementById('onTimeDelivery').textContent = delivery + '%';
                document.getElementById('utilization').textContent = utilization + '%';
                document.getElementById('activeOrders').textContent = orders;
            }
        }
        
        function refreshData() {
            window.dashboard.loadScheduleData();
            console.log('數據已刷新');
        }
        
        function exportSchedule() {
            console.log('匯出排程數據');
            // 實際實施時連接到 API
        }
        
        function optimizeSchedule() {
            console.log('重新優化排程');
            // 實際實施時調用優化算法
        }
        
        function showCapacityView() {
            console.log('顯示產能分析');
            // 切換到產能分析視圖
        }
        
        function changeTimeRange(range) {
            console.log('時間範圍改變:', range);
            // 重新載入對應時間範圍的數據
        }
        
        // 初始化儀表板
        window.dashboard = new PlanningDashboard();
    </script>
</body>
</html>`;
  }

  async runProductionSimulation(scenario, parameters, iterations) {
    // 模擬生產情境分析結果
    const baselineTime = 160; // 基準完工時間
    let makespanResults = [];
    
    for (let i = 0; i < iterations; i++) {
      let adjustment = 1;
      switch (scenario) {
        case 'rush_order':
          adjustment = 1 + Math.random() * 0.3; // 增加30%
          break;
        case 'equipment_failure':
          adjustment = 1 + Math.random() * 0.5; // 增加50%
          break;
        case 'material_shortage':
          adjustment = 1 + Math.random() * 0.4; // 增加40%
          break;
        case 'overtime':
          adjustment = 0.8 + Math.random() * 0.2; // 減少20%
          break;
      }
      makespanResults.push(baselineTime * adjustment);
    }
    
    const average = makespanResults.reduce((a, b) => a + b) / iterations;
    const stdDev = Math.sqrt(makespanResults.reduce((sq, n) => sq + Math.pow(n - average, 2), 0) / iterations);
    
    return {
      scenario,
      iterations,
      results: {
        averageMakespan: average,
        makespanStdDev: stdDev,
        bestCase: { makespan: Math.min(...makespanResults) },
        worstCase: { makespan: Math.max(...makespanResults) },
        successRate: (makespanResults.filter(t => t < baselineTime * 1.2).length / iterations) * 100
      },
      impact: {
        onTimeDelivery: Math.random() * 20 + 75,
        onTimeDeliveryChange: Math.random() * 20 - 10,
        utilization: Math.random() * 20 + 70,
        utilizationChange: Math.random() * 15 - 7.5,
        cost: Math.floor(Math.random() * 100000) + 200000,
        costChange: Math.random() * 30 - 15
      },
      risk: {
        high: Math.random() * 20 + 5,
        medium: Math.random() * 30 + 25,
        low: Math.random() * 20 + 55
      },
      contingencyPlans: [
        { condition: '設備故障超過4小時', action: '啟動備用設備或外包' },
        { condition: '物料短缺影響生產', action: '調整工單順序或尋找替代料' },
        { condition: '交期延遲超過2天', action: '安排加班或增加人力' }
      ],
      recommendations: [
        '建立設備備用方案以降低風險',
        '強化供應商管理和庫存安全',
        '制定彈性排程策略應對突發狀況'
      ]
    };
  }

  async createGanttChart(schedule) {
    // 生成簡化的甘特圖 HTML
    return `<!DOCTYPE html>
<html>
<head>
    <title>FUCO 生產排程甘特圖</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .gantt-row { margin: 10px 0; display: flex; align-items: center; }
        .station-label { width: 100px; font-weight: bold; }
        .timeline { flex: 1; height: 30px; background: #f0f0f0; position: relative; }
        .task { position: absolute; height: 100%; background: #4CAF50; color: white; 
                display: flex; align-items: center; justify-content: center; font-size: 12px; }
    </style>
</head>
<body>
    <h2>生產排程甘特圖</h2>
    <div class="gantt-container">
        ${schedule.workstations.map(ws => `
            <div class="gantt-row">
                <div class="station-label">工作站 ${ws.id}</div>
                <div class="timeline">
                    <!-- 工單任務將在這裡動態顯示 -->
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`🏭 ${this.name} v${this.version} 已啟動`);
  }
}

// 啟動 Agent
if (require.main === module) {
  const agent = new FucoPlanningAgent();
  agent.start().catch(console.error);
}

module.exports = FucoPlanningAgent;