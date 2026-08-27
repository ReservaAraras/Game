/**
 * @fileoverview Componente .gs do sistema Reserva Araras.
 * 
 * @module ReservaAraras
 * @description Simulação de escoamento de produção e fluxo viário sustentável.
 * Este script faz parte da arquitetura principal do jogo Reserva Araras 
 * rodando em Google Apps Script. Ele interage com o Google Sheets centralizado (SPREADSHEETS_ID) 
 * e aplica regras de autorização com base na conta Google autenticada.
 * Foco em sustentabilidade realista: agrofloresta, sequestro de carbono, bioconstrução e desafios 
 * ambientais do nordeste goiano (Parque de Terra Ronca).
 * 
 * @author Manus AI
 * @license SPDX-License-Identifier: MIT
 * @version 1.0.0
 * 
 * @functionality
 * - Simulação de escoamento de produção e fluxo viário sustentável.
 * - Operações CRUD na planilha do Google.
 * - Integração com os componentes HTML do frontend.
 * 
 * @methods
 * analyzeLogisticaFluxo() - Rastreia o fluxo de veículos entre fazendas e a BR-135/GO-432; detectGargalo() - Identifica estradas com trânsito pesado; updateDensidadeLogistica() - Atualiza o mapa de calor de tráfego.
 * 
 * @integrations
 * - TileEngine.gs, ZoneManager.gs, PollutionSystem.gs
 * - Google Utilities (CacheService, LockService)
 */
