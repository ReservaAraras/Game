/**
 * @fileoverview Componente .gs do sistema Reserva Araras.
 * 
 * @module ReservaAraras
 * @description Sistema de eventos (pub/sub) para comunicação entre módulos.
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
 * - Sistema de eventos (pub/sub) para comunicação entre módulos.
 * - Operações CRUD na planilha do Google.
 * - Integração com os componentes HTML do frontend.
 * 
 * @methods
 * subscribe(event, callback) - Registra um ouvinte para um evento específico e devolve uma função de cancelamento; publish(event, data) - Dispara um evento para todos os ouvintes; clearSubscriptions(event) - Limpa ouvintes ao reiniciar a fazenda.
 * 
 * @integrations
 * - TimeManager.gs, NotificationService.gs
 * - Google Utilities (CacheService, LockService)
 */

// O barramento vive apenas durante a execução atual do Apps Script; não é um
// mecanismo de persistência nem substitui eventos armazenados na planilha.
var RESERVA_EVENT_SUBSCRIPTIONS = Object.create(null);

/** Registra um listener e devolve uma função idempotente para removê-lo. */
function subscribe(event, callback) {
  var name = eventBusName_(event);
  if (typeof callback !== 'function') throw new Error('O listener do evento deve ser uma função.');
  if (!RESERVA_EVENT_SUBSCRIPTIONS[name]) RESERVA_EVENT_SUBSCRIPTIONS[name] = [];
  var listeners = RESERVA_EVENT_SUBSCRIPTIONS[name];
  listeners.push(callback);
  var active = true;
  return function unsubscribe() {
    if (!active) return false;
    active = false;
    var index = listeners.indexOf(callback);
    if (index < 0) return false;
    listeners.splice(index, 1);
    if (!listeners.length) delete RESERVA_EVENT_SUBSCRIPTIONS[name];
    return true;
  };
}

/** Publica um evento; um listener com erro não impede os demais. */
function publish(event, data) {
  var name = eventBusName_(event);
  var listeners = (RESERVA_EVENT_SUBSCRIPTIONS[name] || []).slice();
  var errors = [];
  listeners.forEach(function (callback) {
    try {
      callback(data, name);
    } catch (error) {
      errors.push(error && error.message ? String(error.message) : String(error));
    }
  });
  return { event: name, delivered: listeners.length - errors.length, errors: errors };
}

/** Remove todos os listeners ou somente os de um evento, retornando a contagem. */
function clearSubscriptions(event) {
  if (typeof event !== 'undefined' && event !== null && String(event).trim() !== '') {
    var name = eventBusName_(event);
    var count = (RESERVA_EVENT_SUBSCRIPTIONS[name] || []).length;
    delete RESERVA_EVENT_SUBSCRIPTIONS[name];
    return count;
  }
  var total = Object.keys(RESERVA_EVENT_SUBSCRIPTIONS).reduce(function (sum, name) {
    return sum + RESERVA_EVENT_SUBSCRIPTIONS[name].length;
  }, 0);
  RESERVA_EVENT_SUBSCRIPTIONS = Object.create(null);
  return total;
}

function eventBusName_(event) {
  var name = String(event == null ? '' : event).trim();
  if (!name || name.length > 80 || !/^[a-zA-Z0-9_.:-]+$/.test(name)) {
    throw new Error('Nome de evento inválido.');
  }
  return name;
}
