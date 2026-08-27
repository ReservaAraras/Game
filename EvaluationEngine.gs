/**
 * Avaliação multidimensional do estado da reserva.
 * O retorno é explicável e não deve ser usado como nota do estudante.
 */
function evaluationNumber_(value, fallback) {
  var number = Number(value);
  return isFinite(number) ? number : fallback;
}

function evaluationPercent_(value) {
  return Math.max(0, Math.min(100, evaluationNumber_(value, 0)));
}

function evaluationScore_(value, maximum) {
  return Math.max(0, Math.min(100, evaluationNumber_(value, 0) / maximum * 100));
}

function calculateFazendaScore(metrics) {
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) {
    throw new Error('Indicadores da reserva ausentes.');
  }
  var conservation = evaluationPercent_(metrics.conservation);
  var carbon = evaluationScore_(metrics.carbon, 300);
  var production = evaluationScore_(metrics.production, 240);
  var balance = evaluationPercent_(metrics.balanceIndex != null ? metrics.balanceIndex : metrics.health);
  var dimensions = {
    conservation: Math.round(conservation),
    carbon: Math.round(carbon),
    production: Math.round(production),
    balance: Math.round(balance)
  };
  var score = dimensions.conservation * 0.4 + dimensions.carbon * 0.25 + dimensions.production * 0.15 + dimensions.balance * 0.2;
  return {
    score: Math.round(score * 100) / 100,
    dimensions: dimensions,
    modelWarning: 'Índice de aprendizagem; não é nota nem diagnóstico ambiental real.'
  };
}

function getAvaliacaoComunidade(metrics) {
  if (!metrics || typeof metrics !== 'object') throw new Error('Indicadores comunitários ausentes.');
  var participation = evaluationPercent_(metrics.participation != null ? metrics.participation : metrics.communitySupport);
  var employment = evaluationScore_(metrics.employment, 100);
  var access = evaluationPercent_(metrics.accessToBenefits != null ? metrics.accessToBenefits : metrics.access);
  var score = participation * 0.45 + employment * 0.25 + access * 0.3;
  return {
    supportPercent: Math.round(score * 100) / 100,
    dimensions: { participation: Math.round(participation), employment: Math.round(employment), access: Math.round(access) },
    modelWarning: 'Indicador simplificado; não representa pesquisa com a comunidade.'
  };
}

function classifyFazenda(score) {
  var value = typeof score === 'object' && score !== null ? score.score : score;
  value = evaluationPercent_(value);
  var category = value >= 80 ? 'Reserva Particular' : value >= 60 ? 'Fazenda Sustentável' : 'Pequeno Produtor';
  return {
    score: Math.round(value * 100) / 100,
    category: category,
    thresholds: { pequenoProdutor: '< 60', fazendaSustentavel: '60–79,99', reservaParticular: '80–100' },
    modelWarning: 'Categoria didática; não é certificação ou classificação oficial.'
  };
}
