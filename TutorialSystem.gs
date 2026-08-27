/** Estado transitório do roteiro inicial, sem criar uma nova aba na planilha. */
var RESERVA_TUTORIAL_STEPS = [
  { id: 'observe', title: 'Observe antes de intervir', message: 'Leia o mapa e a legenda antes de mudar uma parcela.', target: '#map' },
  { id: 'intervene', title: 'Escolha uma ação', message: 'Mude uma variável por vez para comparar melhor o resultado.', target: '[data-tool="saf"]' },
  { id: 'compare', title: 'Compare os indicadores', message: 'Observe orçamento, conservação, carbono e produção.', target: '.metric-grid' },
  { id: 'reflect', title: 'Registre o que descobriu', message: 'Escreva hipótese, evidência, explicação e próximo teste.', target: '[data-action="study"]' }
];

function tutorialCacheKey_(playerId) {
  return 'tutorial:' + String(playerId);
}

function defaultTutorialState_() {
  return { startedAt: null, completedAt: null, currentStep: 0 };
}

function getTutorialSteps() {
  return RESERVA_TUTORIAL_STEPS.map(function (step, index) {
    return { index: index, id: step.id, title: step.title, message: step.message, target: step.target };
  });
}

function readTutorialState_(playerId) {
  var state = getFromCache(tutorialCacheKey_(playerId));
  if (!state || typeof state !== 'object') return defaultTutorialState_();
  return Object.assign(defaultTutorialState_(), state);
}

function writeTutorialState_(playerId, state) {
  setInCache(tutorialCacheKey_(playerId), state, 30 * 24 * 60 * 60);
  return state;
}

function checkFirstLogin(token) {
  var player = requireSession_(token);
  var state = readTutorialState_(player.id);
  return {
    firstLogin: !state.startedAt,
    completed: Boolean(state.completedAt),
    currentStep: Number(state.currentStep) || 0,
    totalSteps: RESERVA_TUTORIAL_STEPS.length
  };
}

function showNextTip(token) {
  var player = requireSession_(token);
  var state = readTutorialState_(player.id);
  if (!state.startedAt) state.startedAt = new Date().toISOString();
  var index = Math.max(0, Math.min(RESERVA_TUTORIAL_STEPS.length - 1, Number(state.currentStep) || 0));
  state.currentStep = index;
  writeTutorialState_(player.id, state);
  return { step: getTutorialSteps()[index], index: index, hasNext: index < RESERVA_TUTORIAL_STEPS.length - 1, completed: Boolean(state.completedAt) };
}

function completeTutorial(token) {
  var player = requireSession_(token);
  var state = readTutorialState_(player.id);
  state.startedAt = state.startedAt || new Date().toISOString();
  state.currentStep = RESERVA_TUTORIAL_STEPS.length;
  state.completedAt = new Date().toISOString();
  writeTutorialState_(player.id, state);
  return { ok: true, completedAt: state.completedAt };
}

function resetTutorial(token) {
  var player = requireSession_(token);
  removeFromCache(tutorialCacheKey_(player.id));
  return { ok: true };
}
