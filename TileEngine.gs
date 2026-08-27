/**
 * @fileoverview Motor de tiles do sistema Reserva Araras.
 * 
 * @module ReservaAraras
 * @description Renderização e lógica base de tiles do mapa.
 * Sistema de tiles com bitmask para flags de propriedades.
 * 
 * @author Manus AI
 * @license SPDX-License-Identifier: MIT
 * @version 1.0.0
 */

// Constantes de tipos de tiles
var TILE_TYPES = {
  VAZIO: 0,
  SOLO_NU: 1,
  CERRADO: 2,
  SAF: 3,
  RESERVA_LEGAL: 4,
  TRILHA: 5,
  JARDIM_TERAPEUTICO: 6,
  RIO: 7,
  ESTRADA: 8,
  ECOLODGE: 9,
  CISTERNA: 10,
  HORTA: 11,
  PASTO: 12
};

// Flags de propriedades dos tiles (bitmask)
var TILE_FLAGS = {
  CERCA_BIT: 1 << 16,        // 65536
  IRRIGACAO_BIT: 1 << 17,    // 131072
  DEGRADADO_BIT: 1 << 18,    // 262144
  PROTEGIDO_BIT: 1 << 19,    // 524288
  EM_RECUPERACAO_BIT: 1 << 20 // 1048576
};

// Tamanhos das estruturas
var ZONE_SIZES = {
  0: 1,  // VAZIO
  1: 1,  // SOLO_NU
  2: 1,  // CERRADO
  3: 2,  // SAF (2x2)
  4: 1,  // RESERVA_LEGAL
  5: 1,  // TRILHA
  6: 2,  // JARDIM_TERAPEUTICO (2x2)
  7: 1,  // RIO
  8: 1,  // ESTRADA
  9: 3,  // ECOLODGE (3x3)
  10: 1, // CISTERNA
  11: 2, // HORTA (2x2)
  12: 1  // PASTO
};

/**
 * Extrai o valor base do tile ignorando as flags (bitmask).
 */
function unwrapTile(tile) {
  var value = Number(tile);
  if (!isFinite(value)) return 0;
  return value & 0xFFFF; // Mascara os 16 bits inferiores
}

/**
 * Atualiza o valor base de um tile mantendo as flags existentes.
 */
function setTileValue(map, x, y, value) {
  if (!map || !Array.isArray(map) || !map[y] || !Array.isArray(map[y])) {
    throw new Error('Mapa inválido nas coordenadas (' + x + ', ' + y + ')');
  }
  
  var baseValue = Number(value);
  if (!isFinite(baseValue) || baseValue < 0 || baseValue > 0xFFFF) {
    throw new Error('Valor de tile inválido: ' + value);
  }
  
  var currentTile = Number(map[y][x]) || 0;
  var flags = currentTile & 0xFFFF0000; // Preserva as flags
  map[y][x] = flags | baseValue;
  
  return map[y][x];
}

/**
 * Adiciona flags ao tile (CERCA_BIT, IRRIGACAO_BIT, etc).
 */
function addTileFlags(map, x, y, flag) {
  if (!map || !Array.isArray(map) || !map[y] || !Array.isArray(map[y])) {
    throw new Error('Mapa inválido nas coordenadas (' + x + ', ' + y + ')');
  }
  
  var currentTile = Number(map[y][x]) || 0;
  map[y][x] = currentTile | flag;
  
  return map[y][x];
}

/**
 * Remove flags do tile.
 */
function removeTileFlags(map, x, y, flag) {
  if (!map || !Array.isArray(map) || !map[y] || !Array.isArray(map[y])) {
    throw new Error('Mapa inválido nas coordenadas (' + x + ', ' + y + ')');
  }
  
  var currentTile = Number(map[y][x]) || 0;
  map[y][x] = currentTile & ~flag;
  
  return map[y][x];
}

/**
 * Verifica se um tile possui uma flag específica.
 */
function hasTileFlag(tile, flag) {
  var value = Number(tile);
  return (value & flag) !== 0;
}

/**
 * Determina o tamanho da estrutura ocupada pelo tile.
 */
function checkZoneSize(value) {
  var baseValue = unwrapTile(value);
  return ZONE_SIZES[baseValue] || 1;
}

/**
 * Verifica se uma área está livre para construção.
 */
function isAreaClear(map, x, y, size) {
  var height = map.length;
  var width = map[0] ? map[0].length : 0;
  
  for (var dy = 0; dy < size; dy++) {
    for (var dx = 0; dx < size; dx++) {
      var checkX = x + dx;
      var checkY = y + dy;
      
      if (checkX >= width || checkY >= height) return false;
      
      var tile = unwrapTile(map[checkY][checkX]);
      if (tile !== TILE_TYPES.VAZIO && tile !== TILE_TYPES.SOLO_NU) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Obtém informações detalhadas sobre um tile.
 */
function getTileInfo(tile) {
  var value = Number(tile);
  var base = unwrapTile(value);
  
  var typeName = 'Desconhecido';
  for (var key in TILE_TYPES) {
    if (TILE_TYPES[key] === base) {
      typeName = key;
      break;
    }
  }
  
  return {
    value: value,
    baseType: base,
    typeName: typeName,
    size: checkZoneSize(value),
    hasCerca: hasTileFlag(value, TILE_FLAGS.CERCA_BIT),
    hasIrrigacao: hasTileFlag(value, TILE_FLAGS.IRRIGACAO_BIT),
    isDegradado: hasTileFlag(value, TILE_FLAGS.DEGRADADO_BIT),
    isProtegido: hasTileFlag(value, TILE_FLAGS.PROTEGIDO_BIT),
    emRecuperacao: hasTileFlag(value, TILE_FLAGS.EM_RECUPERACAO_BIT)
  };
}
