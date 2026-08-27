/**
 * Diagnóstico de maturidade do backend no runtime do Google Apps Script.
 *
 * A ferramenta é deliberadamente somente leitura em Planilhas/Drive. Os
 * probes de cache e lock exercitam apenas os serviços transitórios e o
 * contrato pedagógico usa um estado determinístico em memória.
 */
var RESERVA_BACKEND_MATURITY_VERSION = '1.1.0';
var RESERVA_BACKEND_MATURITY_STAGES = [
  { level: 0, name: 'Inventário', minScore: 0, description: 'Há estrutura, mas nenhum fluxo backend foi comprovado.' },
  { level: 1, name: 'Protótipo estrutural', minScore: 20, description: 'A estrutura existe; o backend ainda está incompleto.' },
  { level: 2, name: 'MVP navegável', minScore: 40, description: 'O núcleo está utilizável, com lacunas relevantes.' },
  { level: 3, name: 'Beta interno', minScore: 60, description: 'O backend está pronto para validação controlada.' },
  { level: 4, name: 'Pré-produção', minScore: 78, description: 'O código está consistente; faltam provas operacionais e de release.' },
  { level: 5, name: 'Pronto para piloto', minScore: 92, description: 'Código, runtime, testes e implantação têm evidências recentes.' }
];

function maturityCheck_(id, label, possible, earned, status, evidence, recommendation, severity) {
  return {
    id: id,
    label: label,
    possible: possible,
    earned: Math.max(0, Math.min(possible, earned)),
    status: status,
    evidence: evidence,
    recommendation: recommendation || '',
    severity: severity || 'medium'
  };
}

function maturityStatus_(earned, possible) {
  if (earned >= possible) return 'passed';
  if (earned > 0) return 'partial';
  return 'failed';
}

function maturityFunction_(name) {
  return typeof this[name] === 'function';
}

function maturityStage_(score) {
  var selected = RESERVA_BACKEND_MATURITY_STAGES[0];
  RESERVA_BACKEND_MATURITY_STAGES.forEach(function (stage) {
    if (score >= stage.minScore) selected = stage;
  });
  return Object.assign({}, selected);
}

function maturityDatabaseProbe_() {
  var expected;
  try {
    expected = getSchemas_();
  } catch (error) {
    return { configured: false, sheets: [], message: 'Schemas do backend indisponíveis.' };
  }
  var spreadsheet;
  try {
    spreadsheet = getSpreadsheet_();
  } catch (error) {
    return { configured: false, sheets: [], message: 'Planilha não configurada ou inacessível.' };
  }
  var available = {};
  spreadsheet.getSheets().forEach(function (sheet) { available[sheet.getName()] = sheet; });
  var sheets = Object.keys(expected).map(function (name) {
    var sheet = available[name];
    if (!sheet) return { name: name, status: 'missing', headersMatch: false };
    var headers = sheet.getLastColumn() >= expected[name].length && sheet.getLastRow() > 0
      ? sheet.getRange(1, 1, 1, expected[name].length).getDisplayValues()[0]
      : [];
    return { name: name, status: 'present', headersMatch: headers.join('|') === expected[name].join('|') };
  });
  return { configured: true, sheets: sheets, allSchemasMatch: sheets.every(function (sheet) { return sheet.status === 'present' && sheet.headersMatch; }) };
}

function maturityCacheProbe_() {
  var key = 'maturity:probe';
  try {
    setInCache(key, { ok: true }, 60);
    var value = getFromCache(key);
    removeFromCache(key);
    return Boolean(value && value.ok);
  } catch (error) {
    try { removeFromCache(key); } catch (_) {}
    return false;
  }
}

function maturityLockProbe_() {
  var lock;
  try {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(1000)) return false;
    return true;
  } catch (error) {
    return false;
  } finally {
    if (lock) {
      try { lock.releaseLock(); } catch (_) {}
    }
  }
}

function maturityContractProbe_() {
  if (!maturityFunction_('runPedagogicalTraceabilityContractTest')) return { available: false, passed: false, message: 'Contrato manual não encontrado.' };
  try {
    var result = runPedagogicalTraceabilityContractTest();
    return { available: true, passed: Boolean(result && result.ok), completeness: result && result.completeness ? result.completeness : null };
  } catch (error) {
    return { available: true, passed: false, message: 'Contrato pedagógico falhou.' };
  }
}

function maturityDeploymentProbe_() {
  try {
    return Boolean(ScriptApp.getService().getUrl());
  } catch (error) {
    return false;
  }
}

function maturityCredentialProbe_() {
  try {
    var sheet = getSheet_('Players');
    var values = sheet.getDataRange().getValues();
    var headers = values[0] || [];
    var hashIndex = headers.indexOf('passwordHash');
    var saltIndex = headers.indexOf('passwordSalt');
    var legacyIndex = headers.indexOf('password');
    if (hashIndex < 0 || saltIndex < 0) return false;
    var rows = values.slice(1).filter(function (row) { return row.some(function (value) { return value !== ''; }); });
    return rows.length > 0 && rows.every(function (row) {
      return String(row[hashIndex] || '') !== '' && String(row[saltIndex] || '') === '' &&
        (legacyIndex < 0 || String(row[legacyIndex] || '') === '');
    });
  } catch (error) {
    return false;
  }
}

function maturityRequiredServices_() {
  return [
    ['auth', 'Autenticação', ['registerPlayer', 'loginPlayer', 'resumeSession', 'requireSession_']],
    ['storage', 'Persistência', ['getSpreadsheet_', 'getSchemas_', 'createRecord_', 'updateRecord_', 'deleteRecord_']],
    ['saves', 'Saves com autoria', ['listSaves', 'saveGame', 'loadGame', 'deleteGame']],
    ['security', 'Segurança de entrada', ['validateCredentials_', 'sanitizeCell_', 'publicPlayer_']],
    ['assets', 'Assets controlados', ['getAssetManifest', 'getAssetData']],
    ['audit', 'Auditoria', ['logAudit_', 'getAuditLog']],
    ['pedagogy', 'Rastreabilidade pedagógica', ['PedagogicalTraceabilityService']]
  ];
}

function maturityServiceChecks_() {
  return maturityRequiredServices_().map(function (service) {
    var missing = service[2].filter(function (name) {
      if (name === 'PedagogicalTraceabilityService') return typeof PedagogicalTraceabilityService === 'undefined';
      return !maturityFunction_(name);
    });
    var earned = missing.length ? Math.round((service[2].length - missing.length) / service[2].length * 100) / 100 * 2 : 2;
    return maturityCheck_('service.' + service[0], service[1], 2, earned, maturityStatus_(earned, 2), missing.length ? 'Ausente: ' + missing.join(', ') : 'Serviços centrais disponíveis no runtime.', 'Completar os serviços centrais antes de expandir o escopo.', 'high');
  });
}

function collectBackendMaturity_() {
  var database = maturityDatabaseProbe_();
  var credentialsPlaintext = maturityCredentialProbe_();
  var cacheWorks = maturityCacheProbe_();
  var lockWorks = maturityLockProbe_();
  var contract = maturityContractProbe_();
  var deployment = maturityDeploymentProbe_();
  var configurationChecks = [
    maturityCheck_('config.properties', 'Configuração externa', 3, database.configured ? 3 : 0, maturityStatus_(database.configured ? 3 : 0, 3), database.configured ? 'SPREADSHEETS_ID está configurado e a planilha respondeu.' : database.message, 'Configurar SPREADSHEETS_ID nas propriedades do script.', 'critical'),
    maturityCheck_('config.schema', 'Esquema das abas', 3, database.allSchemasMatch ? 3 : database.configured ? 1 : 0, maturityStatus_(database.allSchemasMatch ? 3 : database.configured ? 1 : 0, 3), database.allSchemasMatch ? 'Players, Sessions, Saves e Audit estão presentes com cabeçalhos compatíveis.' : 'Há abas ausentes ou cabeçalhos incompatíveis.', 'Executar setupProject() após revisar os cabeçalhos esperados.', 'critical'),
    maturityCheck_('config.setup', 'Setup reproduzível', 2, maturityFunction_('setupProject') ? 2 : 0, maturityStatus_(maturityFunction_('setupProject') ? 2 : 0, 2), maturityFunction_('setupProject') ? 'setupProject() disponível.' : 'setupProject() indisponível.', 'Manter um setup idempotente para o projeto.', 'high')
  ];
  var reliabilityChecks = [
    maturityCheck_('runtime.cache', 'Cache funcional', 2, cacheWorks ? 2 : 0, maturityStatus_(cacheWorks ? 2 : 0, 2), cacheWorks ? 'Leitura, gravação e remoção de cache passaram.' : 'Probe de cache falhou.', 'Verificar CacheService e Script Properties.', 'medium'),
    maturityCheck_('runtime.lock', 'Lock funcional', 2, lockWorks ? 2 : 0, maturityStatus_(lockWorks ? 2 : 0, 2), lockWorks ? 'LockService.tryLock/releaseLock passaram.' : 'Probe de lock falhou.', 'Garantir LockService nas mutações concorrentes.', 'high'),
    maturityCheck_('runtime.contract', 'Contrato pedagógico', 3, contract.passed ? 3 : contract.available ? 1 : 0, maturityStatus_(contract.passed ? 3 : contract.available ? 1 : 0, 3), contract.passed ? 'Contrato determinístico passou em runtime.' : contract.message || 'Contrato não passou.', 'Corrigir o contrato antes de alterar as métricas pedagógicas.', 'high'),
    maturityCheck_('runtime.deployment', 'URL de Web App disponível', 1, deployment ? 1 : 0, maturityStatus_(deployment ? 1 : 0, 1), deployment ? 'ScriptApp reconhece uma URL de serviço.' : 'Nenhuma URL de Web App foi reconhecida.', 'Validar a implantação como Web App separadamente.', 'critical')
  ];
  var securityChecks = [
    maturityCheck_('security.session', 'Autorização por sessão', 3, maturityFunction_('requireSession_') && maturityFunction_('startSession_') ? 3 : 0, maturityStatus_(maturityFunction_('requireSession_') && maturityFunction_('startSession_') ? 3 : 0, 3), 'Sessões são a fronteira de autorização do protótipo.', 'Não expor operações sensíveis sem requireSession_.', 'critical'),
    maturityCheck_('security.input', 'Validação e sanitização', 3, maturityFunction_('validateCredentials_') && maturityFunction_('sanitizeCell_') ? 3 : 0, maturityStatus_(maturityFunction_('validateCredentials_') && maturityFunction_('sanitizeCell_') ? 3 : 0, 3), 'Credenciais e células recebem validação server-side.', 'Manter validação também em novos endpoints.', 'critical'),
    maturityCheck_('security.audit', 'Auditoria sem credenciais', 2, maturityFunction_('logAudit_') && maturityFunction_('getAuditLog') ? 2 : 0, maturityStatus_(maturityFunction_('logAudit_') && maturityFunction_('getAuditLog') ? 2 : 0, 2), 'Auditoria e leitura por jogador estão disponíveis.', 'Nunca registrar senha, token ou estado completo.', 'high'),
    maturityCheck_('security.plaintext', 'Credenciais em texto plano (risco aceito)', 2, maturityFunction_('verifyPassword_') && credentialsPlaintext ? 2 : 0, maturityStatus_(maturityFunction_('verifyPassword_') && credentialsPlaintext ? 2 : 0, 2), credentialsPlaintext ? 'Todos os jogadores possuem passwordHash preenchido com a senha e passwordSalt vazio, conforme a decisão documentada da frota.' : 'Há credenciais sem o formato de texto plano esperado.', 'Executar setupProject() e normalizar as credenciais pela rotina de migração controlada.', 'high')
  ];
  var serviceChecks = maturityServiceChecks_();
  var allChecks = configurationChecks.concat(reliabilityChecks, securityChecks, serviceChecks);
  var possible = allChecks.reduce(function (sum, item) { return sum + item.possible; }, 0);
  var earned = allChecks.reduce(function (sum, item) { return sum + item.earned; }, 0);
  var score = possible ? Math.round(earned / possible * 10000) / 100 : 0;
  var rawStage = maturityStage_(score);
  var blockers = [];
  if (!database.configured || !database.allSchemasMatch) blockers.push({ id: 'database', capLevel: 1, message: 'Planilha ou esquema não comprovado.', recommendation: 'Configurar a planilha e executar setupProject().' });
  if (!contract.passed) blockers.push({ id: 'contract', capLevel: 2, message: 'Contrato pedagógico não passou em runtime.', recommendation: 'Executar e corrigir runPedagogicalTraceabilityContractTest().' });
  if (!deployment) blockers.push({ id: 'deployment', capLevel: 3, message: 'Implantação do Web App não foi comprovada pelo runtime.', recommendation: 'Validar uma implantação de teste e registrar o deployment_id externamente.' });
  if (!credentialsPlaintext) blockers.push({ id: 'plaintext_credentials', capLevel: 3, message: 'A decisão de credenciais em texto plano não foi comprovada no schema.', recommendation: 'Executar migrateReservaArarasPasswords() e validar passwordHash preenchido e passwordSalt vazio.' });
  var capLevel = blockers.reduce(function (cap, blocker) { return Math.min(cap, blocker.capLevel); }, 5);
  var effectiveStage = Object.assign({}, RESERVA_BACKEND_MATURITY_STAGES[capLevel < rawStage.level ? capLevel : rawStage.level]);
  return {
    tool: { id: 'reserva-araras-backend-maturity', version: RESERVA_BACKEND_MATURITY_VERSION, generatedAt: new Date().toISOString(), readOnly: true },
    project: 'Reserva Araras',
    score: score,
    rawStage: rawStage,
    effectiveStage: effectiveStage,
    confidence: deployment ? 'alta' : 'média',
    areas: [
      { id: 'configuration', label: 'Configuração e persistência', checks: configurationChecks },
      { id: 'reliability', label: 'Confiabilidade em runtime', checks: reliabilityChecks },
      { id: 'security', label: 'Segurança e risco aceito', checks: securityChecks },
      { id: 'services', label: 'Serviços centrais', checks: serviceChecks }
    ],
    blockers: blockers,
    database: { configured: database.configured, allSchemasMatch: Boolean(database.allSchemasMatch), sheets: database.sheets },
    probes: { cache: cacheWorks, lock: lockWorks, contract: contract.passed, webAppUrlAvailable: deployment },
    acceptedRisks: [],
  };
}

/** Diagnóstico seguro para uma sessão autenticada. Não retorna IDs nem dados pessoais. */
function getBackendMaturity(token) {
  requireSession_(token);
  return collectBackendMaturity_();
}

/** Executar no editor do Apps Script ou em uma implantação de diagnóstico. */
function runBackendMaturityCheck() {
  return collectBackendMaturity_();
}

function backendMaturitySummary(token) {
  var report = getBackendMaturity(token);
  return { score: report.score, rawStage: report.rawStage, effectiveStage: report.effectiveStage, blockers: report.blockers, generatedAt: report.tool.generatedAt };
}
