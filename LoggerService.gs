/** Auditoria mínima, sem registrar senhas ou o conteúdo completo das atividades. */
var AUDIT_MAX_DETAILS_LENGTH = 4000;

function redactAuditValue_(value, key) {
  if (/(password|senha|token|secret|authorization)/i.test(String(key || ''))) return '[OMITIDO]';
  if (value === null || typeof value === 'undefined') return value;
  if (typeof value === 'string') return value.slice(0, 1000);
  if (Array.isArray(value)) return value.slice(0, 20).map(function (item) { return redactAuditValue_(item); });
  if (typeof value === 'object') {
    var result = {};
    Object.keys(value).slice(0, 50).forEach(function (itemKey) {
      result[itemKey] = redactAuditValue_(value[itemKey], itemKey);
    });
    return result;
  }
  return value;
}

function auditDetails_(details) {
  var safe = redactAuditValue_(details || {});
  var serialized;
  try { serialized = JSON.stringify(safe); } catch (_) { serialized = '{"message":"detalhes indisponíveis"}'; }
  return serialized.slice(0, AUDIT_MAX_DETAILS_LENGTH);
}

function playerIdForAudit_(token) {
  if (!token) return '';
  try { return String(requireSession_(token).id); } catch (_) { return ''; }
}

function logAction(action, details, token) {
  var playerId = playerIdForAudit_(token);
  createRecord_('Audit', {
    playerId: playerId,
    action: String(action || 'ACTION').slice(0, 80),
    detailsJson: auditDetails_(details)
  });
  return { ok: true };
}

function logError(error, context, token) {
  var details = {
    context: redactAuditValue_(context || {}),
    message: String(error && error.message || error || 'Erro desconhecido').slice(0, 1000)
  };
  // Stack é útil para manutenção, mas nunca deve conter credenciais.
  if (error && error.stack) details.stack = String(error.stack).replace(/password|senha|token|secret/gi, '[OMITIDO]').slice(0, 2000);
  return logAction('ERROR', details, token);
}

function getAuditLog(token, limit) {
  var player = requireSession_(token);
  var max = Math.max(1, Math.min(100, Number(limit || 50)));
  return listRecords_('Audit', function (row) {
    return String(row.playerId || '') === String(player.id);
  }).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }).slice(0, max).map(function (row) {
    var details = {};
    try { details = JSON.parse(String(row.detailsJson || '{}')); } catch (_) {}
    return { id: String(row.id), action: String(row.action), details: details, createdAt: String(row.createdAt) };
  });
}
