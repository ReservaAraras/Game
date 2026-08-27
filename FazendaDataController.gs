/**
 * Fronteira autenticada entre a interface e o modelo da reserva.
 * O navegador envia uma intenção; o servidor valida e devolve o novo estado.
 */
var RESERVA_SIMULATION_TOOLS_ = {
  saf: { label: 'Sistema agroflorestal', cost: 4500, effect: 'Produção diversificada com cobertura permanente do solo.' },
  reserve: { label: 'Reserva legal', cost: 1800, effect: 'Proteção integral; alto potencial de carbono e conectividade.' },
  trail: { label: 'Trilha ecológica', cost: 2600, effect: 'Visitação controlada e educação ambiental.' },
  water: { label: 'Nascente recuperada', cost: 3200, effect: 'Zona sensível com proteção hídrica prioritária.' },
  clear: { label: 'Cerrado nativo', cost: 0, effect: 'Vegetação em regeneração natural; boa permeabilidade e biodiversidade.' }
};

function simulationJournal_() {
  return {
    question: 'Como combinar conservação, produção e cuidado com a água?',
    hypothesis: '', baseline: null, pendingIntervention: null,
    observation: '', explanation: '', nextStep: '', records: []
  };
}

function createDefaultSimulationState_() {
  var waterIndexes = [11, 19, 27, 35];
  var tiles = Array.apply(null, Array(48)).map(function (_, index) {
    return { type: waterIndexes.indexOf(index) >= 0 ? 'water' : 'native' };
  });
  return { budget: getGameSettings().initialBudget, cycle: 1, tiles: tiles, journal: simulationJournal_() };
}

function simulationTools_() {
  return Object.keys(RESERVA_SIMULATION_TOOLS_).map(function (id) {
    var tool = RESERVA_SIMULATION_TOOLS_[id];
    return { id: id, label: tool.label, cost: tool.cost, effect: tool.effect };
  });
}

function cloneSimulationState_(state) {
  PedagogicalTraceabilityService.validateGameState(state || {});
  return JSON.parse(JSON.stringify(state));
}

function simulationAction_(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Ação da simulação ausente.');
  var index = Number(payload.index);
  if (!isFinite(index) || Math.floor(index) !== index || index < 0 || index >= 48) throw new Error('Parcela inválida.');
  var tool = String(payload.tool || '').trim().toLowerCase();
  if (!RESERVA_SIMULATION_TOOLS_[tool]) throw new Error('Ferramenta de manejo inválida.');
  return { index: index, tool: tool };
}

function captureSimulationBaseline_(game) {
  game.journal = game.journal && typeof game.journal === 'object' ? game.journal : simulationJournal_();
  game.journal.records = Array.isArray(game.journal.records) ? game.journal.records : [];
  if (game.journal.baseline) return;
  var current = PedagogicalTraceabilityService.buildTrace(game).evidence.current;
  game.journal.baseline = {
    conservation: current.conservation,
    carbon: current.carbon,
    production: current.production,
    health: current.balanceIndex,
    budget: game.budget,
    capturedAt: new Date().toISOString()
  };
}

function getSimulationBootstrap(token) {
  var player = requireSession_(token);
  var game = createDefaultSimulationState_();
  return {
    player: publicPlayer_(player),
    state: game,
    dashboard: buildDashboardModel(token, game),
    tools: simulationTools_()
  };
}

function evaluateSimulationState(token, state) {
  requireSession_(token);
  var game = cloneSimulationState_(state);
  return buildDashboardModel(token, game);
}

function applySimulationAction(token, payload) {
  requireSession_(token);
  var action = simulationAction_(payload);
  var game = cloneSimulationState_(payload.state);
  var tile = game.tiles[action.index];
  var tool = RESERVA_SIMULATION_TOOLS_[action.tool];
  var journal = game.journal || {};
  if (!journal.baseline && !String(journal.hypothesis || '').trim()) {
    throw new Error('Antes da primeira intervenção, registre uma hipótese no Caderno de investigação.');
  }
  if (journal.pendingIntervention) {
    throw new Error('Compare e registre o resultado da intervenção anterior antes de testar outra variável.');
  }

  if (action.tool === 'clear') {
    if (tile.type === 'water') throw new Error('Nascentes não podem ser removidas.');
    if (tile.type === 'native') throw new Error('Esta parcela já está em regeneração nativa.');
  } else {
    if (tile.type === 'water') throw new Error('Escolha uma parcela de terra.');
    if (tile.type === action.tool) throw new Error('Esta intervenção já existe aqui.');
    if (game.budget < tool.cost) throw new Error('Orçamento insuficiente para esta intervenção.');
  }

  captureSimulationBaseline_(game);
  if (action.tool !== 'clear') game.budget = Math.round((game.budget - tool.cost) * 100) / 100;
  tile.type = action.tool === 'clear' ? 'native' : action.tool;
  game.journal.pendingIntervention = {
    parcel: action.index + 1,
    from: String(payload.state.tiles[action.index].type),
    to: tile.type,
    tool: action.tool,
    cost: action.tool === 'clear' ? 0 : tool.cost,
    appliedAt: new Date().toISOString()
  };
  PedagogicalTraceabilityService.validateGameState(game);

  return {
    state: game,
    dashboard: buildDashboardModel(token, game),
    parcel: { index: action.index, type: tile.type, label: action.tool === 'clear' ? tool.label : RESERVA_SIMULATION_TOOLS_[action.tool].label, effect: tool.effect },
    event: {
      type: 'success',
      message: action.tool === 'clear' ? 'Parcela devolvida à regeneração nativa.' : tool.label + ' implantado por R$ ' + tool.cost.toLocaleString('pt-BR') + '.'
    }
  };
}
