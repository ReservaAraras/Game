/**
 * Fronteira pedagógica do Reserva Araras.
 * Valida o estado salvo e produz uma trilha anônima, determinística e revisável.
 */
var PedagogicalTraceabilityService = (function () {
  var TILE_TYPES = ['native', 'saf', 'reserve', 'trail', 'water'];
  var JOURNAL_LIMITS = { question: 240, hypothesis: 600, observation: 600, explanation: 800, nextStep: 400 };

  function validateGameState(game) {
    if (!game || typeof game !== 'object') throw new Error('Estado da atividade ausente.');
    if (!Array.isArray(game.tiles) || game.tiles.length !== 48) throw new Error('O mapa deve conter 48 parcelas.');
    game.tiles.forEach(function (tile, index) {
      if (!tile || TILE_TYPES.indexOf(String(tile.type)) === -1) throw new Error('Tipo inválido na parcela ' + (index + 1) + '.');
    });
    if (typeof game.budget !== 'number' || !isFinite(game.budget) || game.budget < 0 || game.budget > 50000) {
      throw new Error('Orçamento inválido no estado da atividade.');
    }
    var journal = game.journal || {};
    Object.keys(JOURNAL_LIMITS).forEach(function (key) {
      if (journal[key] != null && String(journal[key]).length > JOURNAL_LIMITS[key]) throw new Error('Campo pedagógico excede o limite: ' + key + '.');
    });
    if (journal.records && (!Array.isArray(journal.records) || journal.records.length > 12)) throw new Error('Histórico pedagógico inválido.');
    if (journal.pendingIntervention && (typeof journal.pendingIntervention !== 'object' || Array.isArray(journal.pendingIntervention))) {
      throw new Error('Intervenção pendente inválida.');
    }
    return true;
  }

  function calculateMetrics_(game) {
    var counts = game.tiles.reduce(function (sum, tile) {
      sum[tile.type] = (sum[tile.type] || 0) + 1;
      return sum;
    }, {});
    var conservation = Math.round(((counts.native || 0) + (counts.reserve || 0) + (counts.water || 0)) / 48 * 100);
    var carbon = 120 + (counts.reserve || 0) * 18 + (counts.saf || 0) * 7;
    var production = (counts.saf || 0) * 12 + (counts.trail || 0) * 5;
    var health = Math.min(100, Math.round(conservation * 0.8 + Math.min(20, (counts.saf || 0) * 2)));
    return { counts: counts, conservation: conservation, carbon: carbon, production: production, balanceIndex: health, budget: game.budget };
  }

  function clean_(value, limit) {
    return String(value || '')
      .replace(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, '[OMITIDO]')
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}\-?\d{2}\b/g, '[OMITIDO]')
      .slice(0, limit);
  }

  function buildTrace(game) {
    validateGameState(game);
    var journal = game.journal || {};
    var records = Array.isArray(journal.records) ? journal.records : [];
    var lastRecord = records.length ? records[records.length - 1] : null;
    var trace = {
      projectName: 'Reserva Araras',
      learningCycle: 'pergunta-hipótese-intervenção-evidência-explicação-revisão',
      question: clean_(journal.question, JOURNAL_LIMITS.question),
      hypothesis: clean_(journal.hypothesis || (lastRecord && lastRecord.hypothesis), JOURNAL_LIMITS.hypothesis),
      evidence: { baseline: journal.baseline || (lastRecord && lastRecord.baseline) || null, current: calculateMetrics_(game) },
      explanation: clean_(journal.explanation || journal.observation || (lastRecord && lastRecord.explanation), JOURNAL_LIMITS.explanation),
      nextStep: clean_(journal.nextStep || (lastRecord && lastRecord.nextStep), JOURNAL_LIMITS.nextStep),
      versionCount: records.length,
      cycleStatus: journal.pendingIntervention ? 'awaiting_review' : (records.length ? 'reviewed' : 'planning'),
      reviewQuestions: [
        'A hipótese foi registrada antes da intervenção?',
        'A explicação cita ao menos um indicador e relaciona causa e efeito?',
        'A nova versão altera uma variável por vez?',
        'O estudante reconhece que a simulação simplifica o território real?'
      ],
      modelWarning: 'Indicadores didáticos; não equivalem a nota nem a recomendação ambiental real.',
      createdAt: new Date().toISOString()
    };
    var score = 0;
    if (trace.question) score++;
    if (trace.hypothesis) score++;
    if (trace.evidence.baseline) score++;
    if (trace.explanation) score++;
    if (trace.nextStep) score++;
    trace.completeness = { score: score, max: 5, label: score + '/5' };
    return trace;
  }

  return { validateGameState: validateGameState, buildTrace: buildTrace };
})();
