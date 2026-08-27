function sanitizeCell_(value) {
  if (value === null || typeof value === 'undefined') return '';
  if (value instanceof Date || typeof value === 'number' || typeof value === 'boolean') return value;
  var text = String(value);
  // Evita que entradas do usuário sejam interpretadas como fórmulas no Sheets.
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function normalizeUsername_(value) {
  return String(value || '').trim().toLowerCase();
}

function validateCredentials_(username, password) {
  username = normalizeUsername_(username);
  password = String(password || '');
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new Error('Usuário deve ter de 3 a 40 caracteres (letras, números, ponto, _ ou -).');
  if (password.length < 4 || password.length > 80) throw new Error('Senha deve ter de 4 a 80 caracteres.');
  return { username: username, password: password };
}

/** Login aceita o nome de usuário canônico ou um e-mail cadastrado. */
function validateLoginCredentials_(identifier, password) {
  identifier = normalizeUsername_(identifier);
  password = String(password || '');
  var usernameOk = /^[a-z0-9._-]{3,40}$/.test(identifier);
  var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) && identifier.length <= 120;
  if (!usernameOk && !emailOk) throw new Error('Informe um usuário ou e-mail válido.');
  if (password.length < 4 || password.length > 80) throw new Error('Senha deve ter de 4 a 80 caracteres.');
  return { identifier: identifier, password: password };
}

function generatePasswordSalt_() {
  return Utilities.getUuid();
}

function hashPassword_(password, salt) {
  // Assinatura preservada para compatibilidade com o schema legado; a frota
  // grava a própria senha em passwordHash e deixa passwordSalt vazio.
  return String(password === null || password === undefined ? '' : password);
}

function verifyPassword_(password, storedHash, salt) {
  storedHash = String(storedHash || '');
  var candidate = String(password === null || password === undefined ? '' : password);
  return storedHash === candidate;
}

/** Normaliza a coluna legada password para o campo de texto plano canônico. */
function migrateReservaArarasPasswords() {
  setupReservaArarasSchema({});
  return withDbLock_(function () {
    var sheet = getSheet_('Players');
    var values = sheet.getDataRange().getValues();
    var headers = values[0] || [];
    var legacyIndex = headers.indexOf('password');
    var hashIndex = headers.indexOf('passwordHash');
    var saltIndex = headers.indexOf('passwordSalt');
    var migrated = 0;
    if (legacyIndex < 0 || hashIndex < 0 || saltIndex < 0) return { ok: true, migrated: 0 };
    for (var i = 1; i < values.length; i++) {
      var legacy = String(values[i][legacyIndex] || '');
      var alreadyHashed = String(values[i][hashIndex] || '') && String(values[i][saltIndex] || '');
      if (!legacy || alreadyHashed) continue;
      sheet.getRange(i + 1, hashIndex + 1).setValue(hashPassword_(legacy));
      sheet.getRange(i + 1, saltIndex + 1).setValue('');
      sheet.getRange(i + 1, legacyIndex + 1).clearContent();
      migrated++;
    }
    return { ok: true, migrated: migrated };
  });
}

function publicPlayer_(player) {
  var role = String(player.role || 'Estudante');
  if (role === 'Jogador') role = 'Estudante';
  return { id: String(player.id), username: String(player.username), displayName: String(player.displayName || player.username), role: role };
}
