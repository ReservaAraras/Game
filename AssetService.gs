function getAssetManifest(token) {
  return getAssetLibraryContract(token).assets;
}

/**
 * Contrato da biblioteca complementar. A cena principal usa
 * GAME_ASSET_FOLDER_ID; esta pasta usa ASSET_LIBRARY_FOLDER_ID.
 * FOLDER_ID é aceito somente como compatibilidade com instalações antigas.
 */
function getAssetLibraryContract(token) {
  requireSession_(token);
  var config = getAppConfig_();
  var folderId = config.assetLibraryFolderId;
  var contract = {
    ok: Boolean(folderId),
    project: 'reserva_araras',
    folderProperty: 'ASSET_LIBRARY_FOLDER_ID',
    configuredBy: config.assetLibraryConfiguredBy || '',
    allowedExtensions: config.allowedAssetExtensions.slice(),
    maxBytes: config.maxAssetBytes,
    assets: []
  };
  if (!folderId) {
    contract.error = 'Configure ASSET_LIBRARY_FOLDER_ID nas Propriedades do script.';
    return contract;
  }
  var files = DriveApp.getFolderById(folderId).getFiles();
  var allowed = config.allowedAssetExtensions;
  var result = [];
  while (files.hasNext()) {
    var file = files.next();
    var name = file.getName();
    var extension = name.indexOf('.') >= 0 ? name.split('.').pop().toLowerCase() : '';
    if (allowed.indexOf(extension) < 0) continue;
    result.push({ id: file.getId(), name: name, extension: extension, mimeType: file.getMimeType(), size: file.getSize() });
  }
  contract.assets = result.sort(function (a, b) { return a.name.localeCompare(b.name); });
  return contract;
}

function getAssetData(token, fileId) {
  requireSession_(token);
  var config = getAppConfig_();
  if (!config.assetLibraryFolderId) throw new Error('ASSET_LIBRARY_FOLDER_ID não configurado.');
  var file = DriveApp.getFileById(String(fileId));
  var parents = file.getParents();
  var belongs = false;
  while (parents.hasNext()) if (parents.next().getId() === config.assetLibraryFolderId) belongs = true;
  if (!belongs) throw new Error('Asset fora da pasta configurada.');
  var name = file.getName();
  var extension = name.split('.').pop().toLowerCase();
  if (RESERVA_CONFIG.ALLOWED_ASSET_EXTENSIONS.indexOf(extension) < 0) throw new Error('Formato de asset não permitido.');
  if (file.getSize() > RESERVA_CONFIG.MAX_ASSET_BYTES) throw new Error('Asset maior que 8 MB.');
  var blob = file.getBlob();
  return { id: file.getId(), name: name, mimeType: blob.getContentType(), dataUrl: 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes()) };
}
