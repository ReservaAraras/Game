/**
 * @fileoverview Gerenciador de tempo e turnos do jogo.
 * 
 * @module ReservaAraras
 * @description Sistema de progressão temporal e turnos.
 * Controla estações, clima e eventos temporais.
 * 
 * @author Manus AI
 * @license SPDX-License-Identifier: MIT
 * @version 1.0.0
 */

var SEASONS = ['Verão (Chuvas)', 'Outono (Transição)', 'Inverno (Seca)', 'Primavera (Floração)'];
var MONTHS_PER_SEASON = 3;
var TURNS_PER_YEAR = 12;

/**
 * Avança um turno no jogo.
 */
function advanceTurn(token, farmId) {
  var player = requireSession_(token);
  
  var farm = loadFarm_(token, farmId);
  if (!farm) {
    throw new Error('Fazenda não encontrada.');
  }
  
  farm.turn = (farm.turn || 0) + 1;
  var month = (farm.turn % TURNS_PER_YEAR) || TURNS_PER_YEAR;
  var year = Math.floor(farm.turn / TURNS_PER_YEAR) + 1;
  var season = getSeason_(month);
  
  // Aplica efeitos sazonais
  var seasonalEffects = applySeasonalEffects_(farm, season);
  
  // Calcula produção mensal
  var production = calculateMonthlyProduction_(farm, season);
  
  // Calcula custos de manutenção
  var maintenance = calculateMaintenance_(farm);
  
  // Atualiza orçamento
  farm.budget = (farm.budget || 0) + production.revenue - maintenance.total;
  
  // Registra histórico
  farm.turnHistory = farm.turnHistory || [];
  farm.turnHistory.push({
    turn: farm.turn,
    month: month,
    year: year,
    season: season,
    production: production,
    maintenance: maintenance,
    budget: farm.budget,
    timestamp: new Date().toISOString()
  });
  
  saveFarm_(token, farmId, farm);
  
  logAudit_(player.id, 'time:advance', { farmId: farmId, turn: farm.turn });
  
  return {
    ok: true,
    turn: farm.turn,
    month: month,
    year: year,
    season: season,
    seasonalEffects: seasonalEffects,
    production: production,
    maintenance: maintenance,
    budget: farm.budget,
    message: 'Turno ' + farm.turn + ' - Mês ' + month + ' (Ano ' + year + ') - ' + season
  };
}

/**
 * Obtém a estação atual baseada no mês.
 */
function getSeason_(month) {
  var seasonIndex = Math.floor((month - 1) / MONTHS_PER_SEASON);
  return SEASONS[seasonIndex % SEASONS.length];
}

/**
 * Aplica efeitos sazonais ao jogo.
 */
function applySeasonalEffects_(farm, season) {
  var effects = {
    production: 1.0,
    waterDemand: 1.0,
    conservation: 0,
    events: []
  };
  
  if (season === SEASONS[0]) { // Verão (Chuvas)
    effects.production = 1.2;
    effects.waterDemand = 0.8;
    effects.conservation = 2;
    effects.events.push('Período chuvoso favorece crescimento');
  } else if (season === SEASONS[2]) { // Inverno (Seca)
    effects.production = 0.8;
    effects.waterDemand = 1.5;
    effects.conservation = -1;
    effects.events.push('Seca aumenta necessidade de irrigação');
  } else if (season === SEASONS[3]) { // Primavera (Floração)
    effects.production = 1.1;
    effects.waterDemand = 1.0;
    effects.conservation = 3;
    effects.events.push('Floração atrai polinizadores');
  }
  
  // Aplica à conservação
  farm.metrics = farm.metrics || {};
  farm.metrics.conservation = Math.max(0, Math.min(100, 
    (farm.metrics.conservation || 0) + effects.conservation));
  
  return effects;
}

/**
 * Calcula produção mensal.
 */
function calculateMonthlyProduction_(farm, season) {
  var map = farm.map;
  var production = {
    saf: 0,
    tourism: 0,
    total: 0,
    revenue: 0
  };
  
  // Produção de SAF
  var safTiles = countTileType_(map, TILE_TYPES.SAF);
  production.saf = safTiles * 50; // R$ 50 por tile SAF
  
  // Receita de turismo
  var tourismRevenue = (farm.tourismCapacity || 0) * 15; // R$ 15 por visita
  production.tourism = tourismRevenue;
  
  production.total = production.saf + production.tourism;
  
  // Aplica multiplicador sazonal
  var seasonMultiplier = season === SEASONS[0] ? 1.2 : 
                         season === SEASONS[2] ? 0.8 : 1.0;
  
  production.revenue = Math.round(production.total * seasonMultiplier);
  
  return production;
}

/**
 * Calcula custos de manutenção mensal.
 */
function calculateMaintenance_(farm) {
  var map = farm.map;
  var maintenance = {
    infrastructure: 0,
    zones: 0,
    water: 0,
    total: 0
  };
  
  // Manutenção de infraestrutura
  var ecolodges = countTileType_(map, TILE_TYPES.ECOLODGE);
  var cisterns = countTileType_(map, TILE_TYPES.CISTERNA);
  maintenance.infrastructure = (ecolodges * 100) + (cisterns * 20);
  
  // Manutenção de zonas
  var safTiles = countTileType_(map, TILE_TYPES.SAF);
  var gardens = countTileType_(map, TILE_TYPES.JARDIM_TERAPEUTICO);
  maintenance.zones = (safTiles * 10) + (gardens * 15);
  
  // Custos de água (se sem cisternas)
  if (cisterns < 2) {
    maintenance.water = 200;
  }
  
  maintenance.total = maintenance.infrastructure + maintenance.zones + maintenance.water;
  
  return maintenance;
}

/**
 * Obtém informações do tempo atual.
 */
function getCurrentTime(token, farmId) {
  var player = requireSession_(token);
  
  var farm = loadFarm_(token, farmId);
  if (!farm) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var turn = farm.turn || 0;
  var month = (turn % TURNS_PER_YEAR) || TURNS_PER_YEAR;
  var year = Math.floor(turn / TURNS_PER_YEAR) + 1;
  var season = getSeason_(month);
  
  return {
    turn: turn,
    month: month,
    year: year,
    season: season,
    daysElapsed: turn * 30, // Aproximação: 1 turno = 1 mês = 30 dias
    history: farm.turnHistory || []
  };
}

/**
 * Obtém resumo de progressão temporal.
 */
function getTimeReport(token, farmId) {
  var player = requireSession_(token);
  
  var farm = loadFarm_(token, farmId);
  if (!farm) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var history = farm.turnHistory || [];
  
  if (history.length === 0) {
    return {
      message: 'Nenhum turno jogado ainda',
      trends: null
    };
  }
  
  // Analisa últimos 6 turnos
  var recent = history.slice(-6);
  
  var avgProduction = recent.reduce(function(sum, h) {
    return sum + (h.production.revenue || 0);
  }, 0) / recent.length;
  
  var avgMaintenance = recent.reduce(function(sum, h) {
    return sum + (h.maintenance.total || 0);
  }, 0) / recent.length;
  
  var netIncome = avgProduction - avgMaintenance;
  
  return {
    totalTurns: history.length,
    recentTrends: {
      avgProduction: Math.round(avgProduction),
      avgMaintenance: Math.round(avgMaintenance),
      netIncome: Math.round(netIncome),
      status: netIncome > 0 ? 'Lucrativo' : 'Deficitário'
    },
    seasonalAnalysis: analyzeSeasonalPerformance_(history)
  };
}

/**
 * Analisa desempenho por estação.
 */
function analyzeSeasonalPerformance_(history) {
  var bySeason = {};
  
  for (var i = 0; i < history.length; i++) {
    var entry = history[i];
    var season = entry.season;
    
    if (!bySeason[season]) {
      bySeason[season] = { count: 0, totalRevenue: 0 };
    }
    
    bySeason[season].count++;
    bySeason[season].totalRevenue += entry.production.revenue || 0;
  }
  
  var analysis = {};
  for (var season in bySeason) {
    var data = bySeason[season];
    analysis[season] = {
      avgRevenue: Math.round(data.totalRevenue / data.count),
      occurrences: data.count
    };
  }
  
  return analysis;
}
