/**
 * @fileoverview Componente .gs do sistema Reserva Araras.
 * 
 * @module ReservaAraras
 * @description Utilitários de manipulação de strings.
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
 * - Utilitários de manipulação de strings.
 * - Operações CRUD na planilha do Google.
 * - Integração com os componentes HTML do frontend.
 * 
 * @methods
 * formatCurrency(value) - Formata números para moeda local (R$); padString(str, length, fillChar) - Preenche à esquerda; generateId(prefix) - Cria identificadores únicos para registros.
 * 
 * @integrations
 * - Nenhum (Core Utility)
 * - Google Utilities (CacheService, LockService)
 */

/** Formata um valor finito no padrão monetário brasileiro, sem depender do locale do servidor. */
function formatCurrency(value) {
  var number = stringUtilsNumber_(value);
  var sign = number < 0 ? '-' : '';
  var parts = Math.abs(number).toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'R$ ' + sign + parts[0] + ',' + parts[1];
}

/** Preenche uma string à esquerda; por padrão usa zero, útil para datas e índices. */
function padString(str, length, fillChar) {
  var text = String(str == null ? '' : str);
  var targetLength = Number(length);
  if (!isFinite(targetLength) || Math.floor(targetLength) !== targetLength || targetLength < 0) {
    throw new Error('O comprimento deve ser um inteiro não negativo.');
  }
  if (text.length >= targetLength) return text;
  var fill = String(fillChar == null ? '0' : fillChar);
  if (fill.length !== 1) throw new Error('O caractere de preenchimento deve ter um único símbolo.');
  return new Array(targetLength - text.length + 1).join(fill) + text;
}

/** Gera um ID seguro para uso como chave de registro, sem substituir autenticação. */
function generateId(prefix) {
  var safePrefix = String(prefix == null || prefix === '' ? 'id' : prefix)
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'id';
  var uuid = typeof Utilities !== 'undefined' && Utilities.getUuid
    ? Utilities.getUuid()
    : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  return safePrefix + '-' + uuid;
}

function stringUtilsNumber_(value) {
  if (value === null || typeof value === 'undefined' || String(value).trim() === '') return 0;
  var number = Number(value);
  if (!isFinite(number)) throw new Error('O valor informado não é um número válido.');
  return number;
}
