function getSpreadsheet_() {
  return SpreadsheetApp.openById(getAppConfig_().spreadsheetId);
}

function getSchemas_() {
  return {
    Players: ['id', 'username', 'passwordHash', 'passwordSalt', 'displayName', 'role', 'active', 'createdAt', 'updatedAt', 'lastLoginAt'],
    Sessions: ['id', 'playerId', 'expiresAt', 'createdAt'],
    Saves: ['id', 'playerId', 'name', 'stateJson', 'createdAt', 'updatedAt'],
    Audit: ['id', 'playerId', 'action', 'detailsJson', 'createdAt']
  };
}

function ensureDatabase_() {
  var ss = getSpreadsheet_();
  var schemas = getSchemas_();
  Object.keys(schemas).forEach(function (name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    var headers = schemas[name];
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      sheet.setFrozenRows(1);
      return;
    }
    var lastColumn = sheet.getLastColumn();
    var current = lastColumn ? sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0] : [];
    if (!current.length || !current.some(function (value) { return String(value).trim(); })) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      var missing = headers.filter(function (header) { return current.indexOf(header) === -1; });
      if (missing.length) {
        sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
      }
    }
  });
}

function getSheet_(name) {
  var schema = getSchemas_()[name];
  if (!schema) throw new Error('Tabela não permitida: ' + name);
  ensureDatabase_();
  return getSpreadsheet_().getSheetByName(name);
}

function withDbLock_(callback) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return callback(); } finally { lock.releaseLock(); }
}

var SchemaService = {
  getSchemas: getSchemas_,
  montarOuRemontarPlanilhas: function(options) {
    options = options || {};
    var remount = options.mode === 'remontar' || options.remount === true;
    if (remount && options.confirmation !== 'REMONTAR_PLANILHAS') throw new Error('Confirme com REMONTAR_PLANILHAS.');
    return withDbLock_(function() {
      var spreadsheet = getSpreadsheet_();
      var schemas = getSchemas_();
      var results = Object.keys(schemas).map(function(name) {
        var sheet = spreadsheet.getSheetByName(name);
        var created = !sheet;
        if (!sheet) sheet = spreadsheet.insertSheet(name);
        if (remount) sheet.clear();
        var current = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
        var missing = schemas[name].filter(function(header) { return current.indexOf(header) === -1; });
        if (remount || !current.length) sheet.getRange(1, 1, 1, schemas[name].length).setValues([schemas[name]]);
        else if (missing.length) sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
        sheet.setFrozenRows(1);
        return { sheetName: name, created: created, remounted: remount, columns: schemas[name].length };
      });
      return { ok: true, mode: remount ? 'remontar' : 'montar', sheets: results };
    });
  }
};

/** Inicializa diretamente o banco de dados do Reserva Araras. */
function setupReservaArarasSchema(options) {
  return SchemaService.montarOuRemontarPlanilhas(options || {});
}

/** Popula duas linhas sintéticas em cada tabela, de forma idempotente. */
function popularDadosSinteticosReservaAraras(options) {
  options = options || {};
  setupReservaArarasSchema(options.schema || {});
  return withDbLock_(function () {
    var ss = getSpreadsheet_();
    var now = new Date().toISOString();
    var players = [
      { id: 'synthetic-araras-player-01', username: 'aluno01', password: 'senhafacil', displayName: 'Aluno 01', role: 'player', active: true, createdAt: now, updatedAt: now, lastLoginAt: '' },
      { id: 'synthetic-araras-player-02', username: 'aluno02', password: 'senhafacil2', displayName: 'Aluno 02', role: 'player', active: true, createdAt: now, updatedAt: now, lastLoginAt: '' }
    ];
    var rows = {
      Players: players,
      Sessions: players.map(function (p, i) { return { id: 'synthetic-araras-session-0' + (i + 1), playerId: p.id, expiresAt: new Date(Date.now() + 86400000).toISOString(), createdAt: now }; }),
      Saves: players.map(function (p, i) { return { id: 'synthetic-araras-save-0' + (i + 1), playerId: p.id, name: 'Trilha inicial ' + (i + 1), stateJson: JSON.stringify({ level: i + 1, birds: ['arara-azul'] }), createdAt: now, updatedAt: now }; }),
      Audit: players.map(function (p, i) { return { id: 'synthetic-araras-audit-0' + (i + 1), playerId: p.id, action: 'SEED', detailsJson: JSON.stringify({ synthetic: true, sequence: i + 1 }), createdAt: now }; })
    };
    var seeded = {};
    Object.keys(getSchemas_()).forEach(function (name) {
      var sheet = ss.getSheetByName(name), headers = getSchemas_()[name], existing = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues() : [], known = {};
      existing.forEach(function (row) { known[String(row[0] || '')] = true; });
      var pending = (rows[name] || [{ id: 'synthetic-araras-' + name.toLowerCase() + '-01' }, { id: 'synthetic-araras-' + name.toLowerCase() + '-02' }]).filter(function (item) { return !known[String(item[headers[0]] || '')]; }).map(function (item) {
        var hash = item.password ? hashPassword_(item.password) : '';
        return headers.map(function (header) {
          if (header === 'passwordHash') return hash;
          if (header === 'passwordSalt') return '';
          if (header === 'password') return '';
          return item[header] === undefined ? '' : item[header];
        });
      });
      if (pending.length) sheet.getRange(sheet.getLastRow() + 1, 1, pending.length, headers.length).setValues(pending);
      seeded[name] = pending.length;
    });
    return { ok: true, synthetic: true, credentials: players.map(function (p) { return { username: p.username, password: p.password }; }), seeded: seeded };
  });
}
