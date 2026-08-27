var RESERVA_CONFIG = {
  SESSION_HOURS: 12,
  MAX_ASSET_BYTES: 8 * 1024 * 1024,
  ALLOWED_ASSET_EXTENSIONS: ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'glb', 'gltf', 'mp3', 'ogg', 'wav', 'json']
};

function getAppConfig_() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = String(props.getProperty('SPREADSHEETS_ID') || '').trim();
  var assetLibraryFolderId = String(
    props.getProperty('ASSET_LIBRARY_FOLDER_ID') ||
    props.getProperty('FOLDER_ID') ||
    ''
  ).trim();
  var assetLibraryConfiguredBy = String(props.getProperty('ASSET_LIBRARY_FOLDER_ID') || '').trim()
    ? 'ASSET_LIBRARY_FOLDER_ID'
    : (assetLibraryFolderId ? 'FOLDER_ID' : '');
  if (!spreadsheetId) throw new Error('Defina SPREADSHEETS_ID nas Propriedades do script.');
  return {
    spreadsheetId: spreadsheetId,
    // Alias preservado para as rotas antigas do projeto.
    folderId: assetLibraryFolderId,
    assetLibraryFolderId: assetLibraryFolderId,
    assetLibraryConfiguredBy: assetLibraryConfiguredBy,
    allowedAssetExtensions: RESERVA_CONFIG.ALLOWED_ASSET_EXTENSIONS.slice(),
    maxAssetBytes: RESERVA_CONFIG.MAX_ASSET_BYTES
  };
}

function getGameSettings() {
  return { mapWidth: 8, mapHeight: 6, initialBudget: 50000, sessionHours: RESERVA_CONFIG.SESSION_HOURS };
}
