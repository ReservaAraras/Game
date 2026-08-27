/**
 * @fileoverview Componente .gs do sistema Reserva Araras.
 * 
 * @module ReservaAraras
 * @description Utilitários matemáticos para cálculos do jogo.
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
 * - Utilitários matemáticos para cálculos do jogo.
 * - Operações CRUD na planilha do Google.
 * - Integração com os componentes HTML do frontend.
 * 
 * @methods
 * lerp(start, end, t) - Interpolação linear para animações e simulação gradual; clamp(value, min, max) - Garante que valores fiquem dentro de faixas definidas; getRandomInt(min, max) - Gera números aleatórios inteiros; getChance(denominator) - Calcula probabilidades.
 * 
 * @integrations
 * - Nenhum (Core Utility)
 * - Google Utilities (CacheService, LockService)
 */
