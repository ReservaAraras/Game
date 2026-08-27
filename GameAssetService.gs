/** Contrato canônico entre a pasta do Drive, o backend e o cenário. */
var GAME_ASSET_PROJECT = 'reserva_araras';
var GAME_ASSET_FILES = ['reserva_araras_map.svg', 'pesquisador_avatar.png'];
var GAME_ASSET_OPTIONAL_FILES = [];

function getGameAssetManifest() {
  return GameAssetService_getManifest_(GAME_ASSET_FILES, GAME_ASSET_OPTIONAL_FILES, GAME_ASSET_PROJECT);
}

function GameAssetService_getManifest_(requiredFiles, optionalFiles, project) {
  var expectedFiles = (requiredFiles || []).concat(optionalFiles || []);
  var base = {
    project: project || '', folderProperty: 'GAME_ASSET_FOLDER_ID', configuredBy: '',
    requiredFiles: requiredFiles || [], optionalFiles: optionalFiles || [], expectedFiles: expectedFiles,
    assets: {}, assetItems: [], missingRequiredFiles: (requiredFiles || []).slice(),
    missingOptionalFiles: (optionalFiles || []).slice(), ignoredFileCount: 0, ok: false
  };
  try {
    var allProps = PropertiesService.getScriptProperties().getProperties();
    var propertyNames = [
      'GAME_ASSET_FOLDER_ID', 'ASSET_FOLDER_ID', 'ASSETS_FOLDER_ID',
      'DRIVE_ASSET_FOLDER_ID', 'DRIVE_FOLDER_ID', 'PASTA_ASSETS_ID'
    ];
    var folderId = '';
    propertyNames.some(function(name) {
      var value = String(allProps[name] || '').trim();
      if (!value) return false;
      folderId = value;
      base.configuredBy = name;
      return true;
    });
    if (!folderId) {
      base.error = 'Configure a Script Property GAME_ASSET_FOLDER_ID.';
      return base;
    }

    var expected = {};
    expectedFiles.forEach(function(name) { expected[name] = true; });
    var files = DriveApp.getFolderById(folderId).getFiles();
    while (files.hasNext()) {
      var file = files.next();
      var name = file.getName();
      if (!expected[name]) { base.ignoredFileCount += 1; continue; }
      var url = 'https://drive.google.com/uc?export=view&id=' + file.getId();
      base.assets[name] = url;
      base.assetItems.push({
        name: name, url: url, mimeType: file.getMimeType(),
        required: requiredFiles.indexOf(name) >= 0
      });
    }
    base.missingRequiredFiles = requiredFiles.filter(function(name) { return !base.assets[name]; });
    base.missingOptionalFiles = (optionalFiles || []).filter(function(name) { return !base.assets[name]; });
    base.ok = base.missingRequiredFiles.length === 0;
    if (!base.ok) base.error = 'Arquivos obrigatórios ausentes: ' + base.missingRequiredFiles.join(', ');
    return base;
  } catch (error) {
    Logger.log('[GameAssetService] ' + error.message);
    base.error = 'Não foi possível ler a pasta de assets.';
    return base;
  }
}
