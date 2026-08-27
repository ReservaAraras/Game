/**
 * Regras orçamentárias puras do simulador.
 * Percentuais são recebidos como números de 0 a 100 e nenhuma função altera
 * o objeto de entrada. Isso permite validar uma escolha antes de salvá-la.
 */
var RESERVA_BUDGET_DEFAULTS_ = {
  taxRate: 0,
  fundPercentage: 0,
  pesBase: 500
};

function budgetNumber_(value, fallback) {
  var number = Number(value);
  return isFinite(number) ? number : fallback;
}

function budgetPercent_(value) {
  var percent = budgetNumber_(value, 0);
  if (percent < 0 || percent > 100) throw new Error('Percentual deve estar entre 0 e 100.');
  return Math.round(percent * 100) / 100;
}

function budgetZone_(zone) {
  var value = String(zone || '').trim().toLowerCase();
  if (!value || value.length > 60) throw new Error('Zona orçamentária inválida.');
  return value;
}

function setTaxRate(zone, rate) {
  return {
    zone: budgetZone_(zone),
    rate: budgetPercent_(rate),
    unit: '%',
    modelWarning: 'Alíquota fictícia usada apenas para comparação no simulador.'
  };
}

function setFundPercentage(service, percent) {
  return {
    service: budgetZone_(service),
    percentage: budgetPercent_(percent),
    unit: '%',
    modelWarning: 'Alocação didática; não representa política pública real.'
  };
}

/** Calcula um incentivo PSA/PES sem alterar o estado recebido. */
function processPESIncentive(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('Estado orçamentário ausente.');
  }
  var budget = budgetNumber_(state.budget, NaN);
  if (!isFinite(budget) || budget < 0) throw new Error('Orçamento inválido.');
  var conservation = Math.max(0, Math.min(100, budgetNumber_(state.conservation, 0)));
  var protectedArea = Math.max(0, Math.min(100, budgetNumber_(state.protectedArea, conservation)));
  var production = Math.max(0, budgetNumber_(state.production, 0));
  var eligibility = Math.round((conservation * 0.6 + protectedArea * 0.4) * 100) / 100;
  var incentive = eligibility < 60 ? 0 : Math.min(5000, RESERVA_BUDGET_DEFAULTS_.pesBase + eligibility * 20 + Math.min(1000, production * 2));
  incentive = Math.round(incentive * 100) / 100;
  return {
    eligible: incentive > 0,
    eligibilityIndex: eligibility,
    incentive: incentive,
    budgetAfter: Math.round((budget + incentive) * 100) / 100,
    modelWarning: 'Incentivo fictício; não equivale a cálculo de PSA/PES oficial.'
  };
}
