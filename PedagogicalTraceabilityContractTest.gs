/** Teste manual: execute no editor do Apps Script. */
function runPedagogicalTraceabilityContractTest() {
  var tiles = Array.apply(null, Array(48)).map(function (_, index) {
    return { type: [11, 19, 27, 35].indexOf(index) >= 0 ? 'water' : 'native' };
  });
  var trace = PedagogicalTraceabilityService.buildTrace({
    budget: 48200,
    tiles: tiles,
    journal: {
      question: 'Como proteger a água?',
      hypothesis: 'Mais proteção perto da água aumentará a conservação.',
      baseline: { conservation: 92, carbon: 120, production: 0, budget: 50000 },
      explanation: 'A conservação permaneceu estável neste teste.',
      nextStep: 'Alterar uma parcela e comparar.',
      records: []
    }
  });
  if (trace.completeness.score !== 5) throw new Error('Completude pedagógica inesperada.');
  if (trace.evidence.current.conservation !== 100) throw new Error('Métrica determinística inesperada.');
  if (!trace.modelWarning) throw new Error('Aviso de limites do modelo ausente.');
  return { ok: true, completeness: trace.completeness, metrics: trace.evidence.current };
}

