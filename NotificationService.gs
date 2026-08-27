/** Fila curta de mensagens para a interface, isolada por sessão. */
var RESERVA_NOTIFICATION_TYPES = ['info', 'success', 'warning', 'error'];

function notificationCacheKey_(playerId) {
  return 'notifications:' + String(playerId);
}

function normalizeNotification_(message, type) {
  var normalizedType = String(type || 'info').toLowerCase();
  if (RESERVA_NOTIFICATION_TYPES.indexOf(normalizedType) === -1) normalizedType = 'info';
  var text = String(message == null ? '' : message).trim();
  if (!text || text.length > 240) throwCustomError('VALIDATION_ERROR', 'Mensagem de notificação inválida.');
  return { id: Utilities.getUuid(), type: normalizedType, message: text, createdAt: new Date().toISOString() };
}

function readNotifications_(playerId) {
  var stored = getFromCache(notificationCacheKey_(playerId));
  return Array.isArray(stored) ? stored.slice(-20) : [];
}

function pushFrontEndMessage(token, message, type) {
  var player = requireSession_(token);
  var notification = normalizeNotification_(message, type);
  var queue = readNotifications_(player.id);
  queue.push(notification);
  setInCache(notificationCacheKey_(player.id), queue.slice(-20), 60 * 60);
  return notification;
}

function triggerAlert(token, type, message) {
  return pushFrontEndMessage(token, message || type, message ? type : 'info');
}

function logFazendaNews(token, newsItem) {
  newsItem = newsItem || {};
  var title = String(newsItem.title || 'Atualização da reserva').trim();
  var body = String(newsItem.message || newsItem.body || '').trim();
  if (!body) throwCustomError('VALIDATION_ERROR', 'Notícia sem conteúdo.');
  return pushFrontEndMessage(token, title + ': ' + body, newsItem.type || 'info');
}

function consumeNotifications(token) {
  var player = requireSession_(token);
  var notifications = readNotifications_(player.id);
  removeFromCache(notificationCacheKey_(player.id));
  return notifications;
}
