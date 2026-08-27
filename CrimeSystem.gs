/**
 * @fileoverview Sistema de conflitos e atividades ilegais.
 * 
 * @module ReservaAraras
 * @description Simulação de conflitos reais: grilagem, roubo de madeira e mineração.
 * Implementa mecânicas de segurança e fiscalização.
 * 
 * @author Manus AI
 * @license SPDX-License-Identifier: MIT
 * @version 1.0.0
 */

var CONFLICT_TYPES = {
  GRILAGEM: {
    id: 'grilagem',
    name: 'Tentativa de Grilagem',
    riskFactors: ['baixa_vigilancia', 'terras_produtivas'],
    severity: 'high',
    baseProbability: 0.08
  },
  ROUBO_MADEIRA: {
    id: 'roubo_madeira',
    name: 'Extração Ilegal de Madeira',
    riskFactors: ['cerrado_nativo', 'baixa_fiscalizacao'],
    severity: 'medium',
    baseProbability: 0.12
  },
  MINERACAO_ILEGAL: {
    id: 'mineracao_ilegal',
    name: 'Garimpo Ilegal',
    riskFactors: ['proximidade_rio', 'ausencia_monitoramento'],
    severity: 'high',
    baseProbability: 0.05
  },
  CACA_PREDATORIA: {
    id: 'caca_predatoria',
    name: 'Caça Predatória',
    riskFactors: ['reserva_legal', 'baixa_vigilancia'],
    severity: 'medium',
    baseProbability: 0.10
  }
};

/**
 * Avalia os fatores de risco para invasões e conflitos de terra.
 */
function scanForConflito(token, farmId) {
  var player = requireSession_(token);
  
  var farm = loadFarm_(token, farmId);
  if (!farm || !farm.map) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var map = farm.map;
  var riskFactors = analyzeRiskFactors_(farm);
  var threats = [];
  
  for (var conflictKey in CONFLICT_TYPES) {
    var conflict = CONFLICT_TYPES[conflictKey];
    var risk = calculateConflictRisk_(conflict, riskFactors);
    
    if (risk.probability > 0.05) { // Apenas ameaças com > 5% de probabilidade
      threats.push({
        type: conflict.id,
        name: conflict.name,
        severity: conflict.severity,
        probability: Math.round(risk.probability * 10000) / 100,
        activeFactors: risk.activeFactors,
        recommendations: getSecurityRecommendations_(conflict.id, riskFactors)
      });
    }
  }
  
  return {
    riskLevel: calculateOverallRisk_(threats),
    threats: threats,
    riskFactors: riskFactors,
    securityScore: calculateSecurityScore_(riskFactors)
  };
}

/**
 * Cria incidentes baseados na ausência de vigilância.
 */
function spawnAtividadeIlegal(token, farmId, conflictType) {
  var player = requireSession_(token);
  
  conflictType = String(conflictType || '').toUpperCase();
  var conflict = CONFLICT_TYPES[conflictType];
  
  if (!conflict) {
    throw new Error('Tipo de conflito inválido: ' + conflictType);
  }
  
  var farm = loadFarm_(token, farmId);
  if (!farm || !farm.map) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var map = farm.map;
  var riskFactors = analyzeRiskFactors_(farm);
  var risk = calculateConflictRisk_(conflict, riskFactors);
  
  // Verifica se o conflito realmente ocorre
  if (Math.random() > risk.probability) {
    return {
      ok: true,
      occurred: false,
      message: 'Ameaça detectada mas evitada pelas medidas de segurança'
    };
  }
  
  // Conflito ocorre - aplica danos
  var damage = applyConflictDamage_(map, conflict);
  
  // Registra o incidente
  farm.conflicts = farm.conflicts || [];
  farm.conflicts.push({
    type: conflict.id,
    name: conflict.name,
    turn: farm.turn || 0,
    damage: damage,
    timestamp: new Date().toISOString()
  });
  
  // Aplica dano às métricas
  farm.metrics = farm.metrics || {};
  farm.metrics.conservation = Math.max(0, (farm.metrics.conservation || 0) - damage.conservation);
  farm.budget = Math.max(0, farm.budget - damage.budget);
  
  saveFarm_(token, farmId, farm);
  
  logAudit_(player.id, 'crime:incident', { farmId: farmId, type: conflict.id, damage: damage });
  
  return {
    ok: true,
    occurred: true,
    conflict: conflict,
    damage: damage,
    message: conflict.name + ' causou danos à fazenda!',
    recommendations: getSecurityRecommendations_(conflict.id, riskFactors)
  };
}

/**
 * Calcula a eficácia da segurança rural e fiscalização.
 */
function evaluateRespostaSeguranca(token, farmId) {
  var player = requireSession_(token);
  
  var farm = loadFarm_(token, farmId);
  if (!farm) {
    throw new Error('Fazenda não encontrada.');
  }
  
  var security = {
    vigilancia: 0,
    fiscalizacao: 0,
    comunitaria: 0,
    tecnologica: 0
  };
  
  // Vigilância aumenta com estradas (acesso mais fácil)
  var roads = countTileType_(farm.map, TILE_TYPES.ESTRADA);
  security.vigilancia = Math.min(100, roads * 5);
  
  // Fiscalização aumenta com Reserva Legal demarcada
  var reserva = countTileType_(farm.map, TILE_TYPES.RESERVA_LEGAL);
  security.fiscalizacao = Math.min(100, reserva * 2);
  
  // Segurança comunitária aumenta com ecoturismo
  var tourism = farm.tourismCapacity || 0;
  security.comunitaria = Math.min(100, tourism * 2);
  
  // Score geral
  var overallSecurity = (security.vigilancia + security.fiscalizacao + security.comunitaria) / 3;
  
  return {
    security: security,
    overallScore: Math.round(overallSecurity * 100) / 100,
    effectiveness: overallSecurity > 70 ? 'Alta' : overallSecurity > 40 ? 'Média' : 'Baixa',
    conflictHistory: farm.conflicts || [],
    totalIncidents: (farm.conflicts || []).length,
    recommendations: overallSecurity < 50 ? [
      'Aumentar vigilância com mais estradas de acesso',
      'Demarcar Reserva Legal para facilitar fiscalização',
      'Desenvolver ecoturismo para presença comunitária'
    ] : ['Manter práticas atuais de segurança']
  };
}

/**
 * Analisa fatores de risco da fazenda.
 */
function analyzeRiskFactors_(farm) {
  var map = farm.map;
  var factors = {
    baixa_vigilancia: countTileType_(map, TILE_TYPES.ESTRADA) < 5,
    baixa_fiscalizacao: countTileType_(map, TILE_TYPES.RESERVA_LEGAL) < 10,
    cerrado_nativo: countTileType_(map, TILE_TYPES.CERRADO) > 50,
    terras_produtivas: countTileType_(map, TILE_TYPES.SAF) > 20,
    proximidade_rio: countTileType_(map, TILE_TYPES.RIO) > 10,
    ausencia_monitoramento: (farm.tourismCapacity || 0) < 10,
    reserva_legal: countTileType_(map, TILE_TYPES.RESERVA_LEGAL) > 20
  };
  
  return factors;
}

/**
 * Calcula risco de um conflito específico.
 */
function calculateConflictRisk_(conflict, riskFactors) {
  var activeFactors = [];
  var probability = conflict.baseProbability;
  
  for (var i = 0; i < conflict.riskFactors.length; i++) {
    var factor = conflict.riskFactors[i];
    if (riskFactors[factor]) {
      activeFactors.push(factor);
      probability += 0.05; // +5% por fator
    }
  }
  
  return {
    probability: Math.min(0.5, probability), // Máximo 50%
    activeFactors: activeFactors
  };
}

/**
 * Aplica dano do conflito ao mapa.
 */
function applyConflictDamage_(map, conflict) {
  var damage = {
    conservation: 0,
    budget: 0,
    tiles: 0,
    description: ''
  };
  
  if (conflict.id === 'grilagem') {
    damage.budget = 1000;
    damage.conservation = 5;
    damage.description = 'Custos legais e perda de área';
  } else if (conflict.id === 'roubo_madeira') {
    var cerradoCount = countTileType_(map, TILE_TYPES.CERRADO);
    var affected = Math.min(10, Math.floor(cerradoCount * 0.1));
    damage.tiles = affected;
    damage.conservation = affected * 2;
    damage.budget = affected * 50;
    damage.description = affected + ' árvores extraídas ilegalmente';
  } else if (conflict.id === 'mineracao_ilegal') {
    damage.conservation = 15;
    damage.budget = 2000;
    damage.description = 'Degradação severa e custos de recuperação';
  } else if (conflict.id === 'caca_predatoria') {
    damage.conservation = 8;
    damage.budget = 500;
    damage.description = 'Impacto na fauna local';
  }
  
  return damage;
}

/**
 * Calcula risco geral.
 */
function calculateOverallRisk_(threats) {
  if (threats.length === 0) return 'Baixo';
  
  var avgProbability = threats.reduce(function(sum, t) { 
    return sum + t.probability; 
  }, 0) / threats.length;
  
  return avgProbability > 20 ? 'Alto' : avgProbability > 10 ? 'Médio' : 'Baixo';
}

/**
 * Calcula score de segurança.
 */
function calculateSecurityScore_(riskFactors) {
  var negativeFactors = 0;
  for (var key in riskFactors) {
    if (riskFactors[key] && key.indexOf('baixa') === 0 || key.indexOf('ausencia') === 0) {
      negativeFactors++;
    }
  }
  
  return Math.max(0, 100 - (negativeFactors * 15));
}

/**
 * Recomendações de segurança.
 */
function getSecurityRecommendations_(conflictType, riskFactors) {
  var recommendations = {
    grilagem: ['Regularizar documentação da terra', 'Demarcar limites claramente', 'Registrar em cartório'],
    roubo_madeira: ['Aumentar vigilância', 'Implementar sistema de monitoramento', 'Parcerias com IBAMA'],
    mineracao_ilegal: ['Fiscalização intensiva próximo a rios', 'Denúncia às autoridades', 'Monitoramento por satélite'],
    caca_predatoria: ['Patrulhamento noturno', 'Cercamento de áreas sensíveis', 'Educação ambiental']
  };
  
  return recommendations[conflictType] || [];
}
