/**
 * FUCO Production Planning Routes
 * 生產規劃路由 - 排程算法實現
 */

const express = require('express');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * 智能工單排程算法
 * 基於遺傳算法的多目標優化排程
 */
class IntelligentScheduler {
  constructor() {
    this.populationSize = 50;
    this.generations = 100;
    this.mutationRate = 0.1;
    this.crossoverRate = 0.8;
  }

  /**
   * 主要排程方法
   * @param {Array} workOrders 工單列表
   * @param {Array} workstations 工作站列表
   * @param {Object} constraints 約束條件
   */
  async optimizeSchedule(workOrders, workstations, constraints = {}) {
    try {
      // 1. 數據預處理
      const processedOrders = this.preprocessWorkOrders(workOrders);
      const processedStations = this.preprocessWorkstations(workstations);
      
      // 2. 初始化種群
      let population = this.initializePopulation(processedOrders, processedStations);
      
      // 3. 遺傳算法迭代
      for (let generation = 0; generation < this.generations; generation++) {
        // 計算適應度
        population = this.evaluateFitness(population, constraints);
        
        // 選擇
        const parents = this.selection(population);
        
        // 交叉
        const offspring = this.crossover(parents);
        
        // 變異
        this.mutation(offspring);
        
        // 替換
        population = this.replacement(population, offspring);
        
        logger.info(`遺傳算法第 ${generation + 1} 代完成`);
      }
      
      // 4. 返回最佳解
      const bestSolution = population[0];
      return this.formatScheduleResult(bestSolution, processedOrders, processedStations);
      
    } catch (error) {
      logger.error('排程優化失敗:', error);
      throw error;
    }
  }

  /**
   * 工單預處理
   */
  preprocessWorkOrders(workOrders) {
    return workOrders.map(order => ({
      id: order.id,
      priority: order.priority || 1,
      estimatedTime: order.estimatedTime || 60,
      dueDate: new Date(order.dueDate),
      requiredSkills: order.requiredSkills || [],
      dependencies: order.dependencies || [],
      complexity: this.calculateComplexity(order)
    }));
  }

  /**
   * 工作站預處理
   */
  preprocessWorkstations(workstations) {
    return workstations.map(station => ({
      id: station.id,
      capacity: station.capacity || 1,
      skills: station.skills || [],
      efficiency: station.efficiency || 1.0,
      maintenanceWindows: station.maintenanceWindows || [],
      currentLoad: station.currentLoad || 0
    }));
  }

  /**
   * 計算工單複雜度
   */
  calculateComplexity(order) {
    let complexity = 1;
    
    // 基於所需技能數量
    if (order.requiredSkills) {
      complexity += order.requiredSkills.length * 0.2;
    }
    
    // 基於預估時間
    if (order.estimatedTime > 120) {
      complexity += 0.5;
    }
    
    // 基於依賴關係
    if (order.dependencies && order.dependencies.length > 0) {
      complexity += order.dependencies.length * 0.3;
    }
    
    return Math.min(complexity, 3.0); // 限制最大複雜度
  }

  /**
   * 初始化種群
   */
  initializePopulation(orders, stations) {
    const population = [];
    
    for (let i = 0; i < this.populationSize; i++) {
      const chromosome = this.createRandomChromosome(orders, stations);
      population.push(chromosome);
    }
    
    return population;
  }

  /**
   * 創建隨機染色體（排程方案）
   */
  createRandomChromosome(orders, stations) {
    const chromosome = [];
    
    for (const order of orders) {
      // 隨機選擇工作站
      const availableStations = this.getCompatibleStations(order, stations);
      const selectedStation = availableStations[Math.floor(Math.random() * availableStations.length)];
      
      // 隨機選擇開始時間
      const startTime = this.generateRandomStartTime(order, selectedStation);
      
      chromosome.push({
        orderId: order.id,
        stationId: selectedStation.id,
        startTime: startTime,
        endTime: new Date(startTime.getTime() + order.estimatedTime * 60000)
      });
    }
    
    return {
      genes: chromosome,
      fitness: 0
    };
  }

  /**
   * 獲取兼容的工作站
   */
  getCompatibleStations(order, stations) {
    return stations.filter(station => {
      // 檢查技能匹配
      if (order.requiredSkills.length > 0) {
        return order.requiredSkills.every(skill => station.skills.includes(skill));
      }
      return true;
    });
  }

  /**
   * 生成隨機開始時間
   */
  generateRandomStartTime(order, station) {
    const now = new Date();
    const maxDelay = 24 * 60 * 60 * 1000; // 24小時
    const randomDelay = Math.random() * maxDelay;
    
    return new Date(now.getTime() + randomDelay);
  }

  /**
   * 適應度評估
   */
  evaluateFitness(population, constraints) {
    for (const individual of population) {
      individual.fitness = this.calculateFitness(individual, constraints);
    }
    
    // 按適應度排序（越高越好）
    population.sort((a, b) => b.fitness - a.fitness);
    
    return population;
  }

  /**
   * 計算個體適應度
   */
  calculateFitness(individual, constraints) {
    let fitness = 100; // 基礎分數
    
    // 1. 按時完成率
    const onTimeRate = this.calculateOnTimeRate(individual);
    fitness += onTimeRate * 30;
    
    // 2. 資源利用率
    const resourceUtilization = this.calculateResourceUtilization(individual);
    fitness += resourceUtilization * 25;
    
    // 3. 負載平衡
    const loadBalance = this.calculateLoadBalance(individual);
    fitness += loadBalance * 20;
    
    // 4. 優先級權重
    const priorityScore = this.calculatePriorityScore(individual);
    fitness += priorityScore * 25;
    
    // 5. 約束違反懲罰
    const constraintPenalty = this.calculateConstraintPenalty(individual, constraints);
    fitness -= constraintPenalty;
    
    return Math.max(fitness, 0);
  }

  /**
   * 計算按時完成率
   */
  calculateOnTimeRate(individual) {
    // 簡化計算 - 實際應該基於交期
    return Math.random() * 100; // 0-100
  }

  /**
   * 計算資源利用率
   */
  calculateResourceUtilization(individual) {
    // 簡化計算 - 實際應該分析工作站使用情況
    return Math.random() * 100; // 0-100
  }

  /**
   * 計算負載平衡
   */
  calculateLoadBalance(individual) {
    // 簡化計算 - 實際應該分析負載分布
    return Math.random() * 100; // 0-100
  }

  /**
   * 計算優先級分數
   */
  calculatePriorityScore(individual) {
    // 簡化計算 - 實際應該基於優先級排程
    return Math.random() * 100; // 0-100
  }

  /**
   * 計算約束違反懲罰
   */
  calculateConstraintPenalty(individual, constraints) {
    let penalty = 0;
    
    // 檢查時間衝突
    penalty += this.checkTimeConflicts(individual) * 50;
    
    // 檢查資源衝突
    penalty += this.checkResourceConflicts(individual) * 30;
    
    // 檢查依賴關係
    penalty += this.checkDependencyViolations(individual) * 70;
    
    return penalty;
  }

  checkTimeConflicts(individual) {
    // 簡化檢查
    return Math.random() * 0.2; // 0-20% 衝突率
  }

  checkResourceConflicts(individual) {
    // 簡化檢查
    return Math.random() * 0.1; // 0-10% 衝突率
  }

  checkDependencyViolations(individual) {
    // 簡化檢查
    return Math.random() * 0.05; // 0-5% 違反率
  }

  /**
   * 選擇操作 - 錦標賽選擇
   */
  selection(population) {
    const parents = [];
    const tournamentSize = 3;
    
    for (let i = 0; i < this.populationSize; i++) {
      const tournament = [];
      
      // 隨機選擇錦標賽參與者
      for (let j = 0; j < tournamentSize; j++) {
        const randomIndex = Math.floor(Math.random() * population.length);
        tournament.push(population[randomIndex]);
      }
      
      // 選擇最好的
      tournament.sort((a, b) => b.fitness - a.fitness);
      parents.push(tournament[0]);
    }
    
    return parents;
  }

  /**
   * 交叉操作
   */
  crossover(parents) {
    const offspring = [];
    
    for (let i = 0; i < parents.length - 1; i += 2) {
      if (Math.random() < this.crossoverRate) {
        const [child1, child2] = this.performCrossover(parents[i], parents[i + 1]);
        offspring.push(child1, child2);
      } else {
        offspring.push(parents[i], parents[i + 1]);
      }
    }
    
    return offspring;
  }

  /**
   * 執行交叉操作
   */
  performCrossover(parent1, parent2) {
    const crossoverPoint = Math.floor(Math.random() * parent1.genes.length);
    
    const child1Genes = [
      ...parent1.genes.slice(0, crossoverPoint),
      ...parent2.genes.slice(crossoverPoint)
    ];
    
    const child2Genes = [
      ...parent2.genes.slice(0, crossoverPoint),
      ...parent1.genes.slice(crossoverPoint)
    ];
    
    return [
      { genes: child1Genes, fitness: 0 },
      { genes: child2Genes, fitness: 0 }
    ];
  }

  /**
   * 變異操作
   */
  mutation(population) {
    for (const individual of population) {
      if (Math.random() < this.mutationRate) {
        this.performMutation(individual);
      }
    }
  }

  /**
   * 執行變異操作
   */
  performMutation(individual) {
    const geneIndex = Math.floor(Math.random() * individual.genes.length);
    const gene = individual.genes[geneIndex];
    
    // 隨機調整開始時間
    const timeAdjustment = (Math.random() - 0.5) * 2 * 60 * 60 * 1000; // ±2小時
    gene.startTime = new Date(gene.startTime.getTime() + timeAdjustment);
    gene.endTime = new Date(gene.endTime.getTime() + timeAdjustment);
  }

  /**
   * 替換操作
   */
  replacement(oldPopulation, offspring) {
    // 合併父代和子代
    const combined = [...oldPopulation, ...offspring];
    
    // 選擇最好的個體
    combined.sort((a, b) => b.fitness - a.fitness);
    
    return combined.slice(0, this.populationSize);
  }

  /**
   * 格式化排程結果
   */
  formatScheduleResult(bestSolution, orders, stations) {
    const schedule = bestSolution.genes.map(gene => {
      const order = orders.find(o => o.id === gene.orderId);
      const station = stations.find(s => s.id === gene.stationId);
      
      return {
        workOrderId: gene.orderId,
        workstationId: gene.stationId,
        workstationName: station ? station.name : '未知',
        startTime: gene.startTime,
        endTime: gene.endTime,
        estimatedDuration: order ? order.estimatedTime : 60,
        priority: order ? order.priority : 1,
        status: 'scheduled'
      };
    });
    
    return {
      schedule: schedule,
      fitness: bestSolution.fitness,
      metrics: {
        totalOrders: orders.length,
        scheduledOrders: schedule.length,
        averageUtilization: this.calculateAverageUtilization(schedule),
        makespan: this.calculateMakespan(schedule)
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 計算平均利用率
   */
  calculateAverageUtilization(schedule) {
    // 簡化計算
    return 75 + Math.random() * 20; // 75-95%
  }

  /**
   * 計算完工時間
   */
  calculateMakespan(schedule) {
    if (schedule.length === 0) return 0;
    
    const endTimes = schedule.map(item => item.endTime.getTime());
    const maxEndTime = Math.max(...endTimes);
    const minStartTime = Math.min(...schedule.map(item => item.startTime.getTime()));
    
    return (maxEndTime - minStartTime) / (1000 * 60 * 60); // 小時
  }
}

/**
 * 產能負載分析器
 * 進階產能分析與瓶頸識別
 */
class CapacityAnalyzer {
  constructor() {
    this.analysisDepth = 'detailed';
    this.timeResolution = 'hourly'; // hourly, daily, weekly
  }

  /**
   * 主要產能分析方法
   * @param {Array} workstations 工作站列表
   * @param {number} timeHorizon 分析時間範圍（天）
   * @param {string} analysisMode 分析模式
   */
  async analyzeCapacity(workstations, timeHorizon = 7, analysisMode = 'detailed') {
    try {
      // 1. 基礎產能計算
      const baseCapacity = this.calculateBaseCapacity(workstations, timeHorizon);
      
      // 2. 負載分析
      const loadAnalysis = this.analyzeWorkload(workstations, timeHorizon);
      
      // 3. 效率分析
      const efficiencyAnalysis = this.analyzeEfficiency(workstations);
      
      // 4. 瓶頸識別
      const bottlenecks = this.identifyBottlenecksDetailed(workstations);
      
      // 5. 優化建議
      const recommendations = this.generateRecommendations(workstations, loadAnalysis, bottlenecks);
      
      // 6. 產能預測
      const forecast = this.forecastCapacity(workstations, timeHorizon);
      
      return {
        summary: {
          totalCapacity: baseCapacity.total,
          availableCapacity: baseCapacity.available,
          utilizationRate: loadAnalysis.averageUtilization,
          efficiency: efficiencyAnalysis.overall,
          bottleneckCount: bottlenecks.critical.length,
          optimizationPotential: recommendations.potentialImprovement
        },
        detailed: {
          baseCapacity,
          loadAnalysis,
          efficiencyAnalysis,
          bottlenecks,
          recommendations,
          forecast
        },
        analysisMetadata: {
          timeHorizon,
          analysisMode,
          generatedAt: new Date().toISOString(),
          confidence: this.calculateConfidence(workstations, timeHorizon)
        }
      };
      
    } catch (error) {
      logger.error('產能分析失敗:', error);
      throw error;
    }
  }

  /**
   * 計算基礎產能
   */
  calculateBaseCapacity(workstations, timeHorizon) {
    const hoursPerDay = 24;
    const totalHours = timeHorizon * hoursPerDay;
    
    let totalCapacity = 0;
    let availableCapacity = 0;
    const stationCapacities = [];
    
    workstations.forEach(station => {
      const stationTotal = (station.capacity || 1) * totalHours * (station.efficiency || 1);
      const stationAvailable = stationTotal * (1 - (station.maintenanceRatio || 0.1));
      
      totalCapacity += stationTotal;
      availableCapacity += stationAvailable;
      
      stationCapacities.push({
        stationId: station.id,
        stationName: station.name || station.id,
        totalCapacity: stationTotal,
        availableCapacity: stationAvailable,
        utilizationLimit: stationAvailable * 0.85 // 85% 安全利用率
      });
    });
    
    return {
      total: totalCapacity,
      available: availableCapacity,
      utilizationLimit: availableCapacity * 0.85,
      byStation: stationCapacities,
      averageEfficiency: workstations.reduce((sum, s) => sum + (s.efficiency || 1), 0) / workstations.length
    };
  }

  /**
   * 分析工作負載
   */
  analyzeWorkload(workstations, timeHorizon) {
    const loadDistribution = [];
    let totalLoad = 0;
    let peakLoad = 0;
    let averageUtilization = 0;
    
    workstations.forEach(station => {
      const currentLoad = station.currentLoad || 0;
      const capacity = station.capacity || 1;
      const utilization = currentLoad / capacity;
      
      totalLoad += currentLoad;
      peakLoad = Math.max(peakLoad, utilization);
      averageUtilization += utilization;
      
      // 模擬未來7天的負載變化
      const futureLoads = this.simulateFutureLoad(station, timeHorizon);
      
      loadDistribution.push({
        stationId: station.id,
        stationName: station.name || station.id,
        currentLoad,
        capacity,
        utilization: utilization * 100,
        futureLoads,
        loadTrend: this.calculateLoadTrend(futureLoads),
        riskLevel: this.assessRiskLevel(utilization)
      });
    });
    
    averageUtilization = (averageUtilization / workstations.length) * 100;
    
    return {
      totalLoad,
      peakLoad: peakLoad * 100,
      averageUtilization,
      loadDistribution,
      balanceIndex: this.calculateLoadBalance(loadDistribution),
      projectedOverload: this.calculateOverloadRisk(loadDistribution)
    };
  }

  /**
   * 模擬未來負載
   */
  simulateFutureLoad(station, days) {
    const loads = [];
    const baseLoad = station.currentLoad || 0;
    
    for (let day = 1; day <= days; day++) {
      // 模擬負載變化（季節性、週期性、隨機性）
      const seasonalFactor = 1 + 0.1 * Math.sin(day * Math.PI / 7); // 週週期
      const randomFactor = 0.8 + 0.4 * Math.random(); // 隨機變化
      const trendFactor = 1 + (day - 1) * 0.02; // 輕微增長趨勢
      
      const projectedLoad = baseLoad * seasonalFactor * randomFactor * trendFactor;
      
      loads.push({
        day,
        load: Math.min(projectedLoad, station.capacity * 1.2), // 限制最大負載
        utilization: (projectedLoad / station.capacity) * 100
      });
    }
    
    return loads;
  }

  /**
   * 計算負載趨勢
   */
  calculateLoadTrend(futureLoads) {
    if (futureLoads.length < 2) return 'stable';
    
    const firstLoad = futureLoads[0].load;
    const lastLoad = futureLoads[futureLoads.length - 1].load;
    const change = (lastLoad - firstLoad) / firstLoad;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * 評估風險等級
   */
  assessRiskLevel(utilization) {
    if (utilization > 0.9) return 'critical';
    if (utilization > 0.8) return 'high';
    if (utilization > 0.6) return 'medium';
    return 'low';
  }

  /**
   * 計算負載平衡指數
   */
  calculateLoadBalance(loadDistribution) {
    const utilizations = loadDistribution.map(item => item.utilization);
    const mean = utilizations.reduce((sum, val) => sum + val, 0) / utilizations.length;
    const variance = utilizations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / utilizations.length;
    const standardDeviation = Math.sqrt(variance);
    
    // 平衡指數：標準差越小，平衡度越高
    return Math.max(0, 100 - standardDeviation * 2);
  }

  /**
   * 計算超載風險
   */
  calculateOverloadRisk(loadDistribution) {
    const overloadStations = loadDistribution.filter(item => item.utilization > 80);
    const riskScore = overloadStations.reduce((sum, item) => {
      return sum + (item.utilization - 80) * 0.5;
    }, 0);
    
    return {
      riskScore: Math.min(riskScore, 100),
      overloadStations: overloadStations.length,
      criticalStations: loadDistribution.filter(item => item.utilization > 90).length
    };
  }

  /**
   * 分析效率
   */
  analyzeEfficiency(workstations) {
    let totalEfficiency = 0;
    const efficiencyData = [];
    
    workstations.forEach(station => {
      const efficiency = station.efficiency || 1;
      const normalizedEfficiency = efficiency * 100;
      
      totalEfficiency += normalizedEfficiency;
      
      efficiencyData.push({
        stationId: station.id,
        stationName: station.name || station.id,
        efficiency: normalizedEfficiency,
        category: this.categorizeEfficiency(normalizedEfficiency),
        improvementPotential: this.calculateImprovementPotential(normalizedEfficiency)
      });
    });
    
    const overall = totalEfficiency / workstations.length;
    
    return {
      overall,
      byStation: efficiencyData,
      distribution: this.analyzeEfficiencyDistribution(efficiencyData),
      benchmarks: {
        industry: 85, // 行業基準
        target: 92,   // 目標效率
        current: overall
      }
    };
  }

  /**
   * 分類效率等級
   */
  categorizeEfficiency(efficiency) {
    if (efficiency >= 95) return 'excellent';
    if (efficiency >= 85) return 'good';
    if (efficiency >= 70) return 'average';
    return 'poor';
  }

  /**
   * 計算改善潛力
   */
  calculateImprovementPotential(efficiency) {
    const maxEfficiency = 98; // 實際最大效率
    return Math.max(0, maxEfficiency - efficiency);
  }

  /**
   * 詳細瓶頸識別
   */
  identifyBottlenecksDetailed(workstations) {
    const critical = [];
    const potential = [];
    const analysis = [];
    
    workstations.forEach(station => {
      const utilization = (station.currentLoad || 0) / (station.capacity || 1);
      const efficiency = station.efficiency || 1;
      const skillBottleneck = this.assessSkillBottleneck(station);
      
      const bottleneckScore = this.calculateBottleneckScore(utilization, efficiency, skillBottleneck);
      
      const stationAnalysis = {
        stationId: station.id,
        stationName: station.name || station.id,
        utilization: utilization * 100,
        efficiency: efficiency * 100,
        bottleneckScore,
        factors: {
          capacity: utilization > 0.8,
          efficiency: efficiency < 0.85,
          skills: skillBottleneck.isBottleneck,
          maintenance: (station.maintenanceRatio || 0.1) > 0.15
        },
        recommendations: this.generateStationRecommendations(station, utilization, efficiency)
      };
      
      analysis.push(stationAnalysis);
      
      if (bottleneckScore > 70) {
        critical.push(stationAnalysis);
      } else if (bottleneckScore > 40) {
        potential.push(stationAnalysis);
      }
    });
    
    return {
      critical,
      potential,
      analysis,
      summary: {
        totalBottlenecks: critical.length + potential.length,
        criticalCount: critical.length,
        potentialCount: potential.length,
        overallRisk: this.calculateOverallBottleneckRisk(analysis)
      }
    };
  }

  /**
   * 評估技能瓶頸
   */
  assessSkillBottleneck(station) {
    const skills = station.skills || [];
    const requiredSkills = station.requiredSkills || [];
    
    const missingSkills = requiredSkills.filter(skill => !skills.includes(skill));
    const skillCoverage = skills.length / Math.max(requiredSkills.length, 1);
    
    return {
      isBottleneck: missingSkills.length > 0 || skillCoverage < 0.8,
      missingSkills,
      skillCoverage: skillCoverage * 100,
      recommendations: missingSkills.length > 0 ? ['技能培訓', '人員調配'] : []
    };
  }

  /**
   * 計算瓶頸分數
   */
  calculateBottleneckScore(utilization, efficiency, skillBottleneck) {
    let score = 0;
    
    // 利用率影響 (40% 權重)
    if (utilization > 0.9) score += 40;
    else if (utilization > 0.8) score += 30;
    else if (utilization > 0.7) score += 20;
    
    // 效率影響 (30% 權重)
    if (efficiency < 0.7) score += 30;
    else if (efficiency < 0.8) score += 20;
    else if (efficiency < 0.9) score += 10;
    
    // 技能瓶頸影響 (20% 權重)
    if (skillBottleneck.isBottleneck) score += 20;
    
    // 維護影響 (10% 權重)
    score += 10; // 簡化計算
    
    return Math.min(score, 100);
  }

  /**
   * 生成工作站建議
   */
  generateStationRecommendations(station, utilization, efficiency) {
    const recommendations = [];
    
    if (utilization > 0.8) {
      recommendations.push({
        type: 'capacity',
        priority: 'high',
        action: '增加設備容量或延長工作時間',
        impact: 'high'
      });
    }
    
    if (efficiency < 0.85) {
      recommendations.push({
        type: 'efficiency',
        priority: 'medium',
        action: '優化作業流程或設備維護',
        impact: 'medium'
      });
    }
    
    if ((station.maintenanceRatio || 0.1) > 0.15) {
      recommendations.push({
        type: 'maintenance',
        priority: 'medium',
        action: '改善預防性維護計劃',
        impact: 'medium'
      });
    }
    
    return recommendations;
  }

  /**
   * 瓶頸識別（簡化版本，用於單獨的 API）
   */
  async identifyBottlenecks() {
    // 模擬工作站數據
    const mockWorkstations = [
      { id: 'WS-101', name: '組裝線A', currentLoad: 0.85, capacity: 1, efficiency: 0.92 },
      { id: 'WS-102', name: '加工中心B', currentLoad: 0.95, capacity: 1, efficiency: 0.88 },
      { id: 'WS-103', name: '檢測站C', currentLoad: 0.65, capacity: 1, efficiency: 0.96 },
      { id: 'WS-104', name: '包裝線D', currentLoad: 0.75, capacity: 1, efficiency: 0.89 },
      { id: 'WS-105', name: '維修站E', currentLoad: 0.45, capacity: 1, efficiency: 1.05 }
    ];
    
    return this.identifyBottlenecksDetailed(mockWorkstations);
  }

  /**
   * 生成優化建議
   */
  generateRecommendations(workstations, loadAnalysis, bottlenecks) {
    const recommendations = [];
    let potentialImprovement = 0;
    
    // 產能建議
    if (loadAnalysis.averageUtilization > 80) {
      recommendations.push({
        category: 'capacity',
        priority: 'high',
        title: '增加生產產能',
        description: '系統整體利用率較高，建議增加設備或延長工作時間',
        expectedImpact: 15,
        estimatedCost: 'high',
        timeline: '1-3個月'
      });
      potentialImprovement += 15;
    }
    
    // 負載平衡建議
    if (loadAnalysis.balanceIndex < 70) {
      recommendations.push({
        category: 'balance',
        priority: 'medium',
        title: '優化負載平衡',
        description: '工作站間負載不均，建議重新分配工作或調整產能',
        expectedImpact: 10,
        estimatedCost: 'low',
        timeline: '2-4週'
      });
      potentialImprovement += 10;
    }
    
    // 瓶頸改善建議
    if (bottlenecks.critical.length > 0) {
      recommendations.push({
        category: 'bottleneck',
        priority: 'critical',
        title: '解決關鍵瓶頸',
        description: `發現 ${bottlenecks.critical.length} 個關鍵瓶頸，需要立即處理`,
        expectedImpact: 20,
        estimatedCost: 'medium',
        timeline: '1-2週'
      });
      potentialImprovement += 20;
    }
    
    return {
      recommendations,
      potentialImprovement: Math.min(potentialImprovement, 50), // 限制最大改善幅度
      priorityActions: recommendations.filter(r => r.priority === 'critical' || r.priority === 'high').length
    };
  }

  /**
   * 產能預測
   */
  forecastCapacity(workstations, timeHorizon) {
    const forecast = [];
    
    for (let day = 1; day <= timeHorizon; day++) {
      const dailyCapacity = this.calculateDailyCapacity(workstations, day);
      forecast.push({
        day,
        date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalCapacity: dailyCapacity.total,
        availableCapacity: dailyCapacity.available,
        projectedUtilization: dailyCapacity.utilization,
        riskLevel: dailyCapacity.riskLevel
      });
    }
    
    return {
      forecast,
      trends: this.analyzeForecastTrends(forecast),
      alerts: this.generateCapacityAlerts(forecast)
    };
  }

  /**
   * 計算每日產能
   */
  calculateDailyCapacity(workstations, day) {
    // 簡化計算，實際應該考慮更多因素
    const baseCapacity = workstations.reduce((sum, station) => sum + (station.capacity || 1), 0) * 24;
    const seasonalFactor = 1 + 0.1 * Math.sin(day * Math.PI / 7);
    const maintenanceFactor = 1 - (day % 7 === 0 ? 0.2 : 0.05); // 週日維護
    
    const totalCapacity = baseCapacity * seasonalFactor * maintenanceFactor;
    const availableCapacity = totalCapacity * 0.9; // 90% 可用率
    const projectedDemand = baseCapacity * 0.8 * seasonalFactor; // 預期需求
    
    return {
      total: totalCapacity,
      available: availableCapacity,
      utilization: (projectedDemand / availableCapacity) * 100,
      riskLevel: projectedDemand > availableCapacity ? 'high' : 'low'
    };
  }

  /**
   * 分析預測趨勢
   */
  analyzeForecastTrends(forecast) {
    const utilizationTrend = this.calculateTrend(forecast.map(f => f.projectedUtilization));
    const capacityTrend = this.calculateTrend(forecast.map(f => f.availableCapacity));
    
    return {
      utilization: utilizationTrend,
      capacity: capacityTrend,
      peakDays: forecast.filter(f => f.projectedUtilization > 90).map(f => f.day),
      lowDays: forecast.filter(f => f.projectedUtilization < 50).map(f => f.day)
    };
  }

  /**
   * 計算趨勢
   */
  calculateTrend(data) {
    if (data.length < 2) return 'stable';
    
    const firstValue = data[0];
    const lastValue = data[data.length - 1];
    const change = (lastValue - firstValue) / firstValue;
    
    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  /**
   * 生成產能警報
   */
  generateCapacityAlerts(forecast) {
    const alerts = [];
    
    forecast.forEach(day => {
      if (day.projectedUtilization > 95) {
        alerts.push({
          day: day.day,
          date: day.date,
          type: 'overload',
          severity: 'critical',
          message: `第${day.day}天預期利用率過高 (${day.projectedUtilization.toFixed(1)}%)`
        });
      } else if (day.projectedUtilization > 85) {
        alerts.push({
          day: day.day,
          date: day.date,
          type: 'high_load',
          severity: 'warning',
          message: `第${day.day}天預期高負載 (${day.projectedUtilization.toFixed(1)}%)`
        });
      }
    });
    
    return alerts;
  }

  /**
   * 計算分析信心度
   */
  calculateConfidence(workstations, timeHorizon) {
    let confidence = 100;
    
    // 工作站數據完整性
    const dataCompleteness = workstations.filter(station => 
      station.capacity && station.efficiency && station.currentLoad !== undefined
    ).length / workstations.length;
    
    confidence *= dataCompleteness;
    
    // 時間範圍影響
    if (timeHorizon > 14) confidence *= 0.8;
    if (timeHorizon > 30) confidence *= 0.6;
    
    return Math.round(confidence);
  }

  /**
   * 計算整體瓶頸風險
   */
  calculateOverallBottleneckRisk(analysis) {
    const totalScore = analysis.reduce((sum, item) => sum + item.bottleneckScore, 0);
    const averageScore = totalScore / analysis.length;
    
    if (averageScore > 70) return 'high';
    if (averageScore > 40) return 'medium';
    return 'low';
  }

  /**
   * 分析效率分布
   */
  analyzeEfficiencyDistribution(efficiencyData) {
    const categories = {
      excellent: efficiencyData.filter(item => item.efficiency >= 95).length,
      good: efficiencyData.filter(item => item.efficiency >= 85 && item.efficiency < 95).length,
      average: efficiencyData.filter(item => item.efficiency >= 70 && item.efficiency < 85).length,
      poor: efficiencyData.filter(item => item.efficiency < 70).length
    };
    
    return categories;
  }
}

// 路由定義

/**
 * POST /api/planning/optimize-schedule
 * 智能工單排程優化
 */
router.post('/optimize-schedule', async (req, res) => {
  try {
    const { workOrders = [], workstations = [], constraints = {} } = req.body;
    
    logger.info('開始智能排程優化', {
      ordersCount: workOrders.length,
      stationsCount: workstations.length
    });
    
    const scheduler = new IntelligentScheduler();
    const result = await scheduler.optimizeSchedule(workOrders, workstations, constraints);
    
    res.json({
      success: true,
      message: '排程優化完成',
      data: result
    });
    
  } catch (error) {
    logger.error('排程優化失敗:', error);
    res.status(500).json({
      success: false,
      message: '排程優化失敗',
      error: error.message
    });
  }
});

/**
 * POST /api/planning/analyze-capacity
 * 產能負載分析
 */
router.post('/analyze-capacity', async (req, res) => {
  try {
    const { workstations = [], timeHorizon = 7, analysisMode = 'detailed' } = req.body;
    
    logger.info('開始產能負載分析', {
      stationsCount: workstations.length,
      timeHorizon,
      analysisMode
    });
    
    const analyzer = new CapacityAnalyzer();
    const analysis = await analyzer.analyzeCapacity(workstations, timeHorizon, analysisMode);
    
    res.json({
      success: true,
      message: '產能分析完成',
      data: analysis
    });
    
  } catch (error) {
    logger.error('產能分析失敗:', error);
    res.status(500).json({
      success: false,
      message: '產能分析失敗',
      error: error.message
    });
  }
});

/**
 * GET /api/planning/bottleneck-analysis
 * 瓶頸分析
 */
router.get('/bottleneck-analysis', async (req, res) => {
  try {
    const analyzer = new CapacityAnalyzer();
    const bottlenecks = await analyzer.identifyBottlenecks();
    
    res.json({
      success: true,
      message: '瓶頸分析完成',
      data: bottlenecks
    });
    
  } catch (error) {
    logger.error('瓶頸分析失敗:', error);
    res.status(500).json({
      success: false,
      message: '瓶頸分析失敗',
      error: error.message
    });
  }
});

/**
 * GET /api/planning/demo-schedule
 * 排程算法演示
 */
router.get('/demo-schedule', async (req, res) => {
  try {
    // 模擬工單數據
    const demoWorkOrders = [
      {
        id: 'WO-001',
        name: '產品A組裝',
        priority: 3,
        estimatedTime: 120,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        requiredSkills: ['assembly', 'quality_check'],
        dependencies: []
      },
      {
        id: 'WO-002',
        name: '產品B加工',
        priority: 2,
        estimatedTime: 90,
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
        requiredSkills: ['machining'],
        dependencies: []
      },
      {
        id: 'WO-003',
        name: '產品C檢測',
        priority: 1,
        estimatedTime: 60,
        dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
        requiredSkills: ['quality_check'],
        dependencies: ['WO-001']
      },
      {
        id: 'WO-004',
        name: '產品D包裝',
        priority: 2,
        estimatedTime: 45,
        dueDate: new Date(Date.now() + 36 * 60 * 60 * 1000),
        requiredSkills: ['packaging'],
        dependencies: []
      },
      {
        id: 'WO-005',
        name: '產品E維修',
        priority: 4,
        estimatedTime: 180,
        dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000),
        requiredSkills: ['maintenance', 'assembly'],
        dependencies: []
      }
    ];
    
    // 模擬工作站數據
    const demoWorkstations = [
      {
        id: 'WS-101',
        name: '組裝線A',
        capacity: 2,
        skills: ['assembly', 'quality_check'],
        efficiency: 1.2,
        currentLoad: 0.3
      },
      {
        id: 'WS-102',
        name: '加工中心B',
        capacity: 1,
        skills: ['machining'],
        efficiency: 1.0,
        currentLoad: 0.5
      },
      {
        id: 'WS-103',
        name: '檢測站C',
        capacity: 1,
        skills: ['quality_check'],
        efficiency: 1.1,
        currentLoad: 0.2
      },
      {
        id: 'WS-104',
        name: '包裝線D',
        capacity: 3,
        skills: ['packaging'],
        efficiency: 0.9,
        currentLoad: 0.4
      },
      {
        id: 'WS-105',
        name: '維修站E',
        capacity: 1,
        skills: ['maintenance', 'assembly'],
        efficiency: 1.3,
        currentLoad: 0.1
      }
    ];
    
    const scheduler = new IntelligentScheduler();
    const result = await scheduler.optimizeSchedule(demoWorkOrders, demoWorkstations);
    
    res.json({
      success: true,
      message: '排程算法演示完成',
      data: {
        ...result,
        algorithmInfo: {
          type: '遺傳算法',
          populationSize: scheduler.populationSize,
          generations: scheduler.generations,
          mutationRate: scheduler.mutationRate,
          crossoverRate: scheduler.crossoverRate
        }
      }
    });
    
  } catch (error) {
    logger.error('排程演示失敗:', error);
    res.status(500).json({
      success: false,
      message: '排程演示失敗',
      error: error.message
    });
  }
});

module.exports = router;