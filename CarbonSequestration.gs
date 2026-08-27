/**
 * Cálculos transparentes de carbono para o modelo didático.
 * Não consulta cotação nem afirma equivalência com inventário de emissões.
 */
var RESERVA_CARBON_RATES_ = {
  native: 1.8,
  cerrado: 1.8,
  'mata-galeria': 3.2,
  ilpf: 2.4,
  agrofloresta: 2.8,
  saf: 2.8
};

function carbonNumber_(value, fallback) {
  var number = Number(value);
  return isFinite(number) ? number : fallback;
}

function carbonType_(value) {
  var type = String(value || 'agrofloresta').trim().toLowerCase();
  if (!RESERVA_CARBON_RATES_[type]) throw new Error('Tipo de parcela sem fator de carbono didático.');
  return type;
}

function carbonArea_(parcela) {
  if (typeof parcela === 'number' || typeof parcela === 'string') return Math.max(0, carbonNumber_(parcela, 0));
  if (!parcela || typeof parcela !== 'object') throw new Error('Parcela ou área ausente.');
  var area = carbonNumber_(parcela.areaHa, NaN);
  if (!isFinite(area) || area <= 0 || area > 10000) throw new Error('Área da parcela deve estar entre 0 e 10.000 ha.');
  return area;
}

function calculateSequestration(parcela) {
  var area = carbonArea_(parcela);
  var type = typeof parcela === 'object' ? carbonType_(parcela.type || parcela.zone) : 'agrofloresta';
  var annual = Math.round(area * RESERVA_CARBON_RATES_[type] * 100) / 100;
  return {
    type: type,
    areaHa: area,
    tCO2ePerYear: annual,
    creditsPotential: Math.floor(annual),
    modelWarning: 'Estimativa didática; não é inventário, certificação ou crédito negociável real.'
  };
}

function generateCarbonCredits(sequestration) {
  var value = typeof sequestration === 'object' ? sequestration.tCO2ePerYear : sequestration;
  var tonnes = carbonNumber_(value, NaN);
  if (!isFinite(tonnes) || tonnes < 0) throw new Error('Sequestro de carbono inválido.');
  return {
    tonnes: Math.round(tonnes * 100) / 100,
    credits: Math.floor(tonnes),
    remainderTonnes: Math.round((tonnes - Math.floor(tonnes)) * 100) / 100,
    modelWarning: 'Conversão didática de 1 crédito por tonelada; não representa certificação.'
  };
}

function evaluateMarketPrice(marketData) {
  var input = marketData && typeof marketData === 'object' ? marketData.price : marketData;
  var price = carbonNumber_(input, 35);
  if (price < 0 || price > 10000) throw new Error('Preço didático deve estar entre 0 e 10.000.');
  return {
    pricePerCredit: Math.round(price * 100) / 100,
    currency: 'BRL',
    source: 'parâmetro didático local',
    modelWarning: 'Não é cotação de mercado nem recomendação financeira.'
  };
}
