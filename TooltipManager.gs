/** Catálogo seguro de dicas contextuais para ferramentas e parcelas. */
var RESERVA_TOOL_DEFINITIONS = {
  inspect: { id: 'inspect', label: 'Inspecionar', cost: 0, description: 'Consultar uma parcela sem alterar o mapa.' },
  saf: { id: 'saf', label: 'Sistema agroflorestal', cost: 4500, description: 'Produção diversificada com cobertura permanente do solo.' },
  reserve: { id: 'reserve', label: 'Reserva legal', cost: 1800, description: 'Proteção integral com potencial de carbono e conectividade.' },
  trail: { id: 'trail', label: 'Trilha ecológica', cost: 2600, description: 'Visitação controlada e educação ambiental.' },
  water: { id: 'water', label: 'Recuperar nascente', cost: 3200, description: 'Proteção prioritária de uma zona hídrica sensível.' },
  clear: { id: 'clear', label: 'Desfazer intervenção', cost: 0, description: 'Retornar uma parcela de terra ao Cerrado nativo.' }
};

var RESERVA_TILE_DEFINITIONS = {
  native: { id: 'native', label: 'Cerrado nativo', description: 'Vegetação em regeneração natural; boa permeabilidade e biodiversidade.' },
  saf: { id: 'saf', label: 'Sistema agroflorestal', description: 'Produção diversificada com cobertura permanente do solo.' },
  reserve: { id: 'reserve', label: 'Reserva legal', description: 'Proteção integral; alto potencial de carbono e conectividade.' },
  trail: { id: 'trail', label: 'Trilha ecológica', description: 'Visitação controlada e educação ambiental.' },
  water: { id: 'water', label: 'Nascente recuperada', description: 'Zona sensível com proteção hídrica prioritária.' }
};

function copyTooltipDefinition_(definition, kind) {
  return { kind: kind, id: definition.id, title: definition.label, description: definition.description, cost: definition.cost == null ? null : definition.cost };
}

function getToolInfo(toolId) {
  var id = String(toolId || '').trim().toLowerCase();
  var definition = RESERVA_TOOL_DEFINITIONS[id];
  if (!definition) throwCustomError('NOT_FOUND', 'Ferramenta não encontrada.');
  return copyTooltipDefinition_(definition, 'tool');
}

function showToolInfo(toolId) {
  return { visible: true, tooltip: getToolInfo(toolId) };
}

function getTileInfo(tileType) {
  var id = String(tileType || '').trim().toLowerCase();
  var definition = RESERVA_TILE_DEFINITIONS[id];
  if (!definition) throwCustomError('NOT_FOUND', 'Tipo de parcela não encontrado.');
  return copyTooltipDefinition_(definition, 'tile');
}

function showTooltip(x, y, content) {
  var tooltip = typeof content === 'string' ? { title: content, description: '' } : (content || {});
  return {
    visible: true,
    x: Math.max(0, Math.min(10000, Number(x) || 0)),
    y: Math.max(0, Math.min(10000, Number(y) || 0)),
    tooltip: {
      kind: String(tooltip.kind || 'info'),
      id: String(tooltip.id || ''),
      title: String(tooltip.title || 'Detalhes'),
      description: String(tooltip.description || '').slice(0, 500),
      cost: tooltip.cost == null ? null : Number(tooltip.cost)
    }
  };
}

function hideTooltip() {
  return { visible: false };
}
