/**
 * @fileoverview Gerenciador de infraestrutura ecológica.
 * 
 * @module ReservaAraras
 * @description Gerenciamento de infraestrutura ecológica e bioconstrução.
 * Implementa estradas sustentáveis, ecolodges e cisternas.
 * 
 * @author Manus AI
 * @license SPDX-License-Identifier: MIT
 * @version 1.0.0
 */

var INFRASTRUCTURE_TYPES = {
  ESTRADA: { cost: 300, type: (typeof TILE_TYPES !== 'undefined' && TILE_TYPES.ESTRADA !== undefined) ? TILE_TYPES.ESTRADA : 8, size: 1 },
  ECOLODGE: { cost: 2000, type: (typeof TILE_TYPES !== 'undefined' && TILE_TYPES.ECOLODGE !== undefined) ? TILE_TYPES.ECOLODGE : 9, size: 3 },
  CISTERNA: { cost: 600, type: (typeof TILE_TYPES !== 'undefined' && TILE_TYPES.CISTERNA !== undefined) ? TILE_TYPES.CISTERNA : 10, size: 1 }
};

/**
 * Constrói estradas vicinais com técnicas de drenagem sustentável.
 */
function placeEstrada(token, farmId, x, y) {
  var player = requireSession_(token);
  
  x = Number(x);
  y = Number(y);
  
  var farm = loadFarm_(token, farmId);
  if (!farm || !farm.map) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var map = farm.map;
  var current = unwrapTile(map[y][x]);
  
  // Verifica se o tile está livre
  if (current !== TILE_TYPES.VAZIO && current !== TILE_TYPES.SOLO_NU) {
    throw new Error('Não é possível construir estrada neste local.');
  }
  
  var cost = INFRASTRUCTURE_TYPES.ESTRADA.cost;
  if (farm.budget < cost) {
    throw new Error('Orçamento insuficiente. Custo: R$ ' + cost);
  }
  
  // Constrói a estrada
  setTileValue(map, x, y, TILE_TYPES.ESTRADA);
  farm.budget -= cost;
  
  // Registra ação
  farm.history = farm.history || [];
  farm.history.push({
    turn: farm.turn || 0,
    action: 'placeEstrada',
    x: x,
    y: y,
    cost: cost,
    timestamp: new Date().toISOString()
  });
  
  saveFarm_(token, farmId, farm);
  
  logAudit_(player.id, 'infrastructure:road', { farmId: farmId, x: x, y: y });
  
  return {
    ok: true,
    type: 'estrada',
    position: { x: x, y: y },
    cost: cost,
    remainingBudget: farm.budget,
    benefits: {
      accessibility: '+15%',
      logistics: 'Melhora transporte de produtos',
      environmental: 'Com drenagem sustentável'
    }
  };
}

/**
 * Constrói hospedagem ecológica usando materiais locais.
 */
function buildEcoLodge(token, farmId, x, y) {
  var player = requireSession_(token);
  
  x = Number(x);
  y = Number(y);
  
  var farm = loadFarm_(token, farmId);
  if (!farm || !farm.map) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var map = farm.map;
  var size = INFRASTRUCTURE_TYPES.ECOLODGE.size;
  
  // Verifica se a área está livre
  if (!isAreaClear(map, x, y, size)) {
    throw new Error('Área ocupada ou fora dos limites para Ecolodge (3x3).');
  }
  
  // Verifica conservação mínima
  if (farm.metrics.conservation < 40) {
    throw new Error('Conservação insuficiente para Ecolodge. Requerido: 40%');
  }
  
  var cost = INFRASTRUCTURE_TYPES.ECOLODGE.cost;
  if (farm.budget < cost) {
    throw new Error('Orçamento insuficiente. Custo: R$ ' + cost);
  }
  
  // Constrói o ecolodge
  for (var dy = 0; dy < size; dy++) {
    for (var dx = 0; dx < size; dx++) {
      setTileValue(map, x + dx, y + dy, TILE_TYPES.ECOLODGE);
    }
  }
  
  farm.budget -= cost;
  
  // Aumenta capacidade de turismo
  farm.tourismCapacity = (farm.tourismCapacity || 0) + 20;
  
  // Registra ação
  farm.history = farm.history || [];
  farm.history.push({
    turn: farm.turn || 0,
    action: 'buildEcoLodge',
    x: x,
    y: y,
    cost: cost,
    timestamp: new Date().toISOString()
  });
  
  saveFarm_(token, farmId, farm);
  
  logAudit_(player.id, 'infrastructure:ecolodge', { farmId: farmId, x: x, y: y });
  
  return {
    ok: true,
    type: 'ecolodge',
    position: { x: x, y: y },
    size: size,
    cost: cost,
    remainingBudget: farm.budget,
    benefits: {
      tourism: '+20 visitantes/mês',
      revenue: 'R$ 15/visita',
      materials: 'Taipa, adobe, telhado verde, energia solar',
      tourismCapacity: farm.tourismCapacity
    }
  };
}

/**
 * Constrói estrutura de captação de água pluvial.
 */
function buildCisterna(token, farmId, x, y, type) {
  var player = requireSession_(token);
  
  x = Number(x);
  y = Number(y);
  type = String(type || 'pluvial');
  
  var farm = loadFarm_(token, farmId);
  if (!farm || !farm.map) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var map = farm.map;
  var current = unwrapTile(map[y][x]);
  
  // Verifica se o tile está livre
  if (current !== TILE_TYPES.VAZIO && current !== TILE_TYPES.SOLO_NU) {
    throw new Error('Não é possível construir cisterna neste local.');
  }
  
  var cost = INFRASTRUCTURE_TYPES.CISTERNA.cost;
  if (farm.budget < cost) {
    throw new Error('Orçamento insuficiente. Custo: R$ ' + cost);
  }
  
  // Constrói a cisterna
  setTileValue(map, x, y, TILE_TYPES.CISTERNA);
  farm.budget -= cost;
  
  // Aumenta capacidade de água
  var waterCapacity = type === 'pluvial' ? 5000 : 3000; // litros
  farm.waterCapacity = (farm.waterCapacity || 0) + waterCapacity;
  
  // Registra ação
  farm.history = farm.history || [];
  farm.history.push({
    turn: farm.turn || 0,
    action: 'buildCisterna',
    type: type,
    x: x,
    y: y,
    cost: cost,
    capacity: waterCapacity,
    timestamp: new Date().toISOString()
  });
  
  saveFarm_(token, farmId, farm);
  
  logAudit_(player.id, 'infrastructure:cisterna', { farmId: farmId, type: type, x: x, y: y });
  
  return {
    ok: true,
    type: 'cisterna',
    subtype: type,
    position: { x: x, y: y },
    cost: cost,
    remainingBudget: farm.budget,
    benefits: {
      waterCapacity: waterCapacity + 'L',
      totalCapacity: farm.waterCapacity + 'L',
      irrigation: 'Suporta ' + Math.floor(waterCapacity / 100) + ' tiles irrigados',
      sustainability: 'Reduz dependência de água externa'
    }
  };
}

/**
 * Lista toda infraestrutura da fazenda.
 */
function listInfrastructure(token, farmId) {
  var player = requireSession_(token);
  
  var farm = loadFarm_(token, farmId);
  if (!farm || !farm.map) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var map = farm.map;
  var infrastructure = {
    roads: [],
    ecolodges: [],
    cisterns: [],
    summary: {
      totalRoads: 0,
      totalEcolodges: 0,
      totalCisterns: 0,
      tourismCapacity: farm.tourismCapacity || 0,
      waterCapacity: farm.waterCapacity || 0
    }
  };
  
  for (var y = 0; y < map.length; y++) {
    for (var x = 0; x < map[y].length; x++) {
      var tile = unwrapTile(map[y][x]);
      
      if (tile === TILE_TYPES.ESTRADA) {
        infrastructure.roads.push({ x: x, y: y });
        infrastructure.summary.totalRoads++;
      } else if (tile === TILE_TYPES.ECOLODGE) {
        infrastructure.ecolodges.push({ x: x, y: y });
        infrastructure.summary.totalEcolodges++;
      } else if (tile === TILE_TYPES.CISTERNA) {
        infrastructure.cisterns.push({ x: x, y: y });
        infrastructure.summary.totalCisterns++;
      }
    }
  }
  
  return infrastructure;
}
