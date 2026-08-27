/** Marcos formativos determinísticos; não há ranking nem pontuação competitiva. */
var RESERVA_ACHIEVEMENTS = {
  hypothesis: { id: 'hypothesis', title: 'Hipótese registrada', description: 'Uma ideia foi registrada antes da intervenção.', reflection: 'A hipótese ajuda a comparar o que você esperava com o que observou.' },
  evidence: { id: 'evidence', title: 'Comparação realizada', description: 'Uma linha de base foi comparada com a versão atual.', reflection: 'Qual indicador mudou e o que pode explicar essa mudança?' },
  explanation: { id: 'explanation', title: 'Explicação construída', description: 'Uma escolha foi relacionada a um resultado observado.', reflection: 'Sua explicação cita evidência e causa e consequência?' },
  revision: { id: 'revision', title: 'Próximo teste planejado', description: 'Um próximo passo foi registrado para continuar a investigação.', reflection: 'Qual variável ficará constante no próximo teste?' },
  limits: { id: 'limits', title: 'Limite reconhecido', description: 'A investigação reconheceu que o modelo simplifica o território real.', reflection: 'Que observação de campo complementaria a simulação?' }
};

function achievementCacheKey_(playerId) {
  return 'achievements:' + String(playerId);
}

function getAchievementList_() {
  return Object.keys(RESERVA_ACHIEVEMENTS).map(function (id) { return Object.assign({}, RESERVA_ACHIEVEMENTS[id]); });
}

function readUnlockedAchievements_(playerId) {
  var stored = getFromCache(achievementCacheKey_(playerId));
  return Array.isArray(stored) ? stored.filter(function (id) { return RESERVA_ACHIEVEMENTS[id]; }) : [];
}

function writeUnlockedAchievements_(playerId, ids) {
  setInCache(achievementCacheKey_(playerId), ids.slice(0, 20), 30 * 24 * 60 * 60);
  return ids;
}

function evaluateAchievementIds_(game) {
  var journal = game.journal || {};
  var ids = [];
  if (String(journal.hypothesis || '').trim()) ids.push('hypothesis');
  if (journal.baseline) ids.push('evidence');
  if (String(journal.explanation || journal.observation || '').trim()) ids.push('explanation');
  if (String(journal.nextStep || '').trim()) ids.push('revision');
  var journalText = JSON.stringify(journal).toLowerCase();
  if (/modelo|simula|limite|campo real/.test(journalText)) ids.push('limits');
  return ids;
}

function checkForMilestones(token, payload) {
  var player = requireSession_(token);
  var game = payload && payload.state ? payload.state : payload;
  PedagogicalTraceabilityService.validateGameState(game || {});
  var previous = readUnlockedAchievements_(player.id);
  var all = previous.concat(evaluateAchievementIds_(game || {})).filter(function (id, index, list) { return RESERVA_ACHIEVEMENTS[id] && list.indexOf(id) === index; });
  writeUnlockedAchievements_(player.id, all);
  return {
    unlocked: all.map(function (id) { return Object.assign({}, RESERVA_ACHIEVEMENTS[id]); }),
    newAchievements: all.filter(function (id) { return previous.indexOf(id) === -1; }).map(function (id) { return Object.assign({}, RESERVA_ACHIEVEMENTS[id]); })
  };
}

function unlockAchievement(token, achievementId) {
  var player = requireSession_(token);
  var id = String(achievementId || '').trim();
  if (!RESERVA_ACHIEVEMENTS[id]) throwCustomError('NOT_FOUND', 'Marco formativo não encontrado.');
  var unlocked = readUnlockedAchievements_(player.id);
  if (unlocked.indexOf(id) === -1) unlocked.push(id);
  writeUnlockedAchievements_(player.id, unlocked);
  return Object.assign({}, RESERVA_ACHIEVEMENTS[id]);
}

function getUnlockedBadges(token) {
  var player = requireSession_(token);
  return readUnlockedAchievements_(player.id).map(function (id) { return Object.assign({}, RESERVA_ACHIEVEMENTS[id]); });
}
