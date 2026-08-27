/**
 * @fileoverview Componente .gs do sistema Reserva Araras.
 * 
 * @module ReservaAraras
 * @description Controle de efeitos sonoros e música de fundo (sons da natureza).
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
 * - Controle de efeitos sonoros e música de fundo (sons da natureza).
 * - Operações CRUD na planilha do Google.
 * - Integração com os componentes HTML do frontend.
 * 
 * @methods
 * playSound(soundId) - Executa um efeito sonoro (ex: SOM_TRATOR, SOM_ARARA); stopAllSounds() - Pausa o áudio; updateBackgroundMusic(mood) - Altera a trilha de fundo (ex: violão e sons do cerrado).
 * 
 * @integrations
 * - SpriteManager.gs, DisasterManager.gs
 * - Google Utilities (CacheService, LockService)
 */
