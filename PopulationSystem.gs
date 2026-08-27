/**
 * @fileoverview Sistema de cálculo populacional e demanda de emprego.
 * 
 * @module ReservaAraras
 * @description Cálculo de crescimento da população local e densidade demográfica.
 * Simula o impacto socioeconômico das atividades da reserva.
 * 
 * @author Manus AI
 * @license SPDX-License-Identifier: MIT
 * @version 1.0.0
 */

var MUNICIPALITIES = {
  GUARANI_DE_GOIAS: {
    name: 'Guarani de Goiás',
    initialPopulation: 4500,
    growthRate: 0.012 // 1.2% ao ano
  },
  SAO_DOMINGOS: {
    name: 'São Domingos de Goiás',
    initialPopulation: 8200,
    growthRate: 0.008 // 0.8% ao ano
  }
};

/**
 * Calcula o crescimento populacional ao longo dos turnos.
 */
function calculateCommunityGrowth(token, farmId, turns) {
  var player = requireSession_(token);
  turns = Number(turns) || 1;
  
  var farm = loadFarm_(token, farmId);
  if (!farm) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var populations = {};
  
  for (var municipality in MUNICIPALITIES) {
    var data = MUNICIPALITIES[municipality];
    var basePopulation = data.initialPopulation;
    var growthRate = data.growthRate;
    
    // Crescimento exponencial composto
    var currentPopulation = Math.round(basePopulation * Math.pow(1 + growthRate, turns));
    
    // Fator de atração (ecoturismo e empregos da fazenda)
    var tourismJobs = Math.floor((farm.tourismCapacity || 0) / 10);
    var agroforestryJobs = Math.floor((countTileType_(farm.map, TILE_TYPES.SAF) || 0) / 5);
    var totalJobs = tourismJobs + agroforestryJobs;
    
    // Atração adicional de 0.5% por 10 empregos
    var attractionBonus = Math.floor(totalJobs / 10) * 0.005;
    var adjustedPopulation = Math.round(currentPopulation * (1 + attractionBonus));
    
    populations[municipality] = {
      name: data.name,
      initialPopulation: basePopulation,
      currentPopulation: adjustedPopulation,
      growth: adjustedPopulation - basePopulation,
      growthPercent: Math.round((adjustedPopulation - basePopulation) / basePopulation * 10000) / 100,
      attractionBonus: Math.round(attractionBonus * 10000) / 100
    };
  }
  
  return {
    turns: turns,
    municipalities: populations,
    totalPopulation: Object.keys(populations).reduce(function(sum, key) {
      return sum + populations[key].currentPopulation;
    }, 0)
  };
}

/**
 * Calcula a demanda de emprego gerada pelas atividades.
 */
function calculateEmploymentDemand(token, farmId) {
  var player = requireSession_(token);
  
  var farm = loadFarm_(token, farmId);
  if (!farm || !farm.map) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var map = farm.map;
  var employment = {
    tourism: 0,
    agroforestry: 0,
    infrastructure: 0,
    management: 0,
    total: 0
  };
  
  // Turismo: 1 emprego a cada 10 visitantes/mês
  employment.tourism = Math.floor((farm.tourismCapacity || 0) / 10);
  
  // Agrofloresta: 1 emprego a cada 5 tiles de SAF
  var safTiles = countTileType_(map, TILE_TYPES.SAF);
  employment.agroforestry = Math.floor(safTiles / 5);
  
  // Infraestrutura: 1 emprego para cada ecolodge
  var ecolodges = countTileType_(map, TILE_TYPES.ECOLODGE);
  employment.infrastructure = ecolodges;
  
  // Gestão: base + 1 a cada 20 empregos totais
  employment.management = 1 + Math.floor((employment.tourism + employment.agroforestry) / 20);
  
  employment.total = employment.tourism + employment.agroforestry + 
                     employment.infrastructure + employment.management;
  
  // Estimativa de salários (em R$)
  var wages = {
    tourism: employment.tourism * 1500,
    agroforestry: employment.agroforestry * 1800,
    infrastructure: employment.infrastructure * 2000,
    management: employment.management * 3000,
    total: 0
  };
  
  wages.total = wages.tourism + wages.agroforestry + wages.infrastructure + wages.management;
  
  return {
    employment: employment,
    monthlyWages: wages,
    yearlyWages: wages.total * 12,
    socialImpact: employment.total > 20 ? 'Significativo' : employment.total > 10 ? 'Moderado' : 'Inicial'
  };
}

/**
 * Agrega dados populacionais para avaliação.
 */
function updateCensusData(token, farmId) {
  var player = requireSession_(token);
  
  var farm = loadFarm_(token, farmId);
  if (!farm) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var currentTurn = farm.turn || 0;
  var population = calculateCommunityGrowth(token, farmId, currentTurn);
  var employment = calculateEmploymentDemand(token, farmId);
  
  var census = {
    turn: currentTurn,
    population: population,
    employment: employment,
    indicators: {
      jobsCreated: employment.employment.total,
      economicImpact: employment.yearlyWages,
      populationGrowth: population.totalPopulation,
      sustainability: calculateSustainabilityScore_(farm)
    },
    timestamp: new Date().toISOString()
  };
  
  // Armazena no histórico
  farm.censusHistory = farm.censusHistory || [];
  farm.censusHistory.push(census);
  
  saveFarm_(token, farmId, farm);
  
  return census;
}

/**
 * Conta tiles de um tipo específico.
 */
function countTileType_(map, tileType) {
  var count = 0;
  for (var y = 0; y < map.length; y++) {
    for (var x = 0; x < map[y].length; x++) {
      if (unwrapTile(map[y][x]) === tileType) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Calcula score de sustentabilidade.
 */
function calculateSustainabilityScore_(farm) {
  var metrics = farm.metrics || {};
  var conservation = metrics.conservation || 0;
  var production = metrics.production || 0;
  
  // Balanceamento: 60% conservação, 40% produção sustentável
  var score = (conservation * 0.6) + (Math.min(production, 100) * 0.4);
  
  return Math.round(score * 100) / 100;
}

/**
 * Obtém relatório demográfico completo.
 */
function getDemographicReport(token, farmId) {
  var player = requireSession_(token);
  
  var farm = loadFarm_(token, farmId);
  if (!farm) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var currentTurn = farm.turn || 0;
  
  return {
    population: calculateCommunityGrowth(token, farmId, currentTurn),
    employment: calculateEmploymentDemand(token, farmId),
    history: farm.censusHistory || [],
    trends: analyzeTrends_(farm.censusHistory || [])
  };
}

/**
 * Analisa tendências ao longo do tempo.
 */
function analyzeTrends_(history) {
  if (history.length < 2) {
    return { status: 'Dados insuficientes', message: 'Aguarde mais turnos.' };
  }
  
  var recent = history.slice(-3);
  var jobs = recent.map(function(c) { return c.employment.employment.total; });
  var avgGrowth = (jobs[jobs.length - 1] - jobs[0]) / jobs.length;
  
  return {
    jobGrowth: avgGrowth > 0 ? 'Crescente' : avgGrowth < 0 ? 'Decrescente' : 'Estável',
    trend: avgGrowth,
    message: avgGrowth > 2 ? 'Forte geração de emprego' : avgGrowth > 0 ? 'Crescimento moderado' : 'Estagnação'
  };
}
