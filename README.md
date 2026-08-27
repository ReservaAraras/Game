# Reserva Araras — Web App para Google Apps Script

MVP de investigação socioambiental para os anos iniciais do Ensino Fundamental em Google Apps Script. O frontend oferece autenticação de estudante, mapa territorial interativo, indicadores de orçamento/conservação/carbono/produção, caderno de investigação, atividades salvas e biblioteca de assets do Google Drive.

## Comece aqui

Execute `npm run verify` antes de enviar qualquer alteração. O ciclo oficial de
configuração, desenvolvimento, publicação, smoke test e registro de evidências
está em [WORKFLOW_BASICO.md](WORKFLOW_BASICO.md).

## Incremento de maturidade — 2026-08-14

O laboratório agora aplica ciclos experimentais fechados. Cada intervenção cria uma pendência de revisão e uma segunda variável só pode ser alterada depois que o estudante registra observação, explicação e próximo teste. A regra existe tanto na interface quanto no backend.

Ao fechar uma comparação, o sistema guarda uma versão estruturada com hipótese, indicadores antes/depois, parcela, intervenção, custo e revisão. O histórico permanece no estado salvo e a trilha pedagógica conserva a última evidência concluída mesmo quando uma nova rodada ainda não começou.

## Objetivo pedagógico

Desenvolver pensamento sistêmico e argumentação baseada em evidências ao investigar como conservação, produção e cuidado com a água interagem em um modelo simplificado do Cerrado.

O ciclo didático principal segue uma decisão recorrente na frota: **pergunta → hipótese → intervenção → evidência → explicação → revisão**. O estudante registra uma previsão, modifica uma variável, compara indicadores antes/depois e propõe o próximo teste. O resultado do simulador não é nota e não deve ser apresentado como recomendação ambiental real.

### Evidências formativas

- hipótese registrada antes da intervenção;
- comparação quantitativa entre duas versões;
- explicação que relacione escolha, indicador e consequência;
- revisão controlando uma variável por vez;
- reconhecimento do que o modelo não representa.

A articulação curricular é indicativa para Ciências, Geografia, Matemática e Língua Portuguesa. A habilidade da BNCC deve ser selecionada pela professora ou pelo professor conforme o ano, o recorte e o planejamento da turma.

## Arquitetura efetiva

- `index.html`, `style.html`, `login.html` e `script.html`: interface executada pelo `HtmlService`.
- `Code.gs`: entrada `doGet`, composição dos parciais e inicialização.
- `ConfigManager.gs`: leitura de `SPREADSHEETS_ID` e `FOLDER_ID` nas propriedades do script.
- `SchemaService.gs` e `DatabaseConnector.gs`: acesso centralizado à planilha e CRUD.
- `alert_modal.html`, `budget_panel.html`, `mapa_renderer.html`, `notification_toast.html` e `eval_panel.html`: componentes HTML aprimorados, independentes e acessíveis, com APIs DOM locais; ainda não são montados automaticamente no fluxo principal.
- `AuthService.gs`, `SessionManager.gs` e `SecurityUtils.gs`: cadastro, login e sessão.
- `FazendaDataController.gs`: contrato autenticado da simulação; cria o estado inicial, valida intervenções e devolve ao frontend o estado e o dashboard recalculados.
- `SaveLoadManager.gs`: CRUD dos estados do jogo.
- `AssetService.gs`: inventário e carregamento sob demanda de assets da pasta do Drive.
- `PedagogicalTraceabilityService.gs`: valida o estado na fronteira do backend e produz uma trilha anônima entre hipótese, evidência, explicação e revisão.
- `PedagogicalTraceabilityContractTest.gs`: teste manual leve do contrato pedagógico e das métricas determinísticas.
- `AgroforestalController.gs`, `BudgetController.gs`, `CarbonSequestration.gs`, `EconomyEngine.gs` e `EvaluationEngine.gs`: serviços de domínio determinísticos, sem persistência, para normalização de parcelas e cálculos didáticos de produtividade, orçamento, carbono, economia e avaliação.
- `TutorialSystem.gs`, `TooltipManager.gs`, `AchievementSystem.gs`, `NotificationService.gs` e `UIRenderer.gs`: contratos opcionais para tutorial, dicas, marcos formativos, mensagens e view-models da interface. Usam sessão/cache e não criam novas abas.
- `BackendMaturity.gs`: diagnóstico read-only executável no Apps Script, com probes de configuração, esquema, cache, locks, contrato pedagógico, serviços centrais e riscos aceitos.
- `FrontendMaturity.gs`: diagnóstico de maturidade e intuitividade por snapshot técnico sanitizado; mede fluxo, clareza, recuperação, acessibilidade, responsividade e orientação pedagógica sem armazenar texto ou comportamento do estudante.

Os demais arquivos `.gs` e `.html` do rascunho original permanecem como documentação de módulos planejados. `BudgetController.gs` e `EvaluationEngine.gs` agora alimentam o dashboard ativo por meio de `UIRenderer.gs`; as intervenções, custos e linhas de base passam por `FazendaDataController.gs` antes de chegar à tela. Os componentes HTML independentes continuam fora do grafo principal para evitar duplicar o mapa, os modais e as notificações já existentes em `index.html` e `script.html`.

Esta versão adota um recorte intencional das padronizações da frota: validação no backend, persistência com autoria por sessão, auditoria mínima, rastreabilidade pedagógica determinística, linguagem não classificatória, mediação docente e explicitação dos limites do modelo. Não foram adicionadas IA generativa nem ranking; o diagnóstico de maturidade é uma ferramenta operacional para a equipe, não uma funcionalidade pedagógica para estudantes.

## Configuração no Apps Script

1. Crie uma Planilha Google e copie o ID entre `/d/` e `/edit` na URL.
2. Crie uma pasta no Google Drive para os assets e copie seu ID.
3. Crie um projeto em [script.google.com](https://script.google.com). Para usar o `clasp`, copie `.clasp.json.example` para `.clasp.json`, substitua o `scriptId` pelo ID real do projeto e execute `clasp status` antes de `clasp push`.
4. Em **Configurações do projeto → Propriedades do script**, crie:

   - `SPREADSHEETS_ID`: ID da planilha central.
   - `FOLDER_ID`: ID da pasta de assets.

5. No editor, execute `setupProject()` uma vez e aceite as permissões para Planilhas e Drive.
6. Opcionalmente, execute `runBackendMaturityCheck()` para obter o diagnóstico do backend no runtime.
7. Confira se foram criadas as abas `Players`, `Sessions`, `Saves` e `Audit`.
8. Em **Implantar → Nova implantação → App da Web**, execute como o proprietário e conceda acesso ao público desejado.

### Teste controlado via clasp

Com o `.clasp.json` configurado, valide e envie o projeto com:

```powershell
clasp status
clasp push
clasp deployments
```

Depois do `push`, execute no editor ou na implantação de teste `setupProject()`, faça cadastro/login, aplique uma intervenção, salve e carregue uma atividade. Registre uma implantação versionada somente após esse fluxo passar. O arquivo `.claspignore` exclui documentação e ferramentas Python do upload, mas mantém os `.gs`, `index.html`, `style.html`, `login.html` e `script.html` necessários ao Web App.

O `.clasp.json` real contém o ID do projeto e não deve ser compartilhado em commits públicos. O valor de `SPREADSHEETS_ID`, `FOLDER_ID` e demais propriedades continua sendo configurado nas propriedades do Apps Script, não no arquivo de deploy.

Para medir o frontend, use `getFrontendMaturity(token, snapshot)` após um fluxo de teste. O snapshot aceita apenas indicadores técnicos, como `completedActions`, `taskCompleted`, `errorCount`, `keyboardNavigation`, `visibleFocus`, `viewportWidth` e `overflowDetected`; campos de texto livre são descartados.

Integrações externas são opcionais. Para habilitá-las, configure `EXTERNAL_API_ALLOWLIST` com URLs-base HTTPS separadas por vírgula e, para o webhook `doPost`, configure também `WEBHOOK_SECRET` nas propriedades do script. Sem esses valores, as integrações permanecem bloqueadas.

O `FOLDER_ID` pode ficar vazio enquanto não houver assets; a biblioteca aparecerá vazia. `SPREADSHEETS_ID` é obrigatório.

## Diagnóstico de maturidade

Execute `python project_maturity.py` para avaliar a implementação local. A versão 2 separa o score bruto do estágio efetivo: código consistente pode alcançar **Pré-produção**, mas testes automatizados, runtime, deploy, credenciais e validação com participantes continuam limitando o estágio operacional.

Evidências externas expiram após 30 dias e podem ser fornecidas com `--evidence arquivo.json`:

```json
{
  "runtime_verified": {
    "passed": true,
    "verified_at": "2026-08-04T12:00:00Z",
    "checks": ["setup", "authentication", "simulation_action", "save_load"]
  },
  "deployment_verified": {
    "passed": true,
    "verified_at": "2026-08-04T12:00:00Z",
    "deployment_id": "ID_DA_IMPLANTACAO",
    "url_checked": true
  },
  "user_validation": {
    "passed": true,
    "verified_at": "2026-08-04T12:00:00Z",
    "participants": 3,
    "scenarios": ["login", "intervenção", "save/load"]
  }
}
```

## Modelo de dados

| Aba | Finalidade |
|---|---|
| `Players` | Estudantes, credencial em texto plano no campo compatível, perfil e status. |
| `Sessions` | Tokens temporários de sessão com validade de 12 horas. |
| `Saves` | Estado JSON do mapa, pertencente ao jogador. |
| `Audit` | Cadastro, login, salvamento e exclusão. |

Todos os dados criados, lidos, alterados ou excluídos pelo jogo passam pelo Google Sheets. O frontend nunca recebe `SPREADSHEETS_ID`, `FOLDER_ID` nem senhas armazenadas.

## Assets

Formatos aceitos: `svg`, `png`, `jpg`, `jpeg`, `webp`, `gif`, `glb`, `gltf`, `mp3`, `ogg`, `wav` e `json`.

- O manifesto lista somente arquivos diretamente dentro da pasta configurada.
- Cada arquivo é validado novamente antes do carregamento.
- O limite por arquivo neste MVP é 8 MB, adequado ao transporte via `google.script.run` em Base64.
- Imagens e áudios têm pré-visualização. Arquivos GLB/GLTF ficam disponíveis para download e integração futura com um renderizador WebGL.
- Para arquivos grandes, prefira publicar uma URL com controle de acesso próprio em vez de Base64.

## Credenciais

Por decisão operacional da frota, novas contas usam texto plano no campo compatível `passwordHash` e deixam `passwordSalt` vazio; o campo `password` só é reconhecido durante uma migração controlada. Esta exceção é adequada apenas ao quiosque escolar supervisionado e exige acesso restrito à planilha. Execute `migrateReservaArarasPasswords()` antes de disponibilizar o aplicativo a usuários externos.

Mesmo neste modo, o backend:

- não envia senhas de volta ao navegador;
- associa saves ao `playerId` da sessão;
- impede que um jogador leia ou exclua saves de outro;
- valida a pasta de origem dos assets;
- neutraliza entradas que poderiam virar fórmulas na planilha;
- usa `LockService` nas operações concorrentes.

## Fluxo de uso

1. O estudante cria um acesso ou entra com mediação docente.
2. Abre o **Caderno de investigação** e registra pergunta e hipótese.
3. Seleciona uma intervenção e altera uma parcela; a primeira ação captura a linha de base.
4. Compara indicadores, explica o resultado e propõe um próximo teste.
5. **Salvar atividade** cria ou atualiza um registro na aba `Saves` e registra apenas a completude da trilha na auditoria.
6. **Abrir atividades** permite ler ou excluir somente os registros do estudante atual.
7. **Biblioteca** lê assets da pasta configurada no Drive sob demanda.

## Roteiro docente e inclusão

O roteiro embutido recomenda leitura coletiva do mapa, vocabulário visual, mudança de uma variável por vez e discussão sobre limites da simulação. A interface combina texto, forma e cor, tem foco de teclado visível, não impõe tempo e preserva o trabalho cooperativo. Para crianças em alfabetização, a professora ou o professor pode registrar as respostas ditadas pelo grupo.

## Limites do MVP

- A simulação não avança ciclos automaticamente.
- GLB/GLTF ainda não são renderizados em 3D.
- Os módulos temáticos (`ZoneManager.gs`, `DisasterManager.gs`, `PopulationSystem.gs`,
  `PollutionSystem.gs`, `CrimeSystem.gs` e `TimeManager.gs`) são executáveis e
  persistem por `FarmStateAdapter.gs`, mas ainda são serviços complementares:
  não estão ligados a controles da interface principal.
- A exclusão de um save remove a linha correspondente da planilha; a auditoria preserva o evento, não o conteúdo excluído.
