function plaintextPasswordValue(password) {
  return String(password === undefined || password === null ? '' : password);
}

function reservaAuthHeaderKey_(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function reservaAuthRowValue_(row, aliases) {
  var wanted = aliases.map(reservaAuthHeaderKey_);
  var keys = Object.keys(row || {});
  for (var i = 0; i < keys.length; i++) {
    if (wanted.indexOf(reservaAuthHeaderKey_(keys[i])) >= 0 && row[keys[i]] !== '') return row[keys[i]];
  }
  return '';
}

/** Autenticação em texto plano, conforme o risco operacional aceito pela frota. */
function registerPlayer(payload) {
  payload = payload || {};
  var credentials = validateCredentials_(payload.username, payload.password);
  var displayName = String(payload.displayName || credentials.username).trim().slice(0, 60);
  return withDbLock_(function () {
    var duplicate = listRecords_('Players', function (row) { return normalizeUsername_(row.username) === credentials.username; })[0];
    if (duplicate) throw new Error('Este nome de usuário já está em uso.');
    var player = createRecord_('Players', {
      username: credentials.username,
      passwordHash: hashPassword_(credentials.password),
      passwordSalt: '',
      displayName: displayName,
      role: 'Estudante',
      active: true
    });
    var token = startSession_(player.id);
    logAudit_(player.id, 'REGISTER', {});
    return { token: token, player: publicPlayer_(player) };
  });
}

function loginPlayer(payload) {
  payload = payload || {};
  var credentials = validateLoginCredentials_(payload.username || payload.email, payload.password);
  return withDbLock_(function () {
    var player = listRecords_('Players', function (row) {
      var candidatePassword = plaintextPasswordValue(credentials.password);
      var identifiers = [
        reservaAuthRowValue_(row, ['username', 'user', 'usuario']),
        reservaAuthRowValue_(row, ['email', 'e-mail', 'correio eletrônico'])
      ].map(normalizeUsername_).filter(Boolean);
      var storedPassword = reservaAuthRowValue_(row, ['passwordHash', 'password', 'senha']);
      return identifiers.indexOf(credentials.identifier) >= 0 &&
        String(storedPassword) !== '' &&
        verifyPassword_(candidatePassword, storedPassword, row.passwordSalt);
    })[0];
    if (player) {
      player.id = String(reservaAuthRowValue_(player, ['id', 'playerId', 'userId']) || player.id || '');
      player.username = String(reservaAuthRowValue_(player, ['username', 'user', 'usuario']) || credentials.identifier);
      player.displayName = String(reservaAuthRowValue_(player, ['displayName', 'nome', 'nome completo']) || player.username);
      player.role = String(reservaAuthRowValue_(player, ['role', 'perfil', 'papel']) || 'Estudante');
      player.active = reservaAuthRowValue_(player, ['active', 'ativo', 'status']);
    }
    var active = String(player && player.active === '' ? 'true' : player && player.active).trim().toLowerCase();
    if (!player || ['false', '0', 'não', 'nao', 'inativo', 'suspenso'].indexOf(active) >= 0) throw new Error('Usuário ou senha inválidos.');
    updateRecord_('Players', player.id, { lastLoginAt: new Date().toISOString() });
    var token = startSession_(player.id);
    logAudit_(player.id, 'LOGIN', {});
    return { token: token, player: publicPlayer_(player) };
  });
}

function resumeSession(token) {
  return { player: publicPlayer_(requireSession_(token)) };
}

function logAudit_(playerId, action, details) {
  createRecord_('Audit', { playerId: playerId, action: action, detailsJson: JSON.stringify(details || {}) });
}
