/**
 * @fileoverview Sistema de impacto ambiental e degradação.
 * 
 * @module ReservaAraras
 * @description Simulação de impacto ambiental, erosão e desmatamento.
 * Monitora e propaga degradação ambiental no território.
 * 
 * @author Manus AI
 * @license SPDX-License-Identifier: MIT
 * @version 1.0.0
 */

var DEGRADATION_SOURCES = {
  DESMATAMENTO_ILEGAL: { impact: 5, spreadRate: 0.3 },
  QUEIMADA: { impact: 4, spreadRate: 0.5 },
  MINERACAO: { impact: 6, spreadRate: 0.2 },
  POLUICAO_AGUA: { impact: 3, spreadRate: 0.4 },
  SOLO_EXPOSTO: { impact: 2, spreadRate: 0.25 }
};

/**
 * Varre o mapa identificando fontes de degradação.
 */
function scanForImpacto(token, farmId) {
  var player = requireSession_(token);
  
  var farm = loadFarm_(token, farmId);
  if (!farm || !farm.map) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var map = farm.map;
  var impacts = [];
  var totalImpact = 0;
  
  for (var y = 0; y < map.length; y++) {
    for (var x = 0; x < map[y].length; x++) {
      var tile = map[y][x];
      var baseType = unwrapTile(tile);
      var isDegraded = hasTileFlag(tile, TILE_FLAGS.DEGRADADO_BIT);
      
      if (isDegraded) {
        var impactValue = 0;
        var source = null;
        
        // Identifica tipo de degradação
        if (baseType === TILE_TYPES.SOLO_NU) {
          source = 'SOLO_EXPOSTO';
          impactValue = DEGRADATION_SOURCES.SOLO_EXPOSTO.impact;
        } else if (baseType === TILE_TYPES.CERRADO) {
          source = 'DESMATAMENTO_ILEGAL';
          impactValue = DEGRADATION_SOURCES.DESMATAMENTO_ILEGAL.impact;
        }
        
        if (source) {
          impacts.push({
            x: x,
            y: y,
            source: source,
            impact: impactValue,
            tileType: baseType
          });
          totalImpact += impactValue;
        }
      }
      
      // Solo nu sem cobertura é fonte de erosão
      if (baseType === TILE_TYPES.SOLO_NU && !isDegraded) {
        impacts.push({
          x: x,
          y: y,
          source: 'SOLO_EXPOSTO',
          impact: 1,
          tileType: baseType,
          severity: 'low'
        });
        totalImpact += 1;
      }
    }
  }
  
  return {
    impacts: impacts,
    totalImpact: totalImpact,
    degradedTiles: impacts.filter(function(i) { return i.impact > 1; }).length,
    averageImpact: impacts.length > 0 ? Math.round(totalImpact / impacts.length * 100) / 100 : 0,
    severity: totalImpact > 100 ? 'critical' : totalImpact > 50 ? 'high' : totalImpact > 20 ? 'medium' : 'low'
  };
}

/**
 * Propaga o impacto para tiles adjacentes.
 */
function spreadDegradacao(token, farmId) {
  var player = requireSession_(token);
  
  var farm = loadFarm_(token, farmId);
  if (!farm || !farm.map) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var map = farm.map;
  var height = map.length;
  var width = map[0].length;
  var spreadCount = 0;
  var newDegradations = [];
  
  // Identifica tiles degradados
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var tile = map[y][x];
      
      if (hasTileFlag(tile, TILE_FLAGS.DEGRADADO_BIT)) {
        // Propaga para adjacentes
        var directions = [[-1,0], [1,0], [0,-1], [0,1]];
        
        for (var d = 0; d < directions.length; d++) {
          var dir = directions[d];
          var newX = x + dir[0];
          var newY = y + dir[1];
          
          if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
            var adjacentTile = map[newY][newX];
            var adjacentBase = unwrapTile(adjacentTile);
            
            // Chance de propagação
            if (!hasTileFlag(adjacentTile, TILE_FLAGS.DEGRADADO_BIT) &&
                !hasTileFlag(adjacentTile, TILE_FLAGS.PROTEGIDO_BIT) &&
                Math.random() < 0.2) { // 20% chance
              
              if (adjacentBase === TILE_TYPES.CERRADO || 
                  adjacentBase === TILE_TYPES.SOLO_NU ||
                  adjacentBase === TILE_TYPES.SAF) {
                
                addTileFlags(map, newX, newY, TILE_FLAGS.DEGRADADO_BIT);
                spreadCount++;
                newDegradations.push({ x: newX, y: newY, from: { x: x, y: y } });
              }
            }
          }
        }
      }
    }
  }
  
  // Atualiza métricas
  farm.metrics = farm.metrics || {};
  farm.metrics.conservation = Math.max(0, (farm.metrics.conservation || 100) - spreadCount * 0.5);
  
  saveFarm_(token, farmId, farm);
  
  logAudit_(player.id, 'pollution:spread', { farmId: farmId, spreadCount: spreadCount });
  
  return {
    ok: true,
    spreadCount: spreadCount,
    newDegradations: newDegradations,
    conservationLoss: spreadCount * 0.5,
    message: spreadCount > 0 ? 'Degradação se espalhou para ' + spreadCount + ' tiles' : 'Sem propagação'
  };
}

/**
 * Determina o impacto na preservação do Parque de Terra Ronca.
 */
function evaluateSustentabilidade(token, farmId) {
  var player = requireSession_(token);
  
  var farm = loadFarm_(token, farmId);
  if (!farm || !farm.map) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var map = farm.map;
  var metrics = {
    totalTiles: 0,
    preservedTiles: 0,
    degradedTiles: 0,
    protectedTiles: 0,
    nativeVegetation: 0,
    waterQuality: 100
  };
  
  for (var y = 0; y < map.length; y++) {
    for (var x = 0; x < map[y].length; x++) {
      metrics.totalTiles++;
      var tile = map[y][x];
      var baseType = unwrapTile(tile);
      
      if (hasTileFlag(tile, TILE_FLAGS.DEGRADADO_BIT)) {
        metrics.degradedTiles++;
      }
      
      if (hasTileFlag(tile, TILE_FLAGS.PROTEGIDO_BIT)) {
        metrics.protectedTiles++;
      }
      
      if (baseType === TILE_TYPES.CERRADO || baseType === TILE_TYPES.RESERVA_LEGAL) {
        metrics.nativeVegetation++;
        if (!hasTileFlag(tile, TILE_FLAGS.DEGRADADO_BIT)) {
          metrics.preservedTiles++;
        }
      }
    }
  }
  
  // Calcula qualidade da água baseado em degradação próxima a rios
  var waterDegradation = 0;
  for (var y = 0; y < map.length; y++) {
    for (var x = 0; x < map[y].length; x++) {
      var tile = map[y][x];
      if (unwrapTile(tile) === TILE_TYPES.RIO) {
        // Verifica degradação ao redor
        for (var dy = -2; dy <= 2; dy++) {
          for (var dx = -2; dx <= 2; dx++) {
            var checkY = y + dy;
            var checkX = x + dx;
            if (checkY >= 0 && checkY < map.length && checkX >= 0 && checkX < map[0].length) {
              if (hasTileFlag(map[checkY][checkX], TILE_FLAGS.DEGRADADO_BIT)) {
                waterDegradation++;
              }
            }
          }
        }
      }
    }
  }
  
  metrics.waterQuality = Math.max(0, 100 - waterDegradation);
  
  // Score geral de sustentabilidade
  var conservationRate = metrics.totalTiles > 0 ? 
    (metrics.preservedTiles / metrics.totalTiles) * 100 : 0;
  
  var degradationRate = metrics.totalTiles > 0 ?
    (metrics.degradedTiles / metrics.totalTiles) * 100 : 0;
  
  var sustainabilityScore = Math.max(0, 100 - degradationRate + (conservationRate * 0.5));
  sustainabilityScore = Math.min(100, sustainabilityScore);
  
  return {
    metrics: metrics,
    rates: {
      conservation: Math.round(conservationRate * 100) / 100,
      degradation: Math.round(degradationRate * 100) / 100,
      protection: Math.round((metrics.protectedTiles / metrics.totalTiles) * 10000) / 100
    },
    sustainabilityScore: Math.round(sustainabilityScore * 100) / 100,
    waterQuality: Math.round(metrics.waterQuality * 100) / 100,
    parkImpact: sustainabilityScore > 80 ? 'Positivo' : sustainabilityScore > 60 ? 'Neutro' : 'Negativo',
    recommendations: getEnvironmentalRecommendations_(sustainabilityScore, degradationRate)
  };
}

/**
 * Retorna recomendações ambientais.
 */
function getEnvironmentalRecommendations_(score, degradation) {
  var recommendations = [];
  
  if (degradation > 20) {
    recommendations.push('Urgente: implementar plano de recuperação de áreas degradadas');
    recommendations.push('Considerar plantio de espécies nativas');
  }
  
  if (score < 60) {
    recommendations.push('Aumentar área de Reserva Legal');
    recommendations.push('Reduzir pressão sobre vegetação nativa');
  }
  
  if (degradation > 10) {
    recommendations.push('Proteger áreas vulneráveis com cercamento');
    recommendations.push('Implementar técnicas de conservação de solo');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Manter práticas atuais de conservação');
  }
  
  return recommendations;
}
