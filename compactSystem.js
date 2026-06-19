/**
 * compactSystem.js
 * Sistema /compact para NoCodeQuest
 * Genera el contexto estructurado que la extensión envía a Groq
 * 
 * Fase 1: Solo contexto del IDE (extensión es fuente de verdad)
 * Fase 2: Inyección opcional de contexto humano (relay desde chat externo)
 * Fase 3: Caché + diff para optimizar tokens
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CompactSystem {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.lastCompactHash = null;
        this.lastCompactTime = null;
        this.strategyPath = workspaceRoot 
            ? path.join(workspaceRoot, '.nocodequest', 'strategy.json')
            : null;
    }

    /**
     * Genera el /compact completo
     * @param {Object} params - Parámetros para generar el compact
     * @param {Object} params.ideState - Estado del IDE (de adventureOracle)
     * @param {Object} params.gameState - Estado del juego (inventoryManager)
     * @param {Array} params.chatTranscript - Historial del chat in-game
     * @param {Array} params.lastDecisions - Últimas decisiones del jugador
     * @param {boolean} params.includeHumanContext - Si incluir contexto humano del relay
     * @returns {Object} El /compact JSON estructurado
     */
    generateCompact(params) {
        const {
            ideState,
            gameState,
            chatTranscript = [],
            lastDecisions = [],
            includeHumanContext = false,
            uiState = null
        } = params;

        const playerState = gameState?.getState?.() || {};

        const compact = {
            _contract: 'NoCodeQuest /compact v1.0',
            _description: 'JSON estructurado que la extensión envía a Groq. Groq no accede al IDE. Solo procesa este resumen y devuelve sugerencias.',
            _generatedAt: new Date().toISOString(),
            _version: '1.0.0',

            // 1. Contexto del IDE (fuente de verdad de la extensión)
            ide_state: this._buildIdeState(ideState),

            // 2. Contexto del jugador
            player_state: this._buildPlayerState(playerState),

            // 3. Historial de decisiones
            last_decisions: this._buildLastDecisions(lastDecisions),

            // 4. Transcripción del chat in-game (no de este chat externo)
            chat_transcript: this._buildChatTranscript(chatTranscript),

            // 5. Restricciones para Jasper
            constraints: {
                _description: 'Reglas que Jasper debe seguir al responder.',
                max_suggestions: 3,
                max_frases: 2,
                tono: 'ironico, epico, sin autocomplacencia',
                idioma: 'español'
            }
        };

        if (uiState) {
            compact.ui_state = {
                _description: 'Estado de UI relevante para la conversación (ej. texto en pantalla).',
                ...uiState
            };
        }

        // 6. Contexto humano opcional (relay desde chat externo)
        if (includeHumanContext) {
            const humanContext = this._loadHumanContext();
            if (humanContext) {
                compact.human_context = humanContext;
            }
        }

        return compact;
    }

    /**
     * Calcula el hash del compact para caché (Fase 3)
     */
    calculateHash(compact) {
        const str = JSON.stringify(compact);
        return crypto.createHash('md5').update(str).digest('hex');
    }

    /**
     * Verifica si el compact ha cambiado significativamente (Fase 3)
     */
    hasChangedSignificantly(newCompact) {
        if (!this.lastCompactHash) return true;
        
        const newHash = this.calculateHash(newCompact);
        if (newHash === this.lastCompactHash) return false;
        
        // Fase 3: Aquí iría la lógica de diff para calcular cambio real
        // Por ahora, si el hash cambió, consideramos que hay cambio
        return true;
    }

    // ─── Builders privados ───────────────────────────────────────────────────

    _buildIdeState(ideState) {
        if (!ideState) return null;

        return {
            _description: 'Resumen del estado real del IDE. Lo genera adventureOracle.js.',
            active_file: ideState.active_file || null,
            diagnostics: {
                _description: 'Top 5 errores/warnings activos en el workspace.',
                errors: (ideState.diagnostics || [])
                    .filter(d => d.severity === 'error')
                    .slice(0, 5),
                warnings: (ideState.diagnostics || [])
                    .filter(d => d.severity === 'warning')
                    .slice(0, 5)
            },
            git_status: ideState.git_status || null,
            quests: {
                _description: 'Quests activas detectadas por questBoard.js.',
                active: ideState.quests || [],
                completed_recently: 0 // TODO: trackear en gameState
            },
            modified_files: (ideState.modified_files || []).slice(0, 20)
            ,
            adventure_cards: (ideState.adventure_cards || []).slice(0, 5)
        };
    }

    _buildPlayerState(playerState) {
        const player = playerState.player || {};
        const lair = playerState.lair || {};

        return {
            _description: 'Estado del jugador. Lo genera inventoryManager.js.',
            level: player.level || 1,
            exp: player.exp || 0,
            gold: player.gold || 0,
            equipped_weapon: player.equipped?.weapon || null,
            equipped_skin: player.equipped?.skin || null,
            coffee_potions: playerState.inventory?.potions?.pocion_cafe || 0,
            badges: playerState.badges || [],
            accepted_quests: playerState.acceptedQuests || [],
            plant_health: lair.technical_debt_level > 25 ? 'marchita' : 
                         lair.technical_debt_level > 12 ? 'pachucha' : 'saludable',
            technical_debt_level: lair.technical_debt_level || 0
        };
    }

    _buildLastDecisions(lastDecisions) {
        return {
            _description: 'Últimas 5 Cartas de Destino ejecutadas o ignoradas por el jugador.',
            history: (lastDecisions || []).slice(-5)
        };
    }

    _buildChatTranscript(chatTranscript) {
        return {
            _description: 'Últimos 3 turnos del chat in-game (solo si el usuario ha hablado con Jasper recientemente).',
            messages: (chatTranscript || []).slice(-3)
        };
    }

    _loadHumanContext() {
        if (!this.strategyPath || !fs.existsSync(this.strategyPath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(this.strategyPath, 'utf8');
            const strategy = JSON.parse(content);
            
            return {
                _description: 'Contexto humano inyectado desde chat externo (relay).',
                _injectedAt: strategy.injectedAt || new Date().toISOString(),
                _source: 'human_relay',
                strategic_priorities: strategy.priorities || [],
                active_focus: strategy.focus || null,
                notes: strategy.notes || null
            };
        } catch (err) {
            console.error('[CompactSystem] Error cargando contexto humano:', err.message);
            return null;
        }
    }
}

module.exports = CompactSystem;
