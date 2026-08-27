/** Erros previsíveis e respostas seguras para o frontend. */
var RESERVA_ERROR_MESSAGES = {
  INTERNAL_ERROR: 'Não foi possível concluir a operação.',
  UNAUTHORIZED: 'Sessão ausente ou expirada. Entre novamente.',
  FORBIDDEN: 'Você não tem permissão para esta operação.',
  NOT_FOUND: 'Registro não encontrado.',
  VALIDATION_ERROR: 'Confira os dados informados.',
  CONFIGURATION_ERROR: 'O aplicativo ainda não foi configurado pelo responsável.'
};

function throwCustomError(code, message) {
  var error = new Error(String(message || RESERVA_ERROR_MESSAGES[code] || RESERVA_ERROR_MESSAGES.INTERNAL_ERROR));
  error.name = 'ReservaError';
  error.code = String(code || 'INTERNAL_ERROR');
  throw error;
}

function errorCode_(error) {
  if (error && error.code) return String(error.code);
  var message = String(error && error.message || error || '');
  if (/sessão|senha|usuário/i.test(message)) return 'UNAUTHORIZED';
  if (/permiss|acesso negado|fora da pasta/i.test(message)) return 'FORBIDDEN';
  if (/não encontrado|inexistente/i.test(message)) return 'NOT_FOUND';
  if (/inválid|obrigat|excede|limite|deve ter|ausente/i.test(message)) return 'VALIDATION_ERROR';
  if (/propriedades|SPREADSHEETS_ID|FOLDER_ID|configur/i.test(message)) return 'CONFIGURATION_ERROR';
  return 'INTERNAL_ERROR';
}

function safeErrorMessage_(error, code) {
  if (error && error.name === 'ReservaError') return String(error.message);
  // Mensagens de validação e autenticação já são apropriadas para o usuário.
  if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN' || code === 'NOT_FOUND' || code === 'VALIDATION_ERROR' || code === 'CONFIGURATION_ERROR') {
    return String(error && error.message || RESERVA_ERROR_MESSAGES[code]);
  }
  return RESERVA_ERROR_MESSAGES.INTERNAL_ERROR;
}

function showErrorToClient(error) {
  var code = errorCode_(error);
  return { ok: false, error: { code: code, message: safeErrorMessage_(error, code) } };
}

function catchException(error, context) {
  var response = showErrorToClient(error);
  try { logError(error, context || {}); } catch (loggingError) { Logger.log(loggingError); }
  return response;
}
