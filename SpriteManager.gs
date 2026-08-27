/**
 * @fileoverview Componente .gs do sistema Reserva Araras.
 * 
 * @module ReservaAraras
 * @description Gerenciamento de sprites e animações do jogo.
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
 * - Gerenciamento de sprites e animações do jogo.
 * - Operações CRUD na planilha do Google.
 * - Integração com os componentes HTML do frontend.
 * 
 * @methods
 * loadSpriteSheet(name) - Carrega texturas de fauna do Cerrado, maquinário e vegetação; animateTile(x, y, animationId) - Inicia uma sequência de frames em um tile; spawnFlyingObject(type) - Cria instâncias de drones de monitoramento ou pássaros.
 * 
 * @integrations
 * - TileEngine.gs, AudioController.gs
 * - Google Utilities (CacheService, LockService)
 */
