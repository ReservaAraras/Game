/**
 * Avaliação de maturidade e intuitividade do frontend.
 *
 * O Apps Script não lê o próprio código HTML em runtime. Este serviço recebe
 * somente um snapshot técnico, validado e sem texto livre, produzido por uma
 * sessão autenticada. O resultado mede a experiência do produto; não é nota
 * nem diagnóstico do estudante.
 */
var RESERVA_FRONTEND_MATURITY_VERSION = '1.0.0';
var RESERVA_FRONTEND_ACTIONS = ['login', 'inspect', 'intervene', 'study', 'save', 'load'];
var RESERVA_FRONTEND_STAGES = [
  { level: 0, name: 'Não medido', minScore: 0, description: 'Ainda não há snapshot de uso válido.' },
  { level: 1, name: 'Protótipo estrutural', minScore: 20, description: 'O fluxo existe, mas há pouca evidência de clareza ou recuperação.' },
  { level: 2, name: 'MVP navegável', minScore: 40, description: 'O caminho principal é utilizável, com lacunas de experiência.' },
  { level: 3, name: 'Beta interno', minScore: 60, description: 'A experiência pode ser validada com uma turma pequena.' },
  { level: 4, name: 'Pré-produção', minScore: 78, description: 'A interface é consistente e há evidência de acessibilidade e recuperação.' },
  { level: 5, name: 'Pronto para piloto', minScore: 92, description: 'A experiência foi medida em diferentes dispositivos e fluxos.' }
];

function frontendMaturityCheck_(id, label, possible, earned, evidence, recommendation, severity) {
  var bounded = Math.max(0, Math.min(possible, earned));
  return {
    id: id,
    label: label,
    possible: possible,
    earned: Math.round(bounded * 100) / 100,
    status: bounded >= possible ? 'passed' : bounded > 0 ? 'partial' : 'failed',
    evidence: evidence,
    recommendation: recommendation || '',
    severity: severity || 'medium'
  };
}

function frontendMaturityStage_(score) {
  var selected = RESERVA_FRONTEND_STAGES[0];
  RESERVA_FRONTEND_STAGES.forEach(function (stage) {
    if (score >= stage.minScore) selected = stage;
  });
  return Object.assign({}, selected);
}

function frontendMaturityNumber_(value, minimum, maximum, fallback) {
  var number = Number(value);
  return isFinite(number) && number >= minimum && number <= maximum ? number : fallback;
}

function frontendMaturityBoolean_(value) {
  return value === true;
}

function validateFrontendSnapshot_(input) {
  input = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  var actions = Array.isArray(input.completedActions) ? input.completedActions : [];
  var uniqueActions = actions.filter(function (action, index) {
    return RESERVA_FRONTEND_ACTIONS.indexOf(String(action)) >= 0 && actions.indexOf(action) === index;
  }).slice(0, RESERVA_FRONTEND_ACTIONS.length);
  var errors = frontendMaturityNumber_(input.errorCount, 0, 100, 0);
  var recoveries = frontendMaturityNumber_(input.recoveryCount, 0, 100, 0);
  var confusing = frontendMaturityNumber_(input.confusingActionCount, 0, 100, 0);
  var duration = frontendMaturityNumber_(input.taskDurationMs, 0, 3600000, null);
  var viewportWidth = frontendMaturityNumber_(input.viewportWidth, 240, 5000, null);
  var viewportHeight = frontendMaturityNumber_(input.viewportHeight, 240, 5000, null);
  var layoutMode = ['mobile', 'tablet', 'desktop'].indexOf(String(input.layoutMode || '').toLowerCase()) >= 0
    ? String(input.layoutMode).toLowerCase()
    : null;
  return {
    measuredAt: new Date().toISOString(),
    completedActions: uniqueActions,
    taskCompleted: frontendMaturityBoolean_(input.taskCompleted),
    feedbackSeen: frontendMaturityBoolean_(input.feedbackSeen),
    helpUsed: frontendMaturityBoolean_(input.helpUsed),
    keyboardNavigation: frontendMaturityBoolean_(input.keyboardNavigation),
    visibleFocus: frontendMaturityBoolean_(input.visibleFocus),
    labelsPresent: frontendMaturityBoolean_(input.labelsPresent),
    reducedMotionAvailable: frontendMaturityBoolean_(input.reducedMotionAvailable),
    overflowDetected: frontendMaturityBoolean_(input.overflowDetected),
    hypothesisPromptSeen: frontendMaturityBoolean_(input.hypothesisPromptSeen),
    comparisonViewed: frontendMaturityBoolean_(input.comparisonViewed),
    modelLimitsSeen: frontendMaturityBoolean_(input.modelLimitsSeen),
    errorCount: errors,
    recoveryCount: recoveries,
    confusingActionCount: confusing,
    taskDurationMs: duration,
    viewportWidth: viewportWidth,
    viewportHeight: viewportHeight,
    layoutMode: layoutMode
  };
}

function frontendMaturityContract_() {
  return {
    actions: RESERVA_FRONTEND_ACTIONS.slice(),
    snapshotFields: [
      'completedActions', 'taskCompleted', 'feedbackSeen', 'helpUsed',
      'keyboardNavigation', 'visibleFocus', 'labelsPresent',
      'reducedMotionAvailable', 'overflowDetected', 'hypothesisPromptSeen',
      'comparisonViewed', 'modelLimitsSeen', 'errorCount', 'recoveryCount',
      'confusingActionCount', 'taskDurationMs', 'viewportWidth',
      'viewportHeight', 'layoutMode'
    ],
    privacy: {
      storesFreeText: false,
      storesStudentIdentity: false,
      purpose: 'medir a clareza e a acessibilidade do produto, não avaliar estudantes'
    }
  };
}

function frontendMaturityChecks_(snapshot) {
  var actionCoverage = snapshot.completedActions.length / RESERVA_FRONTEND_ACTIONS.length;
  var recoveryRate = snapshot.errorCount ? Math.min(1, snapshot.recoveryCount / snapshot.errorCount) : 1;
  var clarity = Math.max(0, 1 - snapshot.confusingActionCount / 5);
  var responsive = snapshot.viewportWidth && snapshot.viewportHeight && snapshot.layoutMode && !snapshot.overflowDetected;
  var accessibilitySignals = [snapshot.keyboardNavigation, snapshot.visibleFocus, snapshot.labelsPresent, snapshot.reducedMotionAvailable].filter(Boolean).length;
  return [
    frontendMaturityCheck_('flow.coverage', 'Cobertura do fluxo principal', 15, actionCoverage * 15, snapshot.completedActions.length + '/'+ RESERVA_FRONTEND_ACTIONS.length + ' ações técnicas concluídas.', 'Medir login, inspeção, intervenção, caderno, salvar e carregar.', 'high'),
    frontendMaturityCheck_('flow.completion', 'Conclusão da tarefa', 15, snapshot.taskCompleted ? 15 : actionCoverage >= .66 ? 7 : 0, snapshot.taskCompleted ? 'A tarefa de investigação foi concluída.' : 'A tarefa não foi marcada como concluída.', 'Definir uma tarefa curta de teste e observar onde ela é interrompida.', 'high'),
    frontendMaturityCheck_('intuitiveness.clarity', 'Clareza das ações', 15, (snapshot.feedbackSeen ? 5 : 0) + clarity * 10, snapshot.feedbackSeen ? 'O frontend exibiu feedback após ações.' : 'Não houve evidência de feedback percebido.', 'Garantir que cada ação tenha confirmação ou orientação compreensível.', 'high'),
    frontendMaturityCheck_('intuitiveness.recovery', 'Recuperação de erros', 10, recoveryRate * 10, snapshot.errorCount ? snapshot.recoveryCount + '/' + snapshot.errorCount + ' erros tiveram recuperação.' : 'Nenhum erro foi registrado no snapshot.', 'Testar sessão expirada, orçamento insuficiente e estado inválido.', 'critical'),
    frontendMaturityCheck_('accessibility.keyboard', 'Acessibilidade de teclado e foco', 10, (snapshot.keyboardNavigation ? 5 : 0) + (snapshot.visibleFocus ? 5 : 0), accessibilitySignals + '/4 sinais de acessibilidade informados.', 'Validar navegação completa sem mouse e foco visível.', 'high'),
    frontendMaturityCheck_('accessibility.content', 'Rótulos e movimento', 5, (snapshot.labelsPresent ? 3 : 0) + (snapshot.reducedMotionAvailable ? 2 : 0), 'Rótulos e preferência de movimento foram informados pelo cliente.', 'Manter labels, roles e alternativa a animações.', 'high'),
    frontendMaturityCheck_('responsive.viewport', 'Adaptação ao dispositivo', 10, responsive ? 10 : snapshot.viewportWidth ? 4 : 0, snapshot.layoutMode ? 'Viewport ' + snapshot.layoutMode + ' medido.' : 'Viewport não informado.', 'Repetir a medição em mobile, tablet e desktop sem overflow.', 'high'),
    frontendMaturityCheck_('pedagogy.guidance', 'Orientação da investigação', 10, (snapshot.hypothesisPromptSeen ? 3 : 0) + (snapshot.comparisonViewed ? 4 : 0) + (snapshot.modelLimitsSeen ? 3 : 0), 'Prompts pedagógicos observados: ' + [snapshot.hypothesisPromptSeen, snapshot.comparisonViewed, snapshot.modelLimitsSeen].filter(Boolean).length + '/3.', 'Preservar hipótese, comparação e limites do modelo no fluxo.', 'medium'),
    frontendMaturityCheck_('intuitiveness.support', 'Uso de ajuda sem bloqueio', 10, snapshot.helpUsed ? 7 : snapshot.taskCompleted ? 10 : 5, snapshot.helpUsed ? 'A ajuda foi usada durante a tarefa.' : 'A tarefa não precisou de ajuda ou o uso não foi medido.', 'Medir se a ajuda resolve dúvidas sem interromper o caminho principal.', 'medium')
  ];
}

function frontendMaturityReport_(snapshot) {
  var checks = frontendMaturityChecks_(snapshot);
  var possible = checks.reduce(function (sum, item) { return sum + item.possible; }, 0);
  var earned = checks.reduce(function (sum, item) { return sum + item.earned; }, 0);
  var score = Math.round(earned / possible * 10000) / 100;
  var rawStage = frontendMaturityStage_(score);
  var blockers = [];
  if (!snapshot.taskCompleted) blockers.push({ id: 'task_not_completed', capLevel: 2, message: 'A tarefa técnica não foi concluída no snapshot.', recommendation: 'Repetir o teste com uma tarefa de investigação curta.' });
  if (!snapshot.keyboardNavigation || !snapshot.visibleFocus) blockers.push({ id: 'accessibility_unverified', capLevel: 3, message: 'Acessibilidade de teclado/foco não foi comprovada.', recommendation: 'Executar o fluxo inteiro apenas com teclado.' });
  if (snapshot.overflowDetected) blockers.push({ id: 'responsive_overflow', capLevel: 2, message: 'Overflow foi detectado em algum viewport.', recommendation: 'Corrigir o layout no viewport informado antes do piloto.' });
  if (snapshot.errorCount > 3 && snapshot.recoveryCount < snapshot.errorCount) blockers.push({ id: 'recovery_gap', capLevel: 3, message: 'Há erros sem recuperação observada.', recommendation: 'Adicionar feedback e caminho de retorno para cada erro.' });
  var capLevel = blockers.reduce(function (cap, blocker) { return Math.min(cap, blocker.capLevel); }, 5);
  var effectiveStage = Object.assign({}, RESERVA_FRONTEND_STAGES[Math.min(rawStage.level, capLevel)]);
  return {
    tool: { id: 'reserva-araras-frontend-maturity', version: RESERVA_FRONTEND_MATURITY_VERSION, generatedAt: new Date().toISOString(), measured: true },
    purpose: 'diagnóstico de produto; não é nota ou avaliação do estudante',
    score: score,
    intuitivenessIndex: Math.round(((checks[0].earned / checks[0].possible * 25) + (checks[1].earned / checks[1].possible * 25) + (checks[2].earned / checks[2].possible * 25) + (checks[3].earned / checks[3].possible * 25)) * 100) / 100,
    rawStage: rawStage,
    effectiveStage: effectiveStage,
    confidence: blockers.length ? 'média' : 'alta',
    snapshot: snapshot,
    areas: [
      { id: 'flow', label: 'Fluxo e conclusão', checks: checks.slice(0, 2) },
      { id: 'intuitiveness', label: 'Intuitividade e recuperação', checks: [checks[2], checks[3], checks[8]] },
      { id: 'accessibility', label: 'Acessibilidade e responsividade', checks: [checks[4], checks[5], checks[6]] },
      { id: 'pedagogy', label: 'Orientação pedagógica', checks: [checks[7]] }
    ],
    blockers: blockers,
    nextActions: checks.filter(function (item) { return item.earned < item.possible; }).sort(function (a, b) { return (b.possible - b.earned) - (a.possible - a.earned); }).slice(0, 5).map(function (item) { return item.recommendation; })
  };
}

function getFrontendMaturityOverview(token) {
  requireSession_(token);
  return {
    tool: { id: 'reserva-araras-frontend-maturity', version: RESERVA_FRONTEND_MATURITY_VERSION, measured: false },
    purpose: 'diagnóstico de produto; não é nota ou avaliação do estudante',
    message: 'Envie um snapshot técnico para calcular maturidade e intuitividade.',
    contract: frontendMaturityContract_()
  };
}

function getFrontendMaturity(token, snapshot) {
  requireSession_(token);
  if (!snapshot || typeof snapshot !== 'object') return getFrontendMaturityOverview(token);
  return frontendMaturityReport_(validateFrontendSnapshot_(snapshot));
}

function getFrontendMaturitySummary(token, snapshot) {
  var report = getFrontendMaturity(token, snapshot);
  return {
    measured: Boolean(report.tool.measured),
    score: report.score == null ? null : report.score,
    intuitivenessIndex: report.intuitivenessIndex == null ? null : report.intuitivenessIndex,
    effectiveStage: report.effectiveStage || null,
    blockers: report.blockers || [],
    generatedAt: report.tool.generatedAt || null
  };
}
