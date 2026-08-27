/**
 * @fileoverview Gerador procedural de mapas para Reserva Araras.
 * 
 * @module ReservaAraras
 * @description Geração procedural de mapas e terrenos da reserva.
 * Utiliza noise simplificado e regras ecológicas do Cerrado.
 * 
 * @author Manus AI
 * @license SPDX-License-Identifier: MIT
 * @version 1.0.0
 */

var MAP_DEFAULT_WIDTH = 50;
var MAP_DEFAULT_HEIGHT = 50;

/**
 * Gerador de números pseudo-aleatórios com seed.
 */
function seededRandom_(seed, x, y) {
  var value = seed + x * 374761393 + y * 668265263;
  value = (value ^ (value >> 13)) * 1274126177;
  value = value ^ (value >> 16);
  return Math.abs(value % 10000) / 10000;
}

/**
 * Gera um mapa inicial com relevo do nordeste goiano.
 */
function generateTerreno(seed, width, height) {
  seed = Number(seed) || Math.floor(Math.random() * 1000000);
  width = Number(width) || MAP_DEFAULT_WIDTH;
  height = Number(height) || MAP_DEFAULT_HEIGHT;
  
  if (width < 10 || width > 200 || height < 10 || height > 200) {
    throw new Error('Dimensões do mapa devem estar entre 10x10 e 200x200.');
  }
  
  var map = [];
  
  // Inicializa com cerrado e solo nu
  for (var y = 0; y < height; y++) {
    map[y] = [];
    for (var x = 0; x < width; x++) {
      var noise = seededRandom_(seed, x, y);
      
      // 60% cerrado, 40% solo nu (antropizado)
      if (noise > 0.4) {
        map[y][x] = TILE_TYPES.CERRADO;
      } else {
        map[y][x] = TILE_TYPES.SOLO_NU;
      }
    }
  }
  
  return {
    map: map,
    width: width,
    height: height,
    seed: seed,
    metadata: {
      biome: 'Cerrado - Nordeste Goiano',
      region: 'Parque Estadual de Terra Ronca',
      generated: new Date().toISOString()
    }
  };
}

/**
 * Desenha cursos d'água como o Rio Paranã.
 */
function applyRios(terrainData, riverCount) {
  riverCount = Number(riverCount) || 2;
  var map = terrainData.map;
  var width = terrainData.width;
  var height = terrainData.height;
  var seed = terrainData.seed;
  
  for (var r = 0; r < riverCount; r++) {
    // Começa em um ponto aleatório no topo
    var startX = Math.floor(seededRandom_(seed + r, 0, 0) * width);
    var x = startX;
    var y = 0;
    
    // Serpenteia até o fundo
    while (y < height) {
      // Coloca o tile de rio
      if (x >= 0 && x < width && y >= 0 && y < height) {
        map[y][x] = TILE_TYPES.RIO;
      }
      
      // Move para baixo e desvia aleatoriamente
      y++;
      var drift = seededRandom_(seed + r, x, y);
      if (drift < 0.3 && x > 0) {
        x--;
      } else if (drift > 0.7 && x < width - 1) {
        x++;
      }
    }
  }
  
  terrainData.rivers = riverCount;
  return terrainData;
}

/**
 * Adiciona vegetação nativa do Cerrado (buritis, pequi, mata de galeria).
 */
function plantarCerrado(terrainData, density) {
  density = Number(density) || 0.15; // 15% de vegetação densa
  var map = terrainData.map;
  var width = terrainData.width;
  var height = terrainData.height;
  var seed = terrainData.seed;
  
  var planted = 0;
  
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var current = unwrapTile(map[y][x]);
      
      // Planta vegetação próximo aos rios (mata de galeria)
      var nearRiver = false;
      for (var dy = -2; dy <= 2; dy++) {
        for (var dx = -2; dx <= 2; dx++) {
          var checkY = y + dy;
          var checkX = x + dx;
          if (checkY >= 0 && checkY < height && checkX >= 0 && checkX < width) {
            if (unwrapTile(map[checkY][checkX]) === TILE_TYPES.RIO) {
              nearRiver = true;
              break;
            }
          }
        }
        if (nearRiver) break;
      }
      
      // Aumenta densidade próximo aos rios
      var targetDensity = nearRiver ? density * 2 : density;
      var noise = seededRandom_(seed + 999, x, y);
      
      if (current === TILE_TYPES.SOLO_NU && noise < targetDensity) {
        map[y][x] = TILE_TYPES.CERRADO;
        planted++;
      }
    }
  }
  
  terrainData.nativeVegetation = planted;
  return terrainData;
}

/**
 * Adiciona áreas degradadas (representando histórico de uso).
 */
function addDegradedAreas(terrainData, percentage) {
  percentage = Number(percentage) || 0.1; // 10% degradado
  var map = terrainData.map;
  var width = terrainData.width;
  var height = terrainData.height;
  var seed = terrainData.seed;
  
  var degraded = 0;
  
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var noise = seededRandom_(seed + 1234, x, y);
      
      if (noise < percentage) {
        var current = unwrapTile(map[y][x]);
        if (current === TILE_TYPES.CERRADO || current === TILE_TYPES.SOLO_NU) {
          map[y][x] = addTileFlags(map, x, y, TILE_FLAGS.DEGRADADO_BIT);
          degraded++;
        }
      }
    }
  }
  
  terrainData.degradedTiles = degraded;
  return terrainData;
}

/**
 * Gera um mapa completo com todas as características.
 */
function generateFullMap(seed, width, height, options) {
  options = options || {};
  
  var terrain = generateTerreno(seed, width, height);
  terrain = applyRios(terrain, options.riverCount || 2);
  terrain = plantarCerrado(terrain, options.vegetationDensity || 0.15);
  terrain = addDegradedAreas(terrain, options.degradedPercentage || 0.1);
  
  return terrain;
}
