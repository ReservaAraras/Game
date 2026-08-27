/**
 * @fileoverview Componente .gs do sistema Reserva Araras.
 * 
 * @module ReservaAraras
 * @description Conversão e manipulação de cores no jogo.
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
 * - Conversão e manipulação de cores no jogo.
 * - Operações CRUD na planilha do Google.
 * - Integração com os componentes HTML do frontend.
 * 
 * @methods
 * hexToRgb(hex) - Converte string hexadecimal para array RGB; interpolateColor(color1, color2, step) - Cria gradientes para mapas de calor; formatMapColor(value) - Escolhe a cor correta para impacto de 0 a 100.
 * 
 * @integrations
 * - TileEngine.gs, PollutionSystem.gs
 * - Google Utilities (CacheService, LockService)
 */

/** Converte #RGB, #RRGGBB ou #RRGGBBAA para [vermelho, verde, azul]. */
function hexToRgb(hex) {
  var value = String(hex == null ? '' : hex).trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(value)) {
    value = value.split('').map(function (part) { return part + part; }).join('');
  }
  if (!/^[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(value)) {
    throw new Error('Cor hexadecimal inválida. Use #RGB ou #RRGGBB.');
  }
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

/** Interpola duas cores e devolve uma cor hexadecimal normalizada. */
function interpolateColor(color1, color2, step) {
  var start = colorUtilsRgb_(color1);
  var end = colorUtilsRgb_(color2);
  var ratio = Number(step);
  if (!isFinite(ratio)) ratio = 0;
  ratio = Math.max(0, Math.min(1, ratio));
  return colorUtilsHex_([
    start[0] + (end[0] - start[0]) * ratio,
    start[1] + (end[1] - start[1]) * ratio,
    start[2] + (end[2] - start[2]) * ratio
  ]);
}

/** Mapeia impacto ambiental de 0 a 100 de verde para amarelo e vermelho. */
function formatMapColor(value) {
  var impact = Number(value);
  if (!isFinite(impact)) impact = 0;
  impact = Math.max(0, Math.min(100, impact));
  if (impact <= 50) return interpolateColor('#2e7d32', '#f9a825', impact / 50);
  return interpolateColor('#f9a825', '#c62828', (impact - 50) / 50);
}

function colorUtilsRgb_(color) {
  if (typeof color === 'string') return hexToRgb(color);
  if (Array.isArray(color) && color.length >= 3) return colorUtilsClampRgb_(color);
  if (color && typeof color === 'object' && ['r', 'g', 'b'].every(function (key) { return key in color; })) {
    return colorUtilsClampRgb_([color.r, color.g, color.b]);
  }
  throw new Error('Cor inválida. Use hexadecimal ou RGB.');
}

function colorUtilsClampRgb_(rgb) {
  return rgb.slice(0, 3).map(function (value) {
    var number = Number(value);
    if (!isFinite(number)) throw new Error('Canal de cor inválido.');
    return Math.max(0, Math.min(255, Math.round(number)));
  });
}

function colorUtilsHex_(rgb) {
  return '#' + colorUtilsClampRgb_(rgb).map(function (value) {
    return ('0' + value.toString(16)).slice(-2);
  }).join('').toUpperCase();
}
