/**
 * FUCO Production System - 生產效率統計 API
 * 企業級生產效率分析與統計功能
 */

const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/auth');

// ========================================
// 模擬資料與工具函數
// ========================================

/**
 * 生成模擬的生產效率數據
 * @param {Date} date 目標日期
 * @returns {Object} 生產效率數據
 */
function generateMockEfficiencyData(date) {
  const workstations = ['A', 'B', 'C', 'D', 'E'];
  const shifts = ['早班', '中班', '夜班'];
  
  // 基於日期生成穩定的隨機數
  const dateStr = date.toISOString().split('T')[0];
  const seed = dateStr.split('-').reduce((acc, val) => acc + parseInt(val), 0);
  
  const data = {
    date: dateStr,
    overall: {
      totalProduction: Math.floor(800 + (seed % 400)), // 800-1200
      targetProduction: 1000,
      efficiency: 0,
      qualityRate: Math.floor(95 + (seed % 5)), // 95-99%
      downtime: Math.floor(10 + (seed % 30)), // 10-40分鐘
      oee: 0 // Overall Equipment Effectiveness
    },
    workstations: [],
    shifts: [],
    trends: {
      hourlyProduction: [],
      efficiencyTrend: [],
      qualityTrend: []
    }
  };
  
  // 計算整體效率
  data.overall.efficiency = Math.round((data.overall.totalProduction / data.overall.targetProduction) * 100);
  data.overall.oee = Math.round(data.overall.efficiency * (data.overall.qualityRate / 100) * 0.85); // 假設可用率85%
  
  // 工作站數據
  workstations.forEach((station, index) => {
    const stationSeed = seed + index * 17;
    const production = Math.floor(150 + (stationSeed % 100));
    const target = 200;
    
    data.workstations.push({
      station,
      production,
      target,
      efficiency: Math.round((production / target) * 100),
      qualityRate: Math.floor(94 + (stationSeed % 6)),
      downtime: Math.floor(2 + (stationSeed % 8)),
      operator: `OP${String(index + 1).padStart(3, '0')}`,
      status: production >= target * 0.9 ? 'good' : production >= target * 0.7 ? 'warning' : 'critical'
    });
  });
  
  // 班次數據
  shifts.forEach((shift, index) => {
    const shiftSeed = seed + index * 23;
    const production = Math.floor(250 + (shiftSeed % 150));
    const target = 330;
    
    data.shifts.push({
      shift,
      production,
      target,
      efficiency: Math.round((production / target) * 100),
      qualityRate: Math.floor(93 + (shiftSeed % 7)),
      downtime: Math.floor(5 + (shiftSeed % 15)),
      startTime: ['06:00', '14:00', '22:00'][index],
      endTime: ['14:00', '22:00', '06:00'][index]
    });
  });
  
  // 每小時趨勢（24小時）
  for (let hour = 0; hour < 24; hour++) {
    const hourSeed = seed + hour * 7;
    data.trends.hourlyProduction.push({
      hour: String(hour).padStart(2, '0') + ':00',
      production: Math.floor(30 + (hourSeed % 20)),
      efficiency: Math.floor(80 + (hourSeed % 20))
    });
  }
  
  // 效率趨勢（過去7天）
  for (let i = 6; i >= 0; i--) {
    const trendDate = new Date(date);
    trendDate.setDate(trendDate.getDate() - i);
    const trendSeed = trendDate.getTime() % 1000;
    
    data.trends.efficiencyTrend.push({
      date: trendDate.toISOString().split('T')[0],
      efficiency: Math.floor(85 + (trendSeed % 15)),
      production: Math.floor(800 + (trendSeed % 300))
    });
  }
  
  // 品質趨勢（過去7天）
  for (let i = 6; i >= 0; i--) {
    const trendDate = new Date(date);
    trendDate.setDate(trendDate.getDate() - i);
    const trendSeed = trendDate.getTime() % 1000;
    
    data.trends.qualityTrend.push({
      date: trendDate.toISOString().split('T')[0],
      qualityRate: Math.floor(94 + (trendSeed % 6)),
      defectCount: Math.floor(5 + (trendSeed % 15))
    });
  }
  
  return data;
}

/**
 * 生成週生產效率統計
 * @param {Date} startDate 週開始日期
 * @returns {Object} 週統計數據
 */
function generateWeeklyEfficiencyData(startDate) {
  const weekData = {
    startDate: startDate.toISOString().split('T')[0],
    endDate: new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    summary: {
      totalProduction: 0,
      targetProduction: 7000,
      averageEfficiency: 0,
      averageQualityRate: 0,
      totalDowntime: 0,
      averageOEE: 0
    },
    dailyData: [],
    workstationSummary: [],
    shiftSummary: [],
    trends: {
      dailyEfficiency: [],
      dailyQuality: [],
      weeklyComparison: []
    }
  };
  
  const workstations = ['A', 'B', 'C', 'D', 'E'];
  const shifts = ['早班', '中班', '夜班'];
  
  // 生成7天的數據
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    const dailyData = generateMockEfficiencyData(currentDate);
    weekData.dailyData.push({
      date: dailyData.date,
      dayOfWeek: ['日', '一', '二', '三', '四', '五', '六'][currentDate.getDay()],
      production: dailyData.overall.totalProduction,
      efficiency: dailyData.overall.efficiency,
      qualityRate: dailyData.overall.qualityRate,
      downtime: dailyData.overall.downtime,
      oee: dailyData.overall.oee
    });
    
    // 累加統計
    weekData.summary.totalProduction += dailyData.overall.totalProduction;
    weekData.summary.averageEfficiency += dailyData.overall.efficiency;
    weekData.summary.averageQualityRate += dailyData.overall.qualityRate;
    weekData.summary.totalDowntime += dailyData.overall.downtime;
    weekData.summary.averageOEE += dailyData.overall.oee;
  }
  
  // 計算平均值
  weekData.summary.averageEfficiency = Math.round(weekData.summary.averageEfficiency / 7);
  weekData.summary.averageQualityRate = Math.round(weekData.summary.averageQualityRate / 7);
  weekData.summary.averageOEE = Math.round(weekData.summary.averageOEE / 7);
  
  // 工作站週總結
  workstations.forEach((station, index) => {
    const stationSeed = startDate.getTime() % 1000 + index * 17;
    const weeklyProduction = Math.floor(1000 + (stationSeed % 300));
    const weeklyTarget = 1400;
    
    weekData.workstationSummary.push({
      station,
      weeklyProduction,
      weeklyTarget,
      efficiency: Math.round((weeklyProduction / weeklyTarget) * 100),
      averageQualityRate: Math.floor(94 + (stationSeed % 6)),
      totalDowntime: Math.floor(15 + (stationSeed % 25)),
      bestDay: weekData.dailyData[Math.floor(stationSeed % 7)].date,
      worstDay: weekData.dailyData[Math.floor((stationSeed + 3) % 7)].date
    });
  });
  
  // 班次週總結
  shifts.forEach((shift, index) => {
    const shiftSeed = startDate.getTime() % 1000 + index * 23;
    const weeklyProduction = Math.floor(1800 + (shiftSeed % 400));
    const weeklyTarget = 2310;
    
    weekData.shiftSummary.push({
      shift,
      weeklyProduction,
      weeklyTarget,
      efficiency: Math.round((weeklyProduction / weeklyTarget) * 100),
      averageQualityRate: Math.floor(93 + (shiftSeed % 7)),
      totalDowntime: Math.floor(25 + (shiftSeed % 35))
    });
  });
  
  // 趨勢數據
  weekData.trends.dailyEfficiency = weekData.dailyData.map(day => ({
    date: day.date,
    efficiency: day.efficiency
  }));
  
  weekData.trends.dailyQuality = weekData.dailyData.map(day => ({
    date: day.date,
    qualityRate: day.qualityRate
  }));
  
  // 與前週比較 (模擬數據，避免遞歸調用)
  const prevWeekSeed = (startDate.getTime() - 7 * 24 * 60 * 60 * 1000) % 1000;
  const prevWeekProduction = Math.floor(5500 + (prevWeekSeed % 1000));
  const prevWeekEfficiency = Math.floor(82 + (prevWeekSeed % 15));
  const prevWeekQuality = Math.floor(93 + (prevWeekSeed % 6));
  
  weekData.trends.weeklyComparison = {
    currentWeek: {
      production: weekData.summary.totalProduction,
      efficiency: weekData.summary.averageEfficiency,
      qualityRate: weekData.summary.averageQualityRate
    },
    previousWeek: {
      production: prevWeekProduction,
      efficiency: prevWeekEfficiency,
      qualityRate: prevWeekQuality
    },
    changes: {
      production: weekData.summary.totalProduction - prevWeekProduction,
      efficiency: weekData.summary.averageEfficiency - prevWeekEfficiency,
      qualityRate: weekData.summary.averageQualityRate - prevWeekQuality
    }
  };
  
  return weekData;
}

/**
 * 驗證日期參數
 * @param {string} dateStr 日期字符串
 * @returns {Date|null} 驗證後的日期對象
 */
function validateDate(dateStr) {
  if (!dateStr) return null;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return null;
  }
  
  // 檢查日期是否在合理範圍內（過去1年到未來1個月）
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  
  if (date < oneYearAgo || date > oneMonthLater) {
    return null;
  }
  
  return date;
}

/**
 * 獲取週開始日期（週一）
 * @param {Date} date 參考日期
 * @returns {Date} 週開始日期
 */
function getWeekStart(date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // 週一為一週開始
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

// ========================================
// API 路由
// ========================================

/**
 * GET /api/efficiency/daily
 * 獲取每日生產效率統計
 */
router.get('/daily', requirePermission(['reports:read', 'efficiency:read']), async (req, res) => {
  try {
    const { date, workstation, shift } = req.query;
    
    // 驗證並解析日期參數
    let targetDate = new Date();
    if (date) {
      const parsedDate = validateDate(date);
      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          message: '無效的日期格式或日期超出允許範圍',
          code: 'INVALID_DATE',
          validFormat: 'YYYY-MM-DD',
          allowedRange: '過去1年到未來1個月'
        });
      }
      targetDate = parsedDate;
    }
    
    // 模擬資料庫連接點 - 實際實施時替換為真實資料庫查詢
    // const dbConnection = await getDBConnection();
    // const efficiencyData = await dbConnection.query('SELECT * FROM daily_efficiency WHERE date = ?', [targetDate]);
    
    // 生成模擬數據
    let efficiencyData = generateMockEfficiencyData(targetDate);
    
    // 根據查詢參數過濾數據
    if (workstation) {
      efficiencyData.workstations = efficiencyData.workstations.filter(
        ws => ws.station.toLowerCase() === workstation.toLowerCase()
      );
      if (efficiencyData.workstations.length === 0) {
        return res.status(404).json({
          success: false,
          message: `找不到工作站 ${workstation} 的數據`,
          code: 'WORKSTATION_NOT_FOUND'
        });
      }
    }
    
    if (shift) {
      efficiencyData.shifts = efficiencyData.shifts.filter(
        s => s.shift === shift
      );
      if (efficiencyData.shifts.length === 0) {
        return res.status(404).json({
          success: false,
          message: `找不到班次 ${shift} 的數據`,
          code: 'SHIFT_NOT_FOUND'
        });
      }
    }
    
    // 計算執行時間（用於性能監控）
    const executionTime = Date.now() - req.startTime || 0;
    
    res.json({
      success: true,
      message: '每日生產效率統計獲取成功',
      data: efficiencyData,
      metadata: {
        requestDate: targetDate.toISOString().split('T')[0],
        filters: {
          workstation: workstation || null,
          shift: shift || null
        },
        dataSource: 'mock', // 實際實施時改為 'database'
        executionTime: `${executionTime}ms`,
        user: req.user.name,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('每日效率統計 API 錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取每日生產效率統計時發生錯誤',
      code: 'DAILY_EFFICIENCY_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
});

/**
 * GET /api/efficiency/weekly
 * 獲取週生產效率統計
 */
router.get('/weekly', requirePermission(['reports:read', 'efficiency:read']), async (req, res) => {
  try {
    const { date, workstation, format } = req.query;
    
    // 驗證並解析日期參數
    let targetDate = new Date();
    if (date) {
      const parsedDate = validateDate(date);
      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          message: '無效的日期格式或日期超出允許範圍',
          code: 'INVALID_DATE',
          validFormat: 'YYYY-MM-DD',
          allowedRange: '過去1年到未來1個月'
        });
      }
      targetDate = parsedDate;
    }
    
    // 獲取週開始日期
    const weekStart = getWeekStart(targetDate);
    
    // 模擬資料庫連接點 - 實際實施時替換為真實資料庫查詢
    // const dbConnection = await getDBConnection();
    // const weeklyData = await dbConnection.query('SELECT * FROM weekly_efficiency WHERE week_start = ?', [weekStart]);
    
    // 生成模擬數據
    let weeklyData = generateWeeklyEfficiencyData(weekStart);
    
    // 根據查詢參數過濾數據
    if (workstation) {
      weeklyData.workstationSummary = weeklyData.workstationSummary.filter(
        ws => ws.station.toLowerCase() === workstation.toLowerCase()
      );
      if (weeklyData.workstationSummary.length === 0) {
        return res.status(404).json({
          success: false,
          message: `找不到工作站 ${workstation} 的週統計數據`,
          code: 'WORKSTATION_NOT_FOUND'
        });
      }
    }
    
    // 根據格式參數返回不同詳細程度的數據
    if (format === 'summary') {
      weeklyData = {
        startDate: weeklyData.startDate,
        endDate: weeklyData.endDate,
        summary: weeklyData.summary,
        trends: {
          weeklyComparison: weeklyData.trends.weeklyComparison
        }
      };
    }
    
    // 計算執行時間
    const executionTime = Date.now() - req.startTime || 0;
    
    res.json({
      success: true,
      message: '週生產效率統計獲取成功',
      data: weeklyData,
      metadata: {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weeklyData.endDate,
        filters: {
          workstation: workstation || null,
          format: format || 'full'
        },
        dataSource: 'mock', // 實際實施時改為 'database'
        executionTime: `${executionTime}ms`,
        user: req.user.name,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('週效率統計 API 錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取週生產效率統計時發生錯誤',
      code: 'WEEKLY_EFFICIENCY_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
});

/**
 * GET /api/efficiency/trends
 * 獲取效率趨勢分析（額外功能）
 */
router.get('/trends', requirePermission(['reports:read', 'efficiency:read']), async (req, res) => {
  try {
    const { period = '7d', metric = 'efficiency' } = req.query;
    
    // 驗證參數
    const validPeriods = ['7d', '30d', '90d'];
    const validMetrics = ['efficiency', 'quality', 'oee', 'production'];
    
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: '無效的時間範圍參數',
        code: 'INVALID_PERIOD',
        validValues: validPeriods
      });
    }
    
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({
        success: false,
        message: '無效的指標參數',
        code: 'INVALID_METRIC',
        validValues: validMetrics
      });
    }
    
    // 模擬趨勢數據生成
    const days = parseInt(period);
    const trendsData = {
      period,
      metric,
      data: [],
      statistics: {
        average: 0,
        max: 0,
        min: 100,
        trend: 'stable' // 'increasing', 'decreasing', 'stable'
      }
    };
    
    const now = new Date();
    let total = 0;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const seed = date.getTime() % 1000;
      let value;
      
      switch (metric) {
        case 'efficiency':
          value = Math.floor(85 + (seed % 15));
          break;
        case 'quality':
          value = Math.floor(94 + (seed % 6));
          break;
        case 'oee':
          value = Math.floor(75 + (seed % 20));
          break;
        case 'production':
          value = Math.floor(800 + (seed % 400));
          break;
      }
      
      trendsData.data.push({
        date: date.toISOString().split('T')[0],
        value
      });
      
      total += value;
      trendsData.statistics.max = Math.max(trendsData.statistics.max, value);
      trendsData.statistics.min = Math.min(trendsData.statistics.min, value);
    }
    
    trendsData.statistics.average = Math.round(total / days);
    
    // 簡單趨勢分析
    const firstHalf = trendsData.data.slice(0, Math.floor(days / 2));
    const secondHalf = trendsData.data.slice(Math.floor(days / 2));
    
    const firstAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.05) {
      trendsData.statistics.trend = 'increasing';
    } else if (secondAvg < firstAvg * 0.95) {
      trendsData.statistics.trend = 'decreasing';
    }
    
    res.json({
      success: true,
      message: '效率趨勢分析獲取成功',
      data: trendsData,
      metadata: {
        requestedPeriod: period,
        requestedMetric: metric,
        dataPoints: days,
        user: req.user.name,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('趨勢分析 API 錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取效率趨勢分析時發生錯誤',
      code: 'TRENDS_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
});

// 錯誤處理中間件
router.use((error, req, res, next) => {
  console.error('Efficiency API 錯誤:', error);
  
  res.status(500).json({
    success: false,
    message: '生產效率 API 內部錯誤',
    code: 'EFFICIENCY_API_ERROR',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

module.exports = router;