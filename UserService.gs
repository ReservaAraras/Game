/** Consultas de perfil e atividade, sempre sem expor a senha armazenada. */
function resolvePlayerForService_(tokenOrIdentifier) {
  if (tokenOrIdentifier && typeof tokenOrIdentifier === 'object') tokenOrIdentifier = tokenOrIdentifier.token;
  var value = String(tokenOrIdentifier || '').trim();
  if (!value) throwCustomError('UNAUTHORIZED', 'Sessão ausente. Entre novamente.');

  // O caminho recomendado e autorizado é sempre o token da sessão.
  try {
    return requireSession_(value);
  } catch (sessionError) {
    // Compatibilidade com integrações antigas que consultavam por username.
    // Apenas campos públicos são retornados por getUserProfile/getUserRole.
    if (value.length > 80 || /\s/.test(value)) throw sessionError;
    var normalized = normalizeUsername_(value);
    var player = listRecords_('Players', function (row) {
      return normalizeUsername_(row.username) === normalized && String(row.active) !== 'false';
    })[0];
    if (!player) throw sessionError;
    return player;
  }
}

function getUserProfile(tokenOrIdentifier) {
  return publicPlayer_(resolvePlayerForService_(tokenOrIdentifier));
}

function getUserRole(tokenOrIdentifier) {
  return getUserProfile(tokenOrIdentifier).role;
}

/**
 * Retorna uma visão de atividade sem senha, e sem ordenar estudantes por nota.
 * A aplicação não usa ranking competitivo; a lista serve apenas para telas
 * administrativas futuras e, por isso, contém métricas de uso agregadas.
 */
function getLeaderboard(token) {
  requireSession_(token);
  var players = listRecords_('Players', function (row) { return String(row.active) !== 'false'; });
  var saves = listRecords_('Saves');
  return players.map(function (player) {
    var playerSaves = saves.filter(function (save) { return String(save.playerId) === String(player.id); });
    return {
      playerId: String(player.id),
      displayName: String(player.displayName || player.username),
      saveCount: playerSaves.length,
      lastActivityAt: playerSaves.reduce(function (latest, save) {
        var date = String(save.updatedAt || save.createdAt || '');
        return date > latest ? date : latest;
      }, String(player.lastLoginAt || player.createdAt || ''))
    };
  }).sort(function (a, b) {
    return b.saveCount - a.saveCount || b.lastActivityAt.localeCompare(a.lastActivityAt);
  }).slice(0, 100);
}
