/**
 * @fileoverview Sistema de eventos adversos e desastres ambientais.
 * 
 * @module ReservaAraras
 * @description Sistema de eventos adversos reais e manejo de crises ambientais.
 * Queimadas, secas, pragas e outros eventos que testam a resiliência da fazenda.
 * 
 * @author Manus AI
 * @license SPDX-License-Identifier: MIT
 * @version 1.0.0
 */

var DISASTER_TYPES = {
  QUEIMADA: {
    id: 'queimada',
    name: 'Queimada Criminosa',
    probability: 0.15,
    severity: 'high',
    damageRadius: 3
  },
  SECA: {
    id: 'seca',
    name: 'Seca Severa',
    probability: 0.10,
    severity: 'medium',
    damageRadius: 0
  },
  PRAGA: {
    id: 'praga',
    name: 'Praga Agrícola',
    probability: 0.12,
    severity: 'medium',
    damageRadius: 2
  },
  EROSAO: {
    id: 'erosao',
    name: 'Erosão Severa',
    probability: 0.08,
    severity: 'low',
    damageRadius: 1
  }
};

/**
 * Inicia um evento destrutivo realista.
 */
function triggerDisaster(token, farmId, disasterType) {
  var player = requireSession_(token);
  
  disasterType = String(disasterType || '').toUpperCase();
  
  var disaster = DISASTER_TYPES[disasterType];
  if (!disaster) {
    throw new Error('Tipo de desastre inválido: ' + disasterType);
  }
  
  var farm = loadFarm_(token, farmId);
  if (!farm || !farm.map) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var map = farm.map;
  var width = map[0].length;
  var height = map.length;
  
  // Escolhe um ponto de origem aleatório
  var originX = Math.floor(Math.random() * width);
  var originY = Math.floor(Math.random() * height);
  
  var affectedTiles = [];
  var damage = {
    production: 0,
    conservation: 0,
    budget: 0,
    tiles: 0
  };
  
  // Aplica efeitos baseados no tipo de desastre
  if (disaster.id === 'queimada') {
    damage = applyQueimada_(map, originX, originY, disaster.damageRadius);
  } else if (disaster.id === 'seca') {
    damage = applySeca_(farm);
  } else if (disaster.id === 'praga') {
    damage = applyPraga_(map, originX, originY, disaster.damageRadius);
  } else if (disaster.id === 'erosao') {
    damage = applyErosao_(map, originX, originY, disaster.damageRadius);
  }
  
  // Registra o desastre
  farm.disasters = farm.disasters || [];
  farm.disasters.push({
    type: disaster.id,
    name: disaster.name,
    turn: farm.turn || 0,
    origin: { x: originX, y: originY },
    damage: damage,
    timestamp: new Date().toISOString()
  });
  
  // Aplica dano às métricas
  farm.metrics = farm.metrics || {};
  farm.metrics.production = Math.max(0, (farm.metrics.production || 0) - damage.production);
  farm.metrics.conservation = Math.max(0, (farm.metrics.conservation || 0) - damage.conservation);
  farm.budget = Math.max(0, farm.budget - damage.budget);
  
  saveFarm_(token, farmId, farm);
  
  logAudit_(player.id, 'disaster:triggered', { farmId: farmId, type: disaster.id, damage: damage });
  
  return {
    ok: true,
    disaster: disaster,
    origin: { x: originX, y: originY },
    damage: damage,
    message: disaster.name + ' atingiu a fazenda!',
    recommendations: getDisasterRecommendations_(disaster.id)
  };
}

/**
 * Aplica dano de queimada.
 */
function applyQueimada_(map, x, y, radius) {
  var damage = { production: 0, conservation: 0, budget: 0, tiles: 0 };
  var height = map.length;
  var width = map[0].length;
  
  for (var dy = -radius; dy <= radius; dy++) {
    for (var dx = -radius; dx <= radius; dx++) {
      var targetX = x + dx;
      var targetY = y + dy;
      
      if (targetX >= 0 && targetX < width && targetY >= 0 && targetY < height) {
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= radius) {
          var tile = unwrapTile(map[targetY][targetX]);
          
          // Queima vegetação e SAFs
          if (tile === TILE_TYPES.CERRADO || tile === TILE_TYPES.SAF || tile === TILE_TYPES.RESERVA_LEGAL) {
            addTileFlags(map, targetX, targetY, TILE_FLAGS.DEGRADADO_BIT);
            damage.tiles++;
            damage.conservation += 2;
            damage.production += tile === TILE_TYPES.SAF ? 5 : 1;
          }
        }
      }
    }
  }
  
  damage.budget = damage.tiles * 50; // Custo de recuperação
  return damage;
}

/**
 * Aplica efeitos de seca.
 */
function applySeca_(farm) {
  var damage = { production: 0, conservation: 0, budget: 0, tiles: 0 };
  
  // Reduz produção de áreas não irrigadas
  var map = farm.map;
  for (var y = 0; y < map.length; y++) {
    for (var x = 0; x < map[y].length; x++) {
      var tile = map[y][x];
      var baseType = unwrapTile(tile);
      
      if ((baseType === TILE_TYPES.SAF || baseType === TILE_TYPES.HORTA) && 
          !hasTileFlag(tile, TILE_FLAGS.IRRIGACAO_BIT)) {
        damage.production += 3;
        damage.tiles++;
      }
    }
  }
  
  damage.conservation = 5;
  return damage;
}

/**
 * Aplica praga agrícola.
 */
function applyPraga_(map, x, y, radius) {
  var damage = { production: 0, conservation: 0, budget: 0, tiles: 0 };
  var height = map.length;
  var width = map[0].length;
  
  for (var dy = -radius; dy <= radius; dy++) {
    for (var dx = -radius; dx <= radius; dx++) {
      var targetX = x + dx;
      var targetY = y + dy;
      
      if (targetX >= 0 && targetX < width && targetY >= 0 && targetY < height) {
        var tile = unwrapTile(map[targetY][targetX]);
        
        if (tile === TILE_TYPES.SAF || tile === TILE_TYPES.HORTA) {
          damage.production += 4;
          damage.tiles++;
        }
      }
    }
  }
  
  damage.budget = damage.tiles * 80; // Custo de controle biológico
  return damage;
}

/**
 * Aplica erosão.
 */
function applyErosao_(map, x, y, radius) {
  var damage = { production: 0, conservation: 0, budget: 0, tiles: 0 };
  var height = map.length;
  var width = map[0].length;
  
  for (var dy = -radius; dy <= radius; dy++) {
    for (var dx = -radius; dx <= radius; dx++) {
      var targetX = x + dx;
      var targetY = y + dy;
      
      if (targetX >= 0 && targetX < width && targetY >= 0 && targetY < height) {
        var tile = unwrapTile(map[targetY][targetX]);
        
        if (tile === TILE_TYPES.SOLO_NU || tile === TILE_TYPES.SAF) {
          addTileFlags(map, targetX, targetY, TILE_FLAGS.DEGRADADO_BIT);
          damage.conservation += 1;
          damage.tiles++;
        }
      }
    }
  }
  
  damage.budget = damage.tiles * 30;
  return damage;
}

/**
 * Retorna recomendações para lidar com o desastre.
 */
function getDisasterRecommendations_(disasterType) {
  var recommendations = {
    queimada: [
      'Formar brigada comunitária de prevenção',
      'Implementar aceiros e queima prescrita',
      'Aumentar monitoramento nas áreas de borda'
    ],
    seca: [
      'Construir cisternas de captação pluvial',
      'Implementar sistema de irrigação por gotejamento',
      'Plantar espécies resistentes à seca'
    ],
    praga: [
      'Diversificar cultivos (SAF)',
      'Introduzir controle biológico',
      'Aumentar biodiversidade local'
    ],
    erosao: [
      'Implementar técnicas de contenção',
      'Plantar cobertura vegetal',
      'Construir terraços e curvas de nível'
    ]
  };
  
  return recommendations[disasterType] || [];
}

/**
 * Lista histórico de desastres da fazenda.
 */
function getDisasterHistory(token, farmId) {
  var player = requireSession_(token);
  
  var farm = loadFarm_(token, farmId);
  if (!farm) {
    throw new Error('Fazenda não encontrada.');
  }
  
  return {
    disasters: farm.disasters || [],
    totalDisasters: (farm.disasters || []).length,
    totalDamage: (farm.disasters || []).reduce(function(sum, d) {
      return {
        production: sum.production + (d.damage.production || 0),
        conservation: sum.conservation + (d.damage.conservation || 0),
        budget: sum.budget + (d.damage.budget || 0)
      };
    }, { production: 0, conservation: 0, budget: 0 })
  };
}
