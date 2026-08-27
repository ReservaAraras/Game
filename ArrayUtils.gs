/**
 * @fileoverview Componente .gs do sistema Reserva Araras.
 * 
 * @module ReservaAraras
 * @description Utilitários para manipulação de arrays e listas.
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
 * - Utilitários para manipulação de arrays e listas.
 * - Operações CRUD na planilha do Google.
 * - Integração com os componentes HTML do frontend.
 * 
 * @methods
 * makeArrayOf(length, fillValue) - Inicializa arrays sem referências compartilhadas; rotate10Arrays(historyArray, nextValue) - Mantém um histórico rolante de 10 ticks; copyFrom(source, target) - Realiza cópia profunda de matrizes de dados.
 * 
 * @integrations
 * - Nenhum (Core Utility)
 * - Google Utilities (CacheService, LockService)
 */

var RESERVA_HISTORY_LIMIT = 10;

/** Cria um array denso, clonando objetos para que cada posição seja independente. */
function makeArrayOf(length, fillValue) {
  var size = Number(length);
  if (!isFinite(size) || Math.floor(size) !== size || size < 0 || size > 100000) {
    throw new Error('O tamanho do array deve ser um inteiro entre 0 e 100000.');
  }
  var result = [];
  for (var i = 0; i < size; i++) result.push(cloneArrayValue_(fillValue));
  return result;
}

/**
 * Atualiza um histórico sem mutar a entrada. O item opcional é anexado como o
 * tick mais recente; o item mais antigo é descartado quando o limite é atingido.
 */
function rotate10Arrays(historyArray, nextValue) {
  if (!Array.isArray(historyArray)) throw new Error('O histórico deve ser um array.');
  var history = historyArray.map(cloneArrayValue_);
  if (arguments.length > 1) history.push(cloneArrayValue_(nextValue));
  if (history.length > RESERVA_HISTORY_LIMIT) {
    history = history.slice(history.length - RESERVA_HISTORY_LIMIT);
  }
  return history;
}

/** Copia profundamente source para target e retorna o próprio target. */
function copyFrom(source, target) {
  if (!Array.isArray(source)) throw new Error('A origem deve ser um array.');
  var copy = source.map(cloneArrayValue_);
  if (typeof target === 'undefined') return copy;
  if (!Array.isArray(target)) throw new Error('O destino deve ser um array.');
  target.splice(0, target.length);
  copy.forEach(function (value) { target.push(value); });
  return target;
}

function cloneArrayValue_(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Object.prototype.toString.call(value) === '[object Date]') return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(cloneArrayValue_);
  var clone = {};
  Object.keys(value).forEach(function (key) { clone[key] = cloneArrayValue_(value[key]); });
  return clone;
}
