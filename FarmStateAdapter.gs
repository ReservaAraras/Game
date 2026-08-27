/**
 * Compatibilidade entre os sistemas de domínio e o estado canônico da Reserva.
 *
 * Os módulos de domínio trabalham com uma matriz numérica 6x8, enquanto o
 * fluxo ativo salva 48 parcelas tipadas. Este adaptador mantém a persistência
 * em SaveLoadManager e traduz os dois formatos sem criar uma segunda fonte de
 * verdade.
 */
var RESERVA_SYSTEM_TILE_TO_TYPE_ = {
  0: 'native', 1: 'native', 2: 'native', 3: 'saf', 4: 'reserve',
  5: 'trail', 6: 'native', 7: 'water', 8: 'trail', 9: 'trail',
  10: 'water', 11: 'saf', 12: 'native'
};

var RESERVA_SYSTEM_TYPE_TO_TILE_ = {
  native: 1, saf: 3, reserve: 4, trail: 5, water: 7
};

function cloneSystemMap_(map, width, height) {
  if (!Array.isArray(map) || map.length !== height) return null;
  var copy = [];
  for (var y = 0; y < height; y++) {
    if (!Array.isArray(map[y]) || map[y].length !== width) return null;
    copy.push(map[y].map(function (value) {
      var numeric = Number(value);
      return isFinite(numeric) ? numeric : 1;
    }));
  }
  return copy;
}

function mapFromCanonicalState_(state, width, height) {
  var map = cloneSystemMap_(state.systemMap, width, height);
  var sourceTiles = Array.isArray(state.systemMapSourceTiles) && state.systemMapSourceTiles.length === width * height
    ? state.systemMapSourceTiles
    : null;

  // A canonical UI save may have changed one or more typed parcels since the
  // last domain-system save. Merge only those changes and retain flags and
  // structures everywhere else in the complementary numeric map.
  if (map && sourceTiles) {
    for (var index = 0; index < width * height; index++) {
      var currentType = state.tiles[index] && String(state.tiles[index].type);
      if (String(sourceTiles[index]) !== currentType) {
        var mapped = RESERVA_SYSTEM_TYPE_TO_TILE_[currentType];
        map[Math.floor(index / width)][index % width] = mapped == null ? 1 : mapped;
      }
    }
    return map;
  }

  map = [];
  for (var y = 0; y < height; y++) {
    var row = [];
    for (var x = 0; x < width; x++) {
      var index = y * width + x;
      var type = state.tiles[index] && String(state.tiles[index].type);
      row.push(RESERVA_SYSTEM_TYPE_TO_TILE_[type] == null ? 1 : RESERVA_SYSTEM_TYPE_TO_TILE_[type]);
    }
    map.push(row);
  }
  return map;
}

function loadFarm_(token, saveId) {
  var saved = loadGame(token, saveId);
  var settings = getGameSettings();
  var width = Number(settings.mapWidth) || 8;
  var height = Number(settings.mapHeight) || 6;
  var state = saved.state;
  var map = mapFromCanonicalState_(state, width, height);

  var metrics = PedagogicalTraceabilityService.buildTrace(state).evidence.current;
  return {
    id: String(saved.id),
    name: String(saved.name || 'Minha investigação'),
    state: state,
    map: map,
    width: width,
    height: height,
    budget: Number(state.budget) || 0,
    metrics: {
      conservation: Number(metrics.conservation) || 0,
      carbon: Number(metrics.carbon) || 0,
      production: Number(metrics.production) || 0,
      health: Number(metrics.balanceIndex) || 0
    },
    turn: Number(state.cycle) || 1,
    history: Array.isArray(state.systemHistory) ? state.systemHistory : [],
    turnHistory: Array.isArray(state.turnHistory) ? state.turnHistory : [],
    conflicts: Array.isArray(state.conflicts) ? state.conflicts : [],
    disasters: Array.isArray(state.disasters) ? state.disasters : []
  };
}

function saveFarm_(token, saveId, farm) {
  if (!farm || !Array.isArray(farm.map) || !farm.map.length) throw new Error('Estado da fazenda inválido.');
  var state = farm.state && typeof farm.state === 'object' ? farm.state : {};
  var width = Number(farm.width) || 8;
  var height = Number(farm.height) || 6;
  if (farm.map.length !== height || farm.map.some(function (row) { return !Array.isArray(row) || row.length !== width; })) {
    throw new Error('Dimensões do mapa incompatíveis com a configuração da reserva.');
  }
  var tiles = [];

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var value = unwrapTile(farm.map[y] && farm.map[y][x]);
      var type = RESERVA_SYSTEM_TILE_TO_TYPE_[value] || 'native';
      tiles.push({ type: type });
    }
  }

  state.tiles = tiles;
  state.systemMap = farm.map.map(function (row) { return row.slice(0, width); });
  state.systemMapSourceTiles = tiles.map(function (tile) { return tile.type; });
  state.budget = Math.max(0, Math.min(50000, Number(farm.budget) || 0));
  state.cycle = Math.max(1, Number(farm.turn) || 1);
  state.systemHistory = Array.isArray(farm.history) ? farm.history.slice(-50) : [];
  state.turnHistory = Array.isArray(farm.turnHistory) ? farm.turnHistory.slice(-50) : [];
  state.conflicts = Array.isArray(farm.conflicts) ? farm.conflicts.slice(-50) : [];
  state.disasters = Array.isArray(farm.disasters) ? farm.disasters.slice(-50) : [];

  PedagogicalTraceabilityService.validateGameState(state);
  return saveGame(token, {
    id: String(saveId || farm.id),
    name: String(farm.name || 'Minha investigação').slice(0, 60),
    state: state
  });
}
