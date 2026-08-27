/**
 * Cache compartilhado do backend.
 *
 * O cache é apenas uma otimização: nenhuma regra de autorização pode depender
 * dele. As chaves são prefixadas para não colidir com outras aplicações que
 * eventualmente usem o mesmo projeto Apps Script.
 */
var RESERVA_CACHE_PREFIX = 'reserva-araras:';
var RESERVA_CACHE_REGISTRY_KEY = 'RESERVA_CACHE_KEYS';

function normalizeCacheKey_(key) {
  var value = String(key == null ? '' : key).trim();
  if (!/^[a-zA-Z0-9._:-]{1,120}$/.test(value)) {
    throwCustomError('INVALID_CACHE_KEY', 'Chave de cache inválida.');
  }
  return RESERVA_CACHE_PREFIX + value;
}

function getFromCache(key) {
  var value = CacheService.getScriptCache().get(normalizeCacheKey_(key));
  if (value === null || typeof value === 'undefined') return null;
  try {
    return JSON.parse(value);
  } catch (_) {
    return value;
  }
}

function setInCache(key, value, expirationInSeconds) {
  var normalizedKey = normalizeCacheKey_(key);
  var expiration = Number(expirationInSeconds || 300);
  if (!isFinite(expiration)) expiration = 300;
  expiration = Math.max(1, Math.min(21600, Math.floor(expiration)));

  var serialized = JSON.stringify(value);
  if (serialized.length > 100000) {
    throwCustomError('CACHE_VALUE_TOO_LARGE', 'Valor grande demais para o cache.');
  }
  CacheService.getScriptCache().put(normalizedKey, serialized, expiration);
  registerCacheKey_(normalizedKey);
  return value;
}

function removeFromCache(key) {
  var normalizedKey = normalizeCacheKey_(key);
  CacheService.getScriptCache().remove(normalizedKey);
  unregisterCacheKey_(normalizedKey);
}

function flushReservaCache() {
  var properties = PropertiesService.getScriptProperties();
  var keys = readCacheRegistry_();
  if (keys.length) CacheService.getScriptCache().removeAll(keys);
  properties.deleteProperty(RESERVA_CACHE_REGISTRY_KEY);
  return { ok: true, removed: keys.length };
}

function readCacheRegistry_() {
  var raw = PropertiesService.getScriptProperties().getProperty(RESERVA_CACHE_REGISTRY_KEY);
  if (!raw) return [];
  try {
    var keys = JSON.parse(raw);
    return Array.isArray(keys) ? keys : [];
  } catch (_) {
    return [];
  }
}

function registerCacheKey_(key) {
  var properties = PropertiesService.getScriptProperties();
  var keys = readCacheRegistry_();
  if (keys.indexOf(key) === -1) {
    keys.push(key);
    // Mantém o registro limitado para não consumir as propriedades do projeto.
    properties.setProperty(RESERVA_CACHE_REGISTRY_KEY, JSON.stringify(keys.slice(-100)));
  }
}

function unregisterCacheKey_(key) {
  var properties = PropertiesService.getScriptProperties();
  var keys = readCacheRegistry_().filter(function (item) { return item !== key; });
  if (keys.length) properties.setProperty(RESERVA_CACHE_REGISTRY_KEY, JSON.stringify(keys));
  else properties.deleteProperty(RESERVA_CACHE_REGISTRY_KEY);
}
