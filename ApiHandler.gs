/**
 * Integrações HTTP opcionais do backend.
 *
 * O fluxo principal do app usa google.script.run. Estas funções isolam
 * integrações externas e validam entradas antes de acessar a rede ou o banco.
 */
function parseJsonResponse(response) {
  if (response === null || typeof response === 'undefined') return null;
  if (typeof response === 'object' && typeof response.getContentText !== 'function') return response;
  var text = typeof response === 'string' ? response : response.getContentText();
  if (!String(text).trim()) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    throwCustomError('INVALID_EXTERNAL_RESPONSE', 'O serviço externo retornou um formato inválido.');
  }
}

function validateExternalEndpoint_(endpoint) {
  var value = String(endpoint || '').trim();
  if (!/^https:\/\/[^\s]+$/i.test(value)) {
    throwCustomError('INVALID_ENDPOINT', 'O endpoint externo deve usar HTTPS.');
  }
  return value;
}

function encodeQueryParams_(params) {
  return Object.keys(params || {}).filter(function (key) {
    return key !== 'method' && key !== 'headers' && key !== 'payload';
  }).map(function (key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(String(params[key]));
  }).join('&');
}

function callExternalService(endpoint, params) {
  var url = validateExternalEndpoint_(endpoint);
  assertExternalEndpointAllowed_(url);
  var options = params || {};
  var method = String(options.method || 'get').toLowerCase();
  if (['get', 'post', 'put', 'patch'].indexOf(method) === -1) {
    throwCustomError('INVALID_HTTP_METHOD', 'Método HTTP não permitido.');
  }

  var fetchOptions = { method: method, muteHttpExceptions: true, followRedirects: false };
  if (options.headers && typeof options.headers === 'object') fetchOptions.headers = options.headers;
  if (method === 'get') {
    var query = encodeQueryParams_(options);
    if (query) url += (url.indexOf('?') >= 0 ? '&' : '?') + query;
  } else if (typeof options.payload !== 'undefined') {
    fetchOptions.contentType = 'application/json';
    fetchOptions.payload = typeof options.payload === 'string' ? options.payload : JSON.stringify(options.payload);
  }

  var response = UrlFetchApp.fetch(url, fetchOptions);
  var status = response.getResponseCode();
  var body = parseJsonResponse(response);
  if (status < 200 || status >= 300) {
    throwCustomError('EXTERNAL_SERVICE_ERROR', 'O serviço externo não está disponível no momento.');
  }
  return body;
}

function assertExternalEndpointAllowed_(endpoint) {
  var configured = String(PropertiesService.getScriptProperties().getProperty('EXTERNAL_API_ALLOWLIST') || '').trim();
  if (!configured) {
    throwCustomError('CONFIGURATION_ERROR', 'Configure EXTERNAL_API_ALLOWLIST antes de usar integrações externas.');
  }
  var allowed = configured.split(',').map(function (item) { return item.trim().replace(/\/$/, ''); }).filter(Boolean);
  var matches = allowed.some(function (prefix) {
    return endpoint === prefix || endpoint.indexOf(prefix + '/') === 0 || endpoint.indexOf(prefix + '?') === 0;
  });
  if (!matches) throwCustomError('FORBIDDEN', 'Endpoint externo não autorizado.');
}

function normalizeWebhookPayload_(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throwCustomError('INVALID_WEBHOOK_PAYLOAD', 'Payload de webhook inválido.');
  }
  var event = String(payload.event || payload.type || '').trim().slice(0, 80);
  if (!event) throwCustomError('INVALID_WEBHOOK_PAYLOAD', 'O webhook precisa informar um evento.');
  var data = payload.data == null ? {} : payload.data;
  if (typeof data !== 'object' || Array.isArray(data)) throwCustomError('INVALID_WEBHOOK_PAYLOAD', 'Dados do webhook inválidos.');
  return { event: event, data: redactAuditValue_(data), receivedAt: new Date().toISOString() };
}

function verifyWebhookSecret_(providedSecret) {
  var expectedSecret = String(PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET') || '');
  if (!expectedSecret || String(providedSecret || '') !== expectedSecret) {
    throwCustomError('UNAUTHORIZED', 'Webhook não autorizado.');
  }
}

function handleIncomingWebhook(payload, providedSecret) {
  verifyWebhookSecret_(providedSecret);
  var normalized = normalizeWebhookPayload_(payload);
  // Os eventos ficam disponíveis por pouco tempo para um consumidor interno;
  // não criamos uma nova aba nem persistimos dados externos sem necessidade.
  setInCache('webhook:last:' + normalized.event, normalized, 300);
  try { logAction('WEBHOOK_' + normalized.event, { receivedAt: normalized.receivedAt }); } catch (_) { Logger.log('Webhook recebido: ' + normalized.event); }
  return { ok: true, event: normalized.event, receivedAt: normalized.receivedAt };
}

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents;
    var payload = parseJsonResponse(raw || '{}');
    var headers = e && e.headers || {};
    var secret = (e && e.parameter && e.parameter.secret) || headers['X-Webhook-Secret'] || headers['x-webhook-secret'];
    var result = handleIncomingWebhook(payload, secret);
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify(showErrorToClient(error))).setMimeType(ContentService.MimeType.JSON);
  }
}
