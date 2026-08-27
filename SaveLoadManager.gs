function listSaves(token) {
  var player = requireSession_(token);
  return listRecords_('Saves', function (row) { return String(row.playerId) === String(player.id); })
    .map(function (row) { return { id: String(row.id), name: String(row.name), createdAt: String(row.createdAt), updatedAt: String(row.updatedAt) }; })
    .sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); });
}

function saveGame(token, payload) {
  var player = requireSession_(token);
  payload = payload || {};
  var name = String(payload.name || 'Minha investigação').trim().slice(0, 60);
  var gameState = payload.state || {};
  PedagogicalTraceabilityService.validateGameState(gameState);
  var pedagogicalTrace = PedagogicalTraceabilityService.buildTrace(gameState);
  var stateJson = JSON.stringify(gameState);
  if (stateJson.length > 45000) throw new Error('O estado excede o limite de 45.000 caracteres.');
  return withDbLock_(function () {
    var saved;
    if (payload.id) {
      var current = readRecord_('Saves', payload.id);
      if (!current || String(current.playerId) !== String(player.id)) throw new Error('Jogo salvo não encontrado.');
      saved = updateRecord_('Saves', current.id, { name: name, stateJson: stateJson });
    } else {
      saved = createRecord_('Saves', { playerId: player.id, name: name, stateJson: stateJson });
    }
    logAudit_(player.id, 'SAVE', {
      saveId: saved.id,
      name: name,
      pedagogicalCompleteness: pedagogicalTrace.completeness.label,
      versionCount: pedagogicalTrace.versionCount
    });
    return {
      id: String(saved.id),
      name: name,
      updatedAt: String(saved.updatedAt),
      dashboard: buildDashboardModel(token, gameState),
      trace: pedagogicalTrace
    };
  });
}

function loadGame(token, saveId) {
  var player = requireSession_(token);
  var saved = readRecord_('Saves', saveId);
  if (!saved || String(saved.playerId) !== String(player.id)) throw new Error('Jogo salvo não encontrado.');
  var state = JSON.parse(String(saved.stateJson || '{}'));
  PedagogicalTraceabilityService.validateGameState(state);
  return {
    id: String(saved.id),
    name: String(saved.name),
    state: state,
    dashboard: buildDashboardModel(token, state),
    trace: PedagogicalTraceabilityService.buildTrace(state)
  };
}

function deleteGame(token, saveId) {
  var player = requireSession_(token);
  return withDbLock_(function () {
    var saved = readRecord_('Saves', saveId);
    if (!saved || String(saved.playerId) !== String(player.id)) throw new Error('Jogo salvo não encontrado.');
    deleteRecord_('Saves', saved.id);
    logAudit_(player.id, 'DELETE_SAVE', { saveId: saved.id });
    return { ok: true };
  });
}
