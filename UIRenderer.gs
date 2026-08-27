/** View-models para o frontend; não gera HTML no servidor. */
var RESERVA_PANEL_NAMES = ['guide', 'assets', 'study', 'saves', 'settings', 'help', 'tutorial'];

function getUiBootstrap(token) {
  var player = requireSession_(token);
  return {
    player: publicPlayer_(player),
    app: getPublicConfig(),
    settings: getGameSettings(),
    tools: Object.keys(RESERVA_TOOL_DEFINITIONS).map(function (id) { return getToolInfo(id); }),
    tutorial: getTutorialSteps()
  };
}

function drawTopBar(token, state) {
  var player = requireSession_(token);
  var game = state || {};
  var trace = game.tiles ? PedagogicalTraceabilityService.buildTrace(game) : null;
  return {
    player: publicPlayer_(player),
    title: String(game.name || 'Minha investigação').slice(0, 60),
    budget: typeof game.budget === 'number' ? game.budget : getGameSettings().initialBudget,
    completeness: trace ? trace.completeness : null
  };
}

function drawBottomBar(token) {
  requireSession_(token);
  return { panels: RESERVA_PANEL_NAMES.map(function (name) { return { name: name, visible: false }; }) };
}

function togglePanel(panelName, isVisible) {
  var name = String(panelName || '').trim().toLowerCase();
  if (RESERVA_PANEL_NAMES.indexOf(name) === -1) throwCustomError('NOT_FOUND', 'Painel não encontrado.');
  return { name: name, visible: Boolean(isVisible) };
}

function buildDashboardModel(token, state) {
  requireSession_(token);
  PedagogicalTraceabilityService.validateGameState(state || {});
  var trace = PedagogicalTraceabilityService.buildTrace(state);
  var current = trace.evidence.current;
  var score = calculateFazendaScore({
    conservation: current.conservation,
    carbon: current.carbon,
    production: current.production,
    balanceIndex: current.balanceIndex
  });
  var classification = classifyFazenda(score);
  var protectedArea = Math.round(((current.counts.reserve || 0) + (current.counts.water || 0)) / state.tiles.length * 100);
  var incentive = processPESIncentive({
    budget: state.budget,
    conservation: current.conservation,
    protectedArea: protectedArea,
    production: current.production
  });
  return {
    metrics: {
      counts: current.counts,
      conservation: current.conservation,
      carbon: current.carbon,
      production: current.production,
      health: current.balanceIndex,
      budget: state.budget
    },
    evaluation: { score: score.score, dimensions: score.dimensions, category: classification.category },
    incentive: incentive,
    completeness: trace.completeness,
    modelWarning: trace.modelWarning,
    reviewQuestions: trace.reviewQuestions
  };
}
