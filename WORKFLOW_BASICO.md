# Workflow básico

Este documento organiza o caminho oficial de uma mudança: preparação,
verificação, inicialização, publicação, smoke test e registro de evidências.

## 1. Preparar o ambiente

Pré-requisitos: Node.js 18 ou superior, Python 3, `clasp` autenticado, projeto
Google Apps Script, planilha e pasta de assets de desenvolvimento. Copie
`.clasp.json.example` para `.clasp.json`, execute `clasp status`, configure
`SPREADSHEETS_ID` e, se necessário, `FOLDER_ID`. Mantenha tokens e segredos
fora do código-fonte.

## 2. Desenvolver e validar localmente

Faça uma alteração pequena e coesa. Ao mudar uma intervenção, confirme
backend, dashboard, persistência e contratos pedagógicos. Ao mudar chamadas do
frontend, confirme o endpoint e seu teste. Ao mudar arquitetura, métodos,
estratégias ou heurísticas, atualize o `../Relatorio.md` até
`npm run validate:report` passar. Execute:

```powershell
npm run verify
```

O critério de saída é zero testes com falha e diagnóstico concluído sem erro.

## 3. Inicializar no Apps Script

Use uma planilha de desenvolvimento ou homologação. Confirme os IDs, execute
`setupProject()`, confira as abas `Players`, `Sessions`, `Saves` e `Audit`, e
execute `runBackendMaturityCheck()`. Revise falhas críticas e não exponha dados
sensíveis nos logs.

## 4. Enviar e publicar

```powershell
npm run verify
clasp status
clasp push
clasp deployments
```

Revise projeto, identidade de execução, nível de acesso, descrição da versão,
rollback e registro externo do ID/URL da implantação.

## 5. Smoke test do ciclo principal

1. **Abrir a implantação:** login e interface carregam sem erro.
2. **Criar estudante de teste:** cadastro cria sessão e registro em `Players`.
3. **Registrar pergunta e hipótese:** o caderno libera a primeira intervenção.
4. **Alterar uma variável:** estado e indicadores antes/depois são atualizados.
5. **Tentar nova alteração imediatamente:** o sistema exige comparação e revisão.
6. **Registrar observação, explicação e próximo teste:** o ciclo é fechado.
7. **Salvar e recarregar:** estado, dashboard e trilha são preservados.
8. **Acessar atividade de outro estudante:** o backend nega o acesso.
9. **Sair e entrar novamente:** a sessão anterior termina e o novo login funciona.

O critério de saída é a aprovação de todas as etapas sem erro não tratado na
interface, no Apps Script ou na planilha.

## 6. Registrar evidências

Copie `evidence.example.json` para `evidence.json`, preencha apenas fatos
observados, datas UTC e identificadores não sensíveis, e execute:

```powershell
npm run maturity:evidence
```

`evidence.json` é local e não deve ser enviado ao Apps Script nem versionado.
Se algum gate falhar, não promova a implantação: registre a falha e mantenha a
versão anterior ativa até a correção.
