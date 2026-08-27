/**
 * Motor econômico local e determinístico do simulador.
 * Os preços e custos são parâmetros de jogo, nunca dados de mercado.
 */
var RESERVA_ECONOMY_DEFAULT_PRICES_ = {
  fruta: 18,
  madeira: 25,
  semente: 12,
  artesanato: 30,
  visita: 15
};

function economyNumber_(value, fallback) {
  var number = Number(value);
  return isFinite(number) ? number : fallback;
}

function economyNonNegative_(value, label) {
  var number = economyNumber_(value, NaN);
  if (!isFinite(number) || number < 0) throw new Error(label + ' deve ser um número não negativo.');
  return number;
}

function economyItems_(production) {
  if (Array.isArray(production)) return production;
  if (!production || typeof production !== 'object') throw new Error('Produção ausente.');
  return Object.keys(production).map(function (name) {
    return { product: name, quantity: production[name] };
  });
}

function calculateVendaSafra(production, prices) {
  var priceTable = Object.assign({}, RESERVA_ECONOMY_DEFAULT_PRICES_, prices || {});
  var items = economyItems_(production).map(function (item) {
    var product = String(item.product || item.name || '').trim().toLowerCase();
    if (!product || product.length > 60) throw new Error('Produto inválido.');
    var quantity = economyNonNegative_(item.quantity, 'Quantidade');
    var configuredPrice = item.unitPrice != null ? item.unitPrice : priceTable[product];
    if (configuredPrice == null) throw new Error('Preço não configurado para o produto: ' + product + '.');
    var unitPrice = economyNonNegative_(configuredPrice, 'Preço');
    return {
      product: product,
      quantity: quantity,
      unitPrice: unitPrice,
      total: Math.round(quantity * unitPrice * 100) / 100
    };
  });
  var grossRevenue = items.reduce(function (sum, item) { return sum + item.total; }, 0);
  return {
    items: items,
    grossRevenue: Math.round(grossRevenue * 100) / 100,
    modelWarning: 'Receita simulada; não representa preço, mercado ou renda garantida.'
  };
}

function payManutencao(balance, costs) {
  var before = economyNonNegative_(balance, 'Saldo');
  var list = Array.isArray(costs) ? costs : [costs == null ? 0 : costs];
  var requested = list.reduce(function (sum, cost) { return sum + economyNonNegative_(cost, 'Custo'); }, 0);
  var paid = Math.min(before, requested);
  return {
    balanceBefore: Math.round(before * 100) / 100,
    requested: Math.round(requested * 100) / 100,
    paid: Math.round(paid * 100) / 100,
    balanceAfter: Math.round((before - paid) * 100) / 100,
    shortfall: Math.round((requested - paid) * 100) / 100,
    fullyPaid: paid === requested
  };
}

function calculateValorTerra(metrics) {
  if (!metrics || typeof metrics !== 'object') throw new Error('Indicadores da terra ausentes.');
  var area = economyNonNegative_(metrics.areaHa, 'Área');
  var conservation = Math.max(0, Math.min(100, economyNumber_(metrics.conservation, 0)));
  var production = Math.max(0, economyNumber_(metrics.production, 0));
  var basePerHa = economyNumber_(metrics.basePerHa, 25000);
  if (basePerHa < 0) throw new Error('Valor-base inválido.');
  var multiplier = 0.7 + conservation / 250 + Math.min(0.3, production / 1000);
  var value = area * basePerHa * multiplier;
  return {
    areaHa: area,
    multiplier: Math.round(multiplier * 1000) / 1000,
    estimatedValue: Math.round(value * 100) / 100,
    currency: 'BRL',
    modelWarning: 'Avaliação fictícia; não é laudo imobiliário.'
  };
}
