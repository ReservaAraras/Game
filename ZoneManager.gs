/**
 * @fileoverview Gerenciador de zonas de uso do solo.
 * 
 * @module ReservaAraras
 * @description Gerenciamento de zonas de uso do solo (SAF, Reserva Legal, Trilha, Jardim Terapêutico).
 * Implementa mecânicas de construção, demolição e avaliação de demanda.
 * 
 * @author Manus AI
 * @license SPDX-License-Identifier: MIT
 * @version 1.0.0
 */

// Custos de construção por tipo de zona
var ZONE_COSTS = {
  3: 500,   // SAF
  4: 100,   // RESERVA_LEGAL (apenas demarcação)
  5: 200,   // TRILHA
  6: 800,   // JARDIM_TERAPEUTICO
  8: 300,   // ESTRADA
  9: 2000,  // ECOLODGE
  10: 600,  // CISTERNA
  11: 400   // HORTA
};

// Requisitos mínimos para cada tipo de zona
var ZONE_REQUIREMENTS = {
  3: { conservation: 20 },  // SAF precisa de alguma conservação
  4: { conservation: 50 },  // Reserva Legal alta conservação
  6: { conservation: 30 },  // Jardim Terapêutico
  9: { conservation: 40 }   // Ecolodge precisa ambiente preservado
};

/**
 * Constrói uma zona específica no mapa.
 */
function buildZone(token, farmId, x, y, zoneType) {
  var player = requireSession_(token);
  
  x = Number(x);
  y = Number(y);
  zoneType = Number(zoneType);
  
  if (!isFinite(x) || !isFinite(y) || x < 0 || y < 0) {
    throw new Error('Coordenadas inválidas.');
  }
  
  if (!TILE_TYPES[Object.keys(TILE_TYPES).find(function(k) { return TILE_TYPES[k] === zoneType; })]) {
    throw new Error('Tipo de zona inválido: ' + zoneType);
  }
  
  // Carrega o estado da fazenda
  var farm = loadFarm_(token, farmId);
  if (!farm || !farm.map) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var map = farm.map;
  var size = checkZoneSize(zoneType);
  
  // Verifica se a área está livre
  if (!isAreaClear(map, x, y, size)) {
    throw new Error('Área ocupada ou fora dos limites.');
  }
  
  // Verifica requisitos
  var requirements = ZONE_REQUIREMENTS[zoneType] || {};
  if (requirements.conservation && farm.metrics.conservation < requirements.conservation) {
    throw new Error('Conservação insuficiente. Requerido: ' + requirements.conservation + '%');
  }
  
  // Verifica e deduz custo
  var cost = ZONE_COSTS[zoneType] || 0;
  if (farm.budget < cost) {
    throw new Error('Orçamento insuficiente. Custo: R$ ' + cost);
  }
  
  // Constrói a zona
  for (var dy = 0; dy < size; dy++) {
    for (var dx = 0; dx < size; dx++) {
      setTileValue(map, x + dx, y + dy, zoneType);
    }
  }
  
  // Atualiza orçamento
  farm.budget -= cost;
  
  // Registra ação
  farm.history = farm.history || [];
  farm.history.push({
    turn: farm.turn || 0,
    action: 'buildZone',
    zoneType: zoneType,
    x: x,
    y: y,
    cost: cost,
    timestamp: new Date().toISOString()
  });
  
  // Salva o estado
  saveFarm_(token, farmId, farm);
  
  logAudit_(player.id, 'zone:build', { farmId: farmId, zoneType: zoneType, x: x, y: y, cost: cost });
  
  return {
    ok: true,
    zoneType: zoneType,
    position: { x: x, y: y },
    size: size,
    cost: cost,
    remainingBudget: farm.budget
  };
}

/**
 * Remove uma zona de forma sustentável.
 */
function demolishZone(token, farmId, x, y) {
  var player = requireSession_(token);
  
  x = Number(x);
  y = Number(y);
  
  // Carrega o estado da fazenda
  var farm = loadFarm_(token, farmId);
  if (!farm || !farm.map) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var map = farm.map;
  var tile = map[y][x];
  var baseType = unwrapTile(tile);
  var size = checkZoneSize(baseType);
  
  // Não permite demolir rios ou cerrado nativo protegido
  if (baseType === TILE_TYPES.RIO) {
    throw new Error('Não é possível remover rios.');
  }
  
  if (baseType === TILE_TYPES.RESERVA_LEGAL) {
    throw new Error('Não é possível demolir Reserva Legal demarcada.');
  }
  
  // Remove a zona
  var demolishedTiles = 0;
  for (var dy = 0; dy < size; dy++) {
    for (var dx = 0; dx < size; dx++) {
      if (x + dx < map[0].length && y + dy < map.length) {
        setTileValue(map, x + dx, y + dy, TILE_TYPES.SOLO_NU);
        demolishedTiles++;
      }
    }
  }
  
  // Custo de demolição (50% do custo de construção)
  var cost = Math.floor((ZONE_COSTS[baseType] || 0) * 0.5);
  farm.budget -= cost;
  
  // Registra ação
  farm.history = farm.history || [];
  farm.history.push({
    turn: farm.turn || 0,
    action: 'demolishZone',
    zoneType: baseType,
    x: x,
    y: y,
    cost: cost,
    timestamp: new Date().toISOString()
  });
  
  saveFarm_(token, farmId, farm);
  
  logAudit_(player.id, 'zone:demolish', { farmId: farmId, zoneType: baseType, x: x, y: y });
  
  return {
    ok: true,
    demolishedType: baseType,
    tilesCleared: demolishedTiles,
    cost: cost,
    remainingBudget: farm.budget
  };
}

/**
 * Calcula a necessidade de expansão de uma zona específica.
 */
function evaluateZoneDemand(token, farmId, zoneType) {
  var player = requireSession_(token);
  
  zoneType = Number(zoneType);
  
  var farm = loadFarm_(token, farmId);
  if (!farm || !farm.map) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var map = farm.map;
  var count = 0;
  var total = 0;
  
  // Conta tiles do tipo especificado
  for (var y = 0; y < map.length; y++) {
    for (var x = 0; x < map[y].length; x++) {
      total++;
      if (unwrapTile(map[y][x]) === zoneType) {
        count++;
      }
    }
  }
  
  var coverage = total > 0 ? (count / total) * 100 : 0;
  
  // Define metas ideais
  var idealCoverage = {
    3: 20,  // SAF: 20%
    4: 30,  // RESERVA_LEGAL: 30%
    5: 5,   // TRILHA: 5%
    6: 3,   // JARDIM_TERAPEUTICO: 3%
    9: 1    // ECOLODGE: 1%
  };
  
  var target = idealCoverage[zoneType] || 10;
  var demand = target - coverage;
  
  return {
    zoneType: zoneType,
    currentCount: count,
    totalTiles: total,
    coverage: Math.round(coverage * 100) / 100,
    targetCoverage: target,
    demand: Math.round(demand * 100) / 100,
    status: demand > 0 ? 'expansion_needed' : demand < -5 ? 'overbuilt' : 'balanced'
  };
}
