/**
 * Serviços determinísticos para parcelas agroflorestais.
 *
 * O módulo não grava dados e não consulta fontes externas. Ele normaliza o
 * payload recebido pela interface e expõe cálculos didáticos reutilizáveis.
 * A persistência deve continuar sendo responsabilidade do fluxo de saves.
 */
var RESERVA_PARCELA_PROFILES_ = {
  native: { label: 'Vegetação nativa', productivity: 0.45, biodiversity: 0.65, carbon: 0.8 },
  cerrado: { label: 'Cerrado geral', productivity: 0.45, biodiversity: 0.65, carbon: 0.8 },
  'mata-galeria': { label: 'Mata de galeria', productivity: 0.2, biodiversity: 1, carbon: 1 },
  ilpf: { label: 'Sistema ILPF', productivity: 0.9, biodiversity: 0.7, carbon: 0.75 },
  agrofloresta: { label: 'Agrofloresta', productivity: 0.85, biodiversity: 0.85, carbon: 0.8 }
};

function reservaClamp_(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function reservaNumber_(value, fallback) {
  var number = Number(value);
  return isFinite(number) ? number : fallback;
}

function reservaParcelaType_(value) {
  var type = String(value || 'agrofloresta').trim().toLowerCase();
  if (type === 'saf') type = 'agrofloresta';
  if (!RESERVA_PARCELA_PROFILES_[type]) throw new Error('Tipo de parcela agroflorestal inválido.');
  return type;
}

function reservaParcela_(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Dados da parcela ausentes.');
  }
  var type = reservaParcelaType_(data.type || data.zone);
  var areaHa = reservaClamp_(reservaNumber_(data.areaHa, 1), 0.1, 10000);
  var id = String(data.id || data.parcelaId || '').trim().slice(0, 80);
  if (!id) id = typeof Utilities !== 'undefined' && Utilities.getUuid ? Utilities.getUuid() : 'parcela-local';
  return {
    id: id,
    type: type,
    label: RESERVA_PARCELA_PROFILES_[type].label,
    areaHa: Math.round(areaHa * 100) / 100,
    ageYears: reservaClamp_(reservaNumber_(data.ageYears, 1), 0, 200),
    irrigated: data.irrigated === true
  };
}

/** Normaliza uma parcela; não cria aba nem persiste o resultado. */
function registerParcela(data) {
  return reservaParcela_(data);
}

/** Calcula produtividade relativa e produção didática estimada por parcela. */
function calculateProductivity(parcela) {
  var normalized = reservaParcela_(parcela);
  var profile = RESERVA_PARCELA_PROFILES_[normalized.type];
  var maturity = reservaClamp_(normalized.ageYears / 8, 0, 1);
  var irrigationFactor = normalized.irrigated ? 1.08 : 1;
  var index = reservaClamp_(profile.productivity * (0.55 + maturity * 0.45) * irrigationFactor, 0, 1);
  return {
    parcelaId: normalized.id,
    productivityIndex: Math.round(index * 100) / 100,
    estimatedPointsPerCycle: Math.round(index * normalized.areaHa * 100) / 100,
    modelWarning: 'Índice didático; não substitui avaliação agronômica.'
  };
}

/** Avalia biodiversidade relativa, transparência e conectividade da parcela. */
function evaluateBiodiversityImpact(parcela) {
  var normalized = reservaParcela_(parcela);
  var profile = RESERVA_PARCELA_PROFILES_[normalized.type];
  var edgeBonus = normalized.type === 'mata-galeria' || normalized.type === 'agrofloresta' ? 0.05 : 0;
  var score = reservaClamp_(profile.biodiversity + edgeBonus, 0, 1);
  return {
    parcelaId: normalized.id,
    biodiversityIndex: Math.round(score * 100) / 100,
    carbonPotentialIndex: profile.carbon,
    interpretation: score >= 0.8 ? 'alto' : score >= 0.55 ? 'moderado' : 'baixo',
    modelWarning: 'Índice comparativo do simulador, sem validade ecológica isolada.'
  };
}
