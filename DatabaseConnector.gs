function rowsToObjects_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  return values.slice(1).filter(function (row) { return row.some(function (v) { return v !== ''; }); }).map(function (row, index) {
    var item = { _row: index + 2 };
    headers.forEach(function (header, column) { item[header] = row[column]; });
    return item;
  });
}

function listRecords_(table, predicate) {
  var rows = rowsToObjects_(getSheet_(table));
  return predicate ? rows.filter(predicate) : rows;
}

function readRecord_(table, id) {
  return listRecords_(table, function (row) { return String(row.id) === String(id); })[0] || null;
}

function createRecord_(table, data) {
  var sheet = getSheet_(table);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  var record = Object.assign({}, data);
  record.id = record.id || Utilities.getUuid();
  var now = new Date().toISOString();
  if (headers.indexOf('createdAt') >= 0) record.createdAt = record.createdAt || now;
  if (headers.indexOf('updatedAt') >= 0) record.updatedAt = now;
  var row = headers.map(function (key) { return sanitizeCell_(record[key]); });
  sheet.appendRow(row);
  return record;
}

function updateRecord_(table, id, changes) {
  var sheet = getSheet_(table);
  var record = readRecord_(table, id);
  if (!record) throw new Error('Registro não encontrado.');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  var allowed = {};
  headers.forEach(function (h) { allowed[h] = true; });
  Object.keys(changes || {}).forEach(function (key) {
    if (allowed[key] && key !== 'id' && key !== 'createdAt') record[key] = changes[key];
  });
  if (allowed.updatedAt) record.updatedAt = new Date().toISOString();
  sheet.getRange(record._row, 1, 1, headers.length).setValues([headers.map(function (key) { return sanitizeCell_(record[key]); })]);
  delete record._row;
  return record;
}

function deleteRecord_(table, id) {
  var sheet = getSheet_(table);
  var record = readRecord_(table, id);
  if (!record) return false;
  sheet.deleteRow(record._row);
  return true;
}
