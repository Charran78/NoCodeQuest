/**
 * adventureOracle.js
 * NoCodeQuest 2.0 — Recopila el estado real del IDE sin depender de IA.
 */

const vscode = require('vscode');
const ComplexityMapper = require('./complexityMapper');

class AdventureOracle {
    constructor(questBoard) {
        this.questBoard = questBoard;
    }

    async collectIdeState({ gameState, lastChatMessage = null } = {}) {
        const editor = vscode.window.activeTextEditor
            || vscode.window.visibleTextEditors.find((candidate) => candidate?.document && !candidate.document.isUntitled)
            || null;
        const document = editor?.document;
        const workspaceFolder = document
            ? vscode.workspace.getWorkspaceFolder(document.uri)
            : vscode.workspace.workspaceFolders?.[0];

        const playerState = this.buildPlayerState(gameState);
        const diagnostics = this.collectDiagnostics();
        const modifiedFiles = this.collectModifiedFiles();
        const gitStatus = this.collectGitStatus(modifiedFiles.length);
        const quests = document ? this.questBoard.scanForQuests(document) : [];
        const ideState = {
            generated_at: new Date().toISOString(),
            workspace: {
                name: workspaceFolder?.name || null,
                path: workspaceFolder?.uri?.fsPath || null
            },
            active_file: document ? this.buildActiveFile(document) : null,
            modified_files: modifiedFiles,
            diagnostics,
            quests,
            git_status: gitStatus,
            last_chat_message: lastChatMessage,
            player_state: playerState
        };

        ideState.adventure_cards = this.generateAdventureCards(ideState);
        return ideState;
    }

    buildActiveFile(document) {
        return {
            name: this.getBaseName(document.fileName),
            path: document.fileName,
            language: document.languageId,
            line_count: document.lineCount,
            is_dirty: document.isDirty
        };
    }

    buildPlayerState(gameState) {
        const state = gameState?.getState?.() || {};
        const player = state.player || {};
        const lair = state.lair || {};
        const plant = ComplexityMapper.getPlantHealth(lair.technical_debt_level || 0);

        return {
            level: player.level || 1,
            exp: player.exp || 0,
            gold: player.gold || 0,
            equipped_weapon: player.equipped?.weapon || null,
            equipped_skin: player.equipped?.skin || null,
            coffee_potions: state.inventory?.potions?.pocion_cafe || 0,
            badges: state.badges || [],
            accepted_quests: state.acceptedQuests || [],
            plant_health: plant.health,
            technical_debt_level: lair.technical_debt_level || 0,
            last_potion_at: lair.lastPotionAt || null
        };
    }

    generateAdventureCards(ideState) {
        const cards = [];
        const player = ideState.player_state || {};
        const modifiedFiles = ideState.modified_files || [];
        const quests = ideState.quests || [];
        const criticalDiagnostics = (ideState.diagnostics || []).filter(d => d.severity === 'error');
        const acceptedQuestIds = new Set((player.accepted_quests || []).map(q => q.id));
        const availableQuests = quests.filter(q => !acceptedQuestIds.has(q.id));
        const hasCriticalWork = criticalDiagnostics.length > 0 || availableQuests.length > 0;
        const plantIsWithered = player.plant_health === 'marchita';
        const canBuyPotion = player.gold >= 30;
        const hasCoffeePotion = player.coffee_potions > 0;
        const potionCooldownMinutes = 15;
        const lastPotionAt = player.last_potion_at ? new Date(player.last_potion_at) : null;
        const now = new Date();
        const minutesSincePotion = lastPotionAt
            ? (now.getTime() - lastPotionAt.getTime()) / (1000 * 60)
            : Infinity;
        const canSuggestPotionAgain = minutesSincePotion >= potionCooldownMinutes;

        if (criticalDiagnostics.length > 0) {
            const error = criticalDiagnostics[0];
            cards.push(this.createCard({
                id: `attack-bug-${error.path || error.file}-${error.line}`,
                title: '⚔️ Cargar contra el Enemigo',
                description: `Jasper ha localizado una amenaza en ${error.file}, línea ${error.line}. El monstruo ruge: "${error.message}".`,
                action: 'attack_bug',
                reward: 'Eliminar un error crítico y ganar impulso en la aventura',
                risk: 'El conjuro podría requerir refactor o magia adicional',
                priority: 'critical',
                target: {
                    file: error.path,
                    line: error.line,
                    function_name: null
                }
            }));
        }

        if (availableQuests.length > 0) {
            const quest = availableQuests[0];
            cards.push(this.createCard({
                id: `accept-quest-${quest.id}`,
                title: '📜 Aceptar Misión Pendiente',
                description: `En ${quest.fileName}, línea ${quest.line + 1}, espera el encargo "${quest.description}". ¿Lo juramos ante la guild?`,
                action: 'accept_quest',
                reward: `+${quest.rewardExp} EXP, +${quest.rewardGold} Oro`,
                risk: 'Añades un compromiso más a la campaña actual',
                priority: 'high',
                target: {
                    file: quest.filePath || null,
                    line: typeof quest.line === 'number' ? quest.line + 1 : null,
                    function_name: null,
                    quest_id: quest.id
                }
            }));
        }

        if (hasCoffeePotion && (plantIsWithered || player.plant_health === 'pachucha') && canSuggestPotionAgain) {
            cards.push(this.createCard({
                id: 'use-coffee-potion',
                title: '☕ Beber Poción de Café',
                description: plantIsWithered
                    ? `La Planta de la Guarida está marchita y aún guardas ${player.coffee_potions} poción(es) de café. Beber una ahora mismo es la forma más rápida de aliviar el caos.`
                    : `Aún guardas ${player.coffee_potions} poción(es) de café. Una dosis podría darte aire antes de que la deuda técnica empeore.`,
                action: 'use_potion',
                reward: 'La planta respira mejor y el caos disminuye',
                risk: 'Gastas un consumible valioso',
                priority: plantIsWithered ? 'critical' : 'medium'
            }));
        }

        if (plantIsWithered && canBuyPotion) {
            cards.push(this.createCard({
                id: 'save-plant-at-market',
                title: '🛒 Salvar la Planta en el Mercado',
                description: 'La Planta de la Guarida está marchita. Tienes oro suficiente para comprar una Poción de Café en la Tienda del Gremio.',
                action: 'open_shop',
                reward: 'Posibilidad de restaurar la planta y preparar la siguiente incursión',
                risk: 'Gastarás oro que podrías reservar para armas o pergaminos',
                priority: 'critical'
            }));
        } else if (player.gold >= 500) {
            cards.push(this.createCard({
                id: 'visit-shop',
                title: '🛒 Visitar el Mercado del Gremio',
                description: `Tus bolsillos pesan ${player.gold} monedas. Es un buen momento para invertir en equipo, pociones o pergaminos.`,
                action: 'open_shop',
                reward: 'Mejor equipo y más opciones para la siguiente ronda',
                risk: 'Podrías gastar de más en plena campaña',
                priority: 'medium'
            }));
        }

        if (modifiedFiles.length > 0 && ideState.git_status?.unpushed_commits === 0) {
            cards.push(this.createCard({
                id: 'commit-changes',
                title: '🔒 Sellar Partida con un Commit',
                description: `Hay ${modifiedFiles.length} archivo(s) modificados sin sello reciente. Tal vez convenga fijar el progreso antes de seguir explorando.`,
                action: 'commit_changes',
                reward: '+50 EXP, +20 Oro',
                risk: 'Podrías consagrar cambios aún inmaduros',
                priority: hasCriticalWork ? 'low' : 'high'
            }));
        }

        if (cards.length === 0 && !hasCriticalWork && player.plant_health !== 'marchita' && player.gold < 500 && modifiedFiles.length === 0) {
            cards.push(this.createCard({
                id: 'survey-realm',
                title: '🌿 Continuar la Exploración',
                description: 'No hay errores críticos, ni misiones urgentes, ni cambios pendientes. Puedes seguir programando libremente hasta que el IDE revele una nueva oportunidad.',
                action: 'ignore',
                reward: 'Libertad total para seguir creando',
                risk: 'Ninguno',
                priority: 'optional'
            }));
        }

        return cards.slice(0, 5);
    }

    createCard({ id, title, description, action, reward, risk, priority, target = {} }) {
        return {
            id,
            title,
            description,
            action,
            target: {
                file: target.file || null,
                line: target.line || null,
                function_name: target.function_name || null,
                ...target
            },
            reward,
            risk,
            priority
        };
    }

    collectDiagnostics() {
        const allDiagnostics = vscode.languages.getDiagnostics();
        const normalized = [];

        for (const [uri, diagnostics] of allDiagnostics) {
            for (const diagnostic of diagnostics) {
                normalized.push({
                    file: this.getBaseName(uri.fsPath),
                    path: uri.fsPath,
                    line: diagnostic.range.start.line + 1,
                    severity: this.mapSeverity(diagnostic.severity),
                    message: diagnostic.message,
                    type: this.inferDiagnosticType(diagnostic.message)
                });
            }
        }

        return normalized.slice(0, 50);
    }

    collectModifiedFiles() {
        const repo = this.getPrimaryRepository();
        if (!repo) return [];

        const changes = [
            ...(repo.state?.workingTreeChanges || []),
            ...(repo.state?.indexChanges || []),
            ...(repo.state?.mergeChanges || []),
            ...(repo.state?.untrackedChanges || [])
        ];

        const deduped = new Map();
        for (const change of changes) {
            const fsPath = change.uri?.fsPath;
            if (!fsPath || deduped.has(fsPath)) continue;

            deduped.set(fsPath, {
                name: this.getBaseName(fsPath),
                path: fsPath,
                status: this.mapGitStatus(change.status)
            });
        }

        return Array.from(deduped.values());
    }

    collectGitStatus(modifiedFilesCount) {
        const repo = this.getPrimaryRepository();
        if (!repo) {
            return {
                available: false,
                modified: modifiedFilesCount,
                staged: 0,
                unpushed_commits: 0
            };
        }

        return {
            available: true,
            modified: (repo.state?.workingTreeChanges || []).length + (repo.state?.untrackedChanges || []).length,
            staged: (repo.state?.indexChanges || []).length,
            unpushed_commits: repo.state?.HEAD?.ahead || 0,
            branch: repo.state?.HEAD?.name || null
        };
    }

    getPrimaryRepository() {
        try {
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            if (!gitExtension) return null;

            const gitApi = gitExtension.getAPI(1);
            return gitApi?.repositories?.[0] || null;
        } catch (_) {
            return null;
        }
    }

    mapSeverity(severity) {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                return 'error';
            case vscode.DiagnosticSeverity.Warning:
                return 'warning';
            case vscode.DiagnosticSeverity.Information:
                return 'info';
            default:
                return 'hint';
        }
    }

    inferDiagnosticType(message) {
        const text = (message || '').toLowerCase();
        if (text.includes('syntax')) return 'SyntaxError';
        if (text.includes('null') || text.includes('undefined')) return 'NullPointer';
        if (text.includes('type')) return 'TypeError';
        if (text.includes('merge') || text.includes('conflict')) return 'MergeConflict';
        return 'Diagnostic';
    }

    mapGitStatus(status) {
        const lookup = {
            0: 'index-modified',
            1: 'index-added',
            2: 'index-deleted',
            3: 'index-renamed',
            4: 'index-copied',
            5: 'modified',
            6: 'deleted',
            7: 'untracked',
            8: 'ignored',
            9: 'intent-to-add',
            10: 'intent-to-rename',
            11: 'typechange',
            12: 'conflict'
        };

        return lookup[status] || 'changed';
    }

    getBaseName(filePath) {
        return filePath.split(/[\\/]/).pop();
    }
}

module.exports = AdventureOracle;
