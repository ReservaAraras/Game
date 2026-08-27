/**
 * Diretor de experiência de Reserva Araras.
 * Inspirado em ZQuestClassic (capítulos/estado), Unciv (decisões por rodada)
 * e GCompris (andaimes e evidência formativa). Funções puras e determinísticas.
 *
 * Estrutura de fases:
 *   Fase 1 — Exploração (cap. 1–2): decisão binária clara, estado generoso.
 *   Fase 2 — Tensão     (cap. 3–4): 3 opções com trade-offs reais.
 *   Fase 3 — Crise      (cap. 5–6): decisões encadeadas, estado pressionado.
 */
var EXPERIENCE_GAME_ = {
  id: "reserva-araras",
  title: "Reserva Araras",
  sharedResource: "integridade do Cerrado e justiça territorial",
  chapters: [
    // ── FASE 1 · Exploração ──────────────────────────────────────────────────
    { id: "diagnosticar", order: 1, phase: 1, constraint: null,
      title: "Vozes da vereda",
      situation: "Moradores, fauna e indicadores ambientais apresentam necessidades que não cabem em um único número isolado.",
      decisions: [
        { id: "mapear",    label: "Mapear atores, evidências ecológicas e incertezas", delta: { knowledge: 2, cooperation: 2, pressure: -1 } },
        { id: "maximizar", label: "Escolher o maior retorno econômico imediato",        delta: { knowledge: -1, cooperation: -2, pressure: 2 } }
      ]
    },
    { id: "corredor-ecologico", order: 2, phase: 1, constraint: null,
      title: "O voo das araras e a fragmentação",
      situation: "Um trecho de mata galeria conecta duas áreas de preservação fundamentais para a alimentação das aves.",
      decisions: [
        { id: "proteger-corredor", label: "Demarcar o corredor ecológico prioritário e envolver sitiantes", delta: { knowledge: 2, cooperation: 1, pressure: -1 } },
        { id: "cercar-unilateral", label: "Impor restrição sem diálogo com a comunidade rural vizinha",    delta: { knowledge: 0, cooperation: -2, pressure: 2 } }
      ]
    },

    // ── FASE 2 · Tensão ──────────────────────────────────────────────────────
    { id: "intervir", order: 3, phase: 2, constraint: "Período de seca: risco iminente de queimadas no entorno da reserva.",
      title: "Parcelas em transformação",
      situation: "O orçamento permite uma intervenção agroecológica reversível antes de comprometer toda a bacia hidrográfica.",
      decisions: [
        { id: "pilotar",  label: "Testar manejo agroflorestal em pequena escala e monitorar bofedais", delta: { knowledge: 2, cooperation: 1, pressure: -1 } },
        { id: "expandir", label: "Aplicar uma única técnica padronizada em todo o mapa",              delta: { knowledge: -1, cooperation: -1, pressure: 2 } },
        { id: "brigada",  label: "Formar brigada comunitária de prevenção e queima prescrita",        delta: { knowledge: 2, cooperation: 2, pressure: 0 } }
      ]
    },
    { id: "conflito-recursos", order: 4, phase: 2, constraint: "Vazão baixa do córrego: o uso para irrigação entra em atrito com o abastecimento da vila.",
      title: "O divisor de águas",
      situation: "A partilha da água da nascente exige critérios justos de equidade entre agricultura familiar e recomposição da flora.",
      decisions: [
        { id: "comite-bacia",  label: "Instituir comitê de usuários com regras sazonais transparentes", delta: { knowledge: 2, cooperation: 2, pressure: -1 } },
        { id: "priorizar-forte", label: "Atender prioritariamente quem tem maior capacidade de plantio",  delta: { knowledge: -1, cooperation: -2, pressure: 2 } },
        { id: "tecnologia-gota", label: "Subsidiar gotejamento de baixo custo para todos os produtores",  delta: { knowledge: 1, cooperation: 2, pressure: 0 } }
      ]
    },

    // ── FASE 3 · Crise ───────────────────────────────────────────────────────
    { id: "deliberar", order: 5, phase: 3, constraint: "Pressão imobiliária: proposta de loteamento nos limites da zona de amortecimento.",
      title: "Assembleia do território em encruzilhada",
      situation: "Os resultados de cinco anos trazem ganhos ecológicos, mas há propostas externas de alto impacto financeiro.",
      decisions: [
        { id: "negociar", label: "Comparar trade-offs, evidenciar impactos futuros e revisar o plano diretor", delta: { knowledge: 2, cooperation: 2, pressure: -1 } },
        { id: "ocultar",  label: "Mostrar apenas indicadores favoráveis para aprovar o projeto depressa",      delta: { knowledge: -2, cooperation: -2, pressure: 2 } },
        { id: "audiencia-ampla", label: "Convocar audiência pública descentralizada com laudos independentes", delta: { knowledge: 2, cooperation: 3, pressure: 0 } }
      ]
    },
    { id: "pacto-geracoes", order: 6, phase: 3, constraint: "Consenso vinculante: o termo de compromisso socioambiental vigorará por duas décadas.",
      title: "O pacto das veredas vivas",
      situation: "A comunidade assina o plano de gestão integrada da Reserva Araras, definindo o legado para as próximas gerações.",
      decisions: [
        { id: "pacto-coletivo",   label: "Instituir governança compartilhada com monitoramento contínuo da biodiversidade", delta: { knowledge: 2, cooperation: 2, pressure: -1 } },
        { id: "terceirizar-tudo",  label: "Entregar a gestão completa para consultoria externa privada",                    delta: { knowledge: -1, cooperation: -2, pressure: 1 } },
        { id: "escola-parque",     label: "Integrar a reserva como polo de educação ambiental e pesquisa escolar viva",     delta: { knowledge: 2, cooperation: 3, pressure: -1 } }
      ]
    },

    // ── FASE 4 · Santuário Vivo ──────────────────────────────────────────────────
    { id: "corredor-biodiversidade", order: 7, phase: 4, constraint: "Cooperação com o entorno: conectar a reserva às matas das fazendas e sítios vizinhos.",
      title: "O grande corredor ecológico",
      situation: "A equipe expande a proteção para além dos limites da reserva, articulando com fazendeiros o reflorestamento de bordas.",
      decisions: [
        { id: "pacto-produtores", label: "Oferecer mudas nativas e apoio técnico para implantação de agroflorestas vizinhas", delta: { knowledge: 2, cooperation: 3, pressure: -1 } },
        { id: "muros-isolamento", label: "Construir cercas de concreto e isolar completamente a reserva das comunidades do entorno", delta: { knowledge: -1, cooperation: -3, pressure: 2 } },
        { id: "monitoramento-fauna", label: "Instalar câmeras-armadilha e envolver os alunos na contagem e catalogação das espécies", delta: { knowledge: 2, cooperation: 2, pressure: 0 } }
      ]
    },
    { id: "patrimonio-futuro", order: 8, phase: 4, constraint: "Perenidade institucional: transformar a Reserva Araras em parque-escola perpétuo.",
      title: "O santuário das futuras gerações",
      situation: "A reserva é tombada como patrimônio ecológico e científico com governança aberta liderada pelos estudantes.",
      decisions: [
        { id: "parque-escola-aberto", label: "Estabelecer trilhas ecológicas monitoradas e programas de pesquisa científica escolar", delta: { knowledge: 2, cooperation: 3, pressure: -1 } },
        { id: "exploracao-predatoria", label: "Vender lotes da reserva para especulação imobiliária sob pretexto de gerar renda", delta: { knowledge: -2, cooperation: -4, pressure: 3 } },
        { id: "banco-germoplasma", label: "Criar viveiro de árvores raras do Cerrado para recuperação de áreas degradadas", delta: { knowledge: 2, cooperation: 2, pressure: -1 } }
      ]
    }
  ]
};

function experienceClamp_(value) {
  return Math.max(0, Math.min(10, Number(value) || 0));
}

function getExperienceChapter(chapterId, year) {
  var chapter = EXPERIENCE_GAME_.chapters.filter(function (item) {
    return item.id === String(chapterId || '');
  })[0] || EXPERIENCE_GAME_.chapters[0];
  var schoolYear = Math.max(1, Math.min(5, Number(year) || 3));
  var phaseLabels = { 1: 'Exploração', 2: 'Tensão', 3: 'Crise', 4: 'Santuário Vivo' };
  return {
    success: true,
    data: {
      gameId:         EXPERIENCE_GAME_.id,
      title:          chapter.title,
      situation:      chapter.situation,
      sharedResource: EXPERIENCE_GAME_.sharedResource,
      phase:          chapter.phase,
      phaseLabel:     phaseLabels[chapter.phase] || 'Exploração',
      constraint:     chapter.constraint || null,
      totalChapters:  EXPERIENCE_GAME_.chapters.length,
      decisions: chapter.decisions.map(function (item) { return { id: item.id, label: item.label }; }),
      cycle: {
        prediction:  schoolYear <= 2 ? 'Desenhe ou conte o que você acha que vai acontecer.' : 'Registre sua previsão e a evidência que pretende observar.',
        observation: 'O que mudou depois da escolha? Use um dado, sinal ou acontecimento do jogo.',
        explanation: 'Como a decisão contribuiu para esse resultado?',
        revision:    'O que o grupo manteria ou mudaria na próxima rodada?'
      },
      support: schoolYear <= 2 ? 'Leitura em voz alta, ícones e resposta oral.' : 'Tabela comparativa, pausa e papéis cooperativos.'
    }
  };
}

function resolveExperienceDecision(state, chapterId, decisionId, evidence) {
  var chapter = EXPERIENCE_GAME_.chapters.filter(function (item) {
    return item.id === String(chapterId || '');
  })[0] || EXPERIENCE_GAME_.chapters[0];
  var decision = chapter.decisions.filter(function (item) {
    return item.id === String(decisionId || '');
  })[0];
  if (!decision) return { success: false, error: 'Escolha não reconhecida para este capítulo.' };
  var current = state || {};
  var next = {
    chapter:     Math.min(EXPERIENCE_GAME_.chapters.length, (Number(current.chapter) || chapter.order) + 1),
    knowledge:   experienceClamp_((Number(current.knowledge)   || 5) + decision.delta.knowledge),
    cooperation: experienceClamp_((Number(current.cooperation) || 5) + decision.delta.cooperation),
    pressure:    experienceClamp_((Number(current.pressure)    || 2) + decision.delta.pressure)
  };
  var balance = next.knowledge + next.cooperation - next.pressure;
  return {
    success:   true,
    gameId:    EXPERIENCE_GAME_.id,
    choice:    { id: decision.id, label: decision.label },
    phase:     chapter.phase,
    previousState: {
      knowledge:   experienceClamp_(Number(current.knowledge)   || 5),
      cooperation: experienceClamp_(Number(current.cooperation) || 5),
      pressure:    experienceClamp_(Number(current.pressure)    || 2)
    },
    nextState:   next,
    consequence: balance >= 8
      ? 'A decisão assegurou a integridade das veredas e fortaleceu a justiça territorial no Cerrado.'
      : balance >= 4
      ? 'A deliberação encontrou um equilíbrio provisório que exige acompanhamento sistemático dos acordos.'
      : 'A decisão gerou tensões distributivas que demandam mediação socioambiental transparente.',
    evidence:    String(evidence || '').trim().substring(0, 420),
    reflection:  getExperienceChapter(chapterId, 3).data.cycle.revision,
    complete:    chapter.order >= EXPERIENCE_GAME_.chapters.length
  };
}

/**
 * Calcula o desfecho final com base no estado acumulado de Reserva Araras.
 */
function getExperienceEndgame(state) {
  var s = state || {};
  var k = experienceClamp_(Number(s.knowledge)   || 5);
  var c = experienceClamp_(Number(s.cooperation) || 5);
  var p = experienceClamp_(Number(s.pressure)    || 2);
  var balance = k + c - p;
  var route, title, summary, recommendation;
  if (balance >= 10) {
    route          = 'equilibrado';
    title          = 'Cerrado Vivo e Resiliente';
    summary        = 'A comunidade protegeu a biodiversidade, garantiu a sustentabilidade hídrica e consolidou a gestão compartilhada da reserva.';
    recommendation = 'Apresente o caso de sucesso da Reserva Araras no encontro de unidades de conservação.';
  } else if (p >= 7) {
    route          = 'sobrecarga';
    title          = 'Território em Risco de Degradação';
    summary        = 'As pressões de curto prazo sobrepuseram-se aos limites ecológicos, colocando espécies ameaçadas em vulnerabilidade.';
    recommendation = 'Reestruture o comitê de bacia para rever as concessões de uso dos recursos naturais.';
  } else {
    route          = 'fragmentado';
    title          = 'Mosaico de Interesses Conflitantes';
    summary        = 'Houve êxito em ações pontuais, mas a visão territorial integrada ainda não foi plenamente assimilada por todos os setores.';
    recommendation = 'Incentive oficinas de mediação de conflitos entre produtores rurais e ambientalistas.';
  }
  return {
    success:        true,
    gameId:         EXPERIENCE_GAME_.id,
    route:          route,
    title:          title,
    summary:        summary,
    recommendation: recommendation,
    finalState:     { knowledge: k, cooperation: c, pressure: p, balance: balance }
  };
}

/**
 * Workflow mínimo compartilhado: orientar → prever → decidir → observar →
 * refletir. O estado retornado é serializável e pode ser salvo pelo cliente.
 */
function getExperienceBasicWorkflow(year) {
  var first = EXPERIENCE_GAME_.chapters[0];
  return {
    success: true,
    data: {
      gameId:    EXPERIENCE_GAME_.id,
      title:     EXPERIENCE_GAME_.title,
      chapterId: first.id,
      stage:     'briefing',
      stages:    ['briefing', 'prediction', 'decision', 'observation', 'reflection'],
      briefing:  getExperienceChapter(first.id, year).data,
      state:     { chapter: 1, knowledge: 5, cooperation: 5, pressure: 2 },
      complete:  false
    }
  };
}

function advanceExperienceBasicWorkflow(workflow, input, year) {
  var current = workflow && workflow.data ? workflow.data : workflow;
  if (!current || current.gameId !== EXPERIENCE_GAME_.id) {
    current = getExperienceBasicWorkflow(year).data;
  }
  var payload = input || {};
  var stages  = ['briefing', 'prediction', 'decision', 'observation', 'reflection'];
  var stage   = current.stage || 'briefing';
  var chapter = EXPERIENCE_GAME_.chapters.filter(function (item) {
    return item.id === String(current.chapterId || '');
  })[0] || EXPERIENCE_GAME_.chapters[0];

  // Verificação de pré-requisito na transição entre fases
  if (stage === 'briefing' && chapter.phase > 1) {
    var prevIdx     = chapter.order - 2;
    var prevChapter = prevIdx >= 0 ? EXPERIENCE_GAME_.chapters[prevIdx] : null;
    if (prevChapter && prevChapter.phase < chapter.phase &&
        (Number((current.state || {}).knowledge) || 5) < 3) {
      return {
        success:     true,
        needsReview: true,
        message:     'O conselho precisa aprofundar o diagnóstico da fase anterior antes de deliberar novas ações territoriais.',
        data:        current
      };
    }
  }

  var next = {
    gameId:      EXPERIENCE_GAME_.id,
    title:       EXPERIENCE_GAME_.title,
    chapterId:   chapter.id,
    stage:       stage,
    stages:      stages.slice(),
    briefing:    getExperienceChapter(chapter.id, year).data,
    state:       current.state || { chapter: chapter.order, knowledge: 5, cooperation: 5, pressure: 2 },
    prediction:  String(current.prediction  || ''),
    observation: String(current.observation || ''),
    reflection:  String(current.reflection  || ''),
    lastResult:  current.lastResult || null,
    complete:    false
  };

  if (stage === 'briefing') {
    next.stage = 'prediction';
  } else if (stage === 'prediction') {
    next.prediction = String(payload.text || payload.prediction || '').trim().substring(0, 420);
    if (!next.prediction) return { success: false, error: 'Registre uma previsão antes de decidir.', data: next };
    next.stage = 'decision';
  } else if (stage === 'decision') {
    var result = resolveExperienceDecision(next.state, chapter.id, payload.decisionId, payload.evidence);
    if (!result.success) return { success: false, error: result.error, data: next };
    next.state      = result.nextState;
    next.lastResult = result;
    next.stage      = 'observation';
  } else if (stage === 'observation') {
    next.observation = String(payload.text || payload.observation || '').trim().substring(0, 420);
    if (!next.observation) return { success: false, error: 'Registre uma evidência observada.', data: next };
    next.stage = 'reflection';
  } else {
    next.reflection = String(payload.text || payload.reflection || '').trim().substring(0, 420);
    if (!next.reflection) return { success: false, error: 'Registre o que manter ou revisar.', data: next };
    var nextChapter = EXPERIENCE_GAME_.chapters[chapter.order];
    if (!nextChapter) {
      next.complete = true;
      next.stage    = 'complete';
      next.endgame  = getExperienceEndgame(next.state);
    } else {
      next.chapterId   = nextChapter.id;
      next.stage       = 'briefing';
      next.briefing    = getExperienceChapter(nextChapter.id, year).data;
      next.prediction  = '';
      next.observation = '';
      next.reflection  = '';
    }
  }
  return { success: true, data: next };
}

