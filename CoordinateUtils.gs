/**
 * @fileoverview Componente .gs do sistema Reserva Araras.
 * 
 * @module ReservaAraras
 * @description Conversão e cálculos de coordenadas (mundo vs pixel).
 * Este script faz parte da arquitetura principal do jogo Reserva Araras 
 * rodando em Google Apps Script. Ele interage com o Google Sheets centralizado (SPREADSHEETS_ID) 
 * e aplica regras de autorização com base na conta Google autenticada.
 * Foco em sustentabilidade realista: agrofloresta, sequestro de carbono, bioconstrução e desafios 
 * ambientais do nordeste goiano (Parque de Terra Ronca).
 * 
 * @author Manus AI
 * @license SPDX-License-Identifier: MIT
 * @version 1.0.0
 * 
 * @functionality
 * - Conversão e cálculos de coordenadas (mundo vs pixel).
 * - Operações CRUD na planilha do Google.
 * - Integração com os componentes HTML do frontend.
 * 
 * @methods
 * pixToWorld(pixels) - Converte coordenadas de tela para coordenadas de grade; worldToPix(tiles) - Converte coordenadas de grade para pixels na tela; checkBounds(x, y) - Valida se a coordenada está dentro do mapa configurado.
 * 
 * @integrations
 * - TileEngine.gs, MapaGenerator.gs
 * - Google Utilities (CacheService, LockService)
 */

var RESERVA_COORDINATE_DEFAULTS = { tileSize: 64, mapWidth: 8, mapHeight: 6 };

/** Converte {x, y} ou [x, y] em pixels para a célula de grade correspondente. */
function pixToWorld(pixels) {
  var point = coordinatePoint_(pixels, 'pixels');
  var tileSize = coordinateSettings_().tileSize;
  return { x: Math.floor(point.x / tileSize), y: Math.floor(point.y / tileSize) };
}

/** Converte {x, y} ou [x, y] de grade para o canto superior esquerdo em pixels. */
function worldToPix(tiles) {
  var point = coordinatePoint_(tiles, 'tiles');
  var tileSize = coordinateSettings_().tileSize;
  if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) {
    throw new Error('As coordenadas de grade devem ser inteiras.');
  }
  return { x: point.x * tileSize, y: point.y * tileSize };
}

/** Informa se uma célula inteira está dentro dos limites configurados do mapa. */
function checkBounds(x, y) {
  var point;
  try {
    point = coordinatePoint_({ x: x, y: y }, 'coordinate');
  } catch (_) {
    return false;
  }
  var settings = coordinateSettings_();
  return Number.isInteger(point.x) && Number.isInteger(point.y) &&
    point.x >= 0 && point.y >= 0 && point.x < settings.mapWidth && point.y < settings.mapHeight;
}

function coordinatePoint_(value, label) {
  var point = Array.isArray(value) ? { x: value[0], y: value[1] } : value;
  if (!point || typeof point !== 'object') throw new Error('As coordenadas de ' + label + ' são obrigatórias.');
  var x = Number(point.x), y = Number(point.y);
  if (!isFinite(x) || !isFinite(y)) throw new Error('As coordenadas de ' + label + ' devem ser numéricas.');
  return { x: x, y: y };
}

function coordinateSettings_() {
  var settings = typeof getGameSettings === 'function' ? getGameSettings() : {};
  var tileSize = Number(settings.tileSize || RESERVA_COORDINATE_DEFAULTS.tileSize);
  var mapWidth = Number(settings.mapWidth || RESERVA_COORDINATE_DEFAULTS.mapWidth);
  var mapHeight = Number(settings.mapHeight || RESERVA_COORDINATE_DEFAULTS.mapHeight);
  if (!isFinite(tileSize) || tileSize <= 0 || !isFinite(mapWidth) || !isFinite(mapHeight)) {
    throw new Error('Configuração de coordenadas inválida.');
  }
  return { tileSize: tileSize, mapWidth: Math.floor(mapWidth), mapHeight: Math.floor(mapHeight) };
}
