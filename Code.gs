/** Entrada do Web App Reserva Araras. */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Reserva Araras')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  // Avaliar como template permite resolver scriptlets dos parciais (por
  // exemplo, o logo base64 da tela de login) antes de concatená-los na página.
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}

function includeInlineData(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent().replace(/\s+/g, '');
}

/** Executar uma vez no editor do Apps Script após definir as propriedades. */
function setupProject() {
  var config = getAppConfig_();
  ensureDatabase_();
  return {
    ok: true,
    spreadsheetId: config.spreadsheetId,
    folderId: config.folderId,
    sheets: Object.keys(getSchemas_())
  };
}

function getPublicConfig() {
  var config = getAppConfig_();
  return {
    appName: 'Reserva Araras',
    assetsConfigured: Boolean(config.folderId),
    allowedAssets: config.allowedAssetExtensions
  };
}
