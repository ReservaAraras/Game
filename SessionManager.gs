function startSession_(playerId) {
  var expires = new Date(Date.now() + RESERVA_CONFIG.SESSION_HOURS * 3600000).toISOString();
  return createRecord_('Sessions', { playerId: playerId, expiresAt: expires }).id;
}

function requireSession_(token) {
  if (!token) throw new Error('Sessão ausente. Entre novamente.');
  var session = readRecord_('Sessions', token);
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    if (session) deleteRecord_('Sessions', session.id);
    throw new Error('Sessão expirada. Entre novamente.');
  }
  var player = readRecord_('Players', session.playerId);
  if (!player || String(player.active) === 'false') throw new Error('Estudante inativo ou inexistente.');
  return player;
}

function logout(token) {
  if (token) withDbLock_(function () { deleteRecord_('Sessions', token); });
  return { ok: true };
}
