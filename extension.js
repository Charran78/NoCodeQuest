/**
 * extension.js
 * NoCodeQuest — Núcleo de la extensión
 * El puente entre el IDE y la aventura gráfica
 */

const vscode   = require('vscode');
const path     = require('path');
const crypto   = require('crypto');

const InventoryManager  = require('./inventoryManager');
const QuestBoard        = require('./questBoard');
const ComplexityMapper  = require('./complexityMapper');
const BossManager       = require('./bossManager');
const AdventureOracle   = require('./adventureOracle');
const { fetchNarration } = require('./narrationEngine');

// ─── Utilidades ───────────────────────────────────────────────────────────────

function getNonce() {
    return crypto.randomBytes(16).toString('hex');
}

function getConfig(key) {
    return vscode.workspace.getConfiguration('nocodequest').get(key);
}

// ─── Función de activación principal ─────────────────────────────────────────

function activate(context) {
    console.log('[NoCodeQuest] ⚔️  La aventura comienza...');

    // Módulos del juego
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
    let gameState       = new InventoryManager(workspaceRoot);
    const questBoard    = new QuestBoard();
    const complexityMapper = new ComplexityMapper();
    const bossManager   = new BossManager();
    const adventureOracle = new AdventureOracle(questBoard);

    // Estado de la sesión
    let currentPanel        = undefined;
    let currentActiveQuests = [];
    let lastErrorCount      = 0;
    let lastChatMessage     = null;

    async function refreshAdventureCards(panel = currentPanel) {
        if (!panel) return;
        const ideState = await adventureOracle.collectIdeState({
            gameState,
            lastChatMessage
        });
        sendToPanel(panel, 'showAdventureCards', {
            cards: ideState.adventure_cards || []
        });
    }

    function dismissAdventureCard(cardId, panel = currentPanel) {
        if (!cardId) return;
        sendToPanel(panel, 'removeAdventureCard', { cardId });
    }

    function getPrimaryRepository() {
        try {
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            if (!gitExtension) return null;
            const gitApi = gitExtension.getAPI(1);
            return gitApi?.repositories?.[0] || null;
        } catch (_) {
            return null;
        }
    }

    async function revealTargetLocation(target) {
        if (!target?.file) return false;

        try {
            const doc = await vscode.workspace.openTextDocument(target.file);
            const editor = await vscode.window.showTextDocument(doc, {
                preview: false,
                viewColumn: vscode.ViewColumn.One
            });

            const line = Math.max(0, (target.line || 1) - 1);
            const pos = new vscode.Position(line, 0);
            const range = new vscode.Range(pos, pos);
            editor.selection = new vscode.Selection(pos, pos);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            return true;
        } catch (err) {
            vscode.window.showErrorMessage('No pude abrir el pergamino objetivo: ' + err.message);
            return false;
        }
    }

    async function generateCommitMessage(apiKey, model, narrationEnabled) {
        const modifiedFiles = adventureOracle.collectModifiedFiles();
        const modifiedCount = modifiedFiles.length;
        const modifiedNames = modifiedFiles
            .slice(0, 4)
            .map(file => file.name || path.basename(file.path || 'archivo'))
            .join(', ');
        const context = `Cambios listos para sellar: ${modifiedCount} archivo(s) modificados en ${workspaceRoot || 'el reino actual'}. Pergaminos afectados: ${modifiedNames || 'sin nombre legible'}.`;

        if (narrationEnabled && apiKey) {
            const generated = await fetchNarration(
                context,
                'commit-message',
                gameState.getState(),
                apiKey,
                model
            );
            return sanitizeCommitMessage(generated);
        }

        return 'sello real antes de nueva incursión';
    }

    async function requestCommitPreview(panel, narrationEnabled, apiKey, model, sourceCardId = null) {
        const repo = getPrimaryRepository();
        if (!repo) {
            sendToPanel(panel, 'speak', {
                text: '📚 No encuentro un repositorio del reino. El sello real deberá esperar.'
            });
            return;
        }

        const changedEntries = [
            ...(repo.state?.workingTreeChanges || []),
            ...(repo.state?.indexChanges || []),
            ...(repo.state?.untrackedChanges || []),
            ...(repo.state?.mergeChanges || [])
        ];

        if (!changedEntries.length) {
            sendToPanel(panel, 'speak', {
                text: '🌿 No hay cambios que sellar. Las crónicas ya están en calma.'
            });
            return;
        }

        const suggestedMessage = await generateCommitMessage(apiKey, model, narrationEnabled);
        sendToPanel(panel, 'showCommitModal', {
            suggestedMessage,
            cardId: sourceCardId,
            changedFiles: changedEntries.slice(0, 6).map(change => path.basename(change.uri?.fsPath || 'archivo'))
        });
    }

    function sanitizeCommitMessage(text) {
        const compact = String(text || '')
            .replace(/[\r\n]+/g, ' ')
            .replace(/["'`]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/[^\w\s\-:áéíóúÁÉÍÓÚñÑ]/g, '');

        if (!compact) return 'sello real antes de nueva incursión';
        return compact.slice(0, 60).trim();
    }

    async function executeCommitAction(panel, narrationEnabled, apiKey, model, options = {}) {
        const card = options.card || null;
        const overrideMessage = options.overrideMessage || '';
        const repo = getPrimaryRepository();
        if (!repo) {
            sendToPanel(panel, 'speak', {
                text: '📚 No encuentro un repositorio del reino. El sello real deberá esperar.'
            });
            return;
        }

        const hasChanges = (repo.state?.workingTreeChanges || []).length
            || (repo.state?.indexChanges || []).length
            || (repo.state?.untrackedChanges || []).length
            || (repo.state?.mergeChanges || []).length;

        if (!hasChanges) {
            sendToPanel(panel, 'speak', {
                text: '🌿 No hay cambios que sellar. Las crónicas ya están en calma.'
            });
            return;
        }

        const commitMessage = overrideMessage
            ? sanitizeCommitMessage(overrideMessage)
            : await generateCommitMessage(apiKey, model, narrationEnabled);

        try {
            await repo.commit(commitMessage, { all: true });
            gameState.recordAdventureEvent({
                type: 'commit',
                title: 'Sello Real Forjado',
                description: commitMessage,
                sourceCardId: card?.id || null
            });
            sendToPanel(panel, 'speak', {
                text: `🔒 Jasper ha dictado el sello: "${commitMessage}". Las crónicas del repositorio han sido actualizadas.`
            });
            dismissAdventureCard(card?.id, panel);
            sendToPanel(panel, 'hideCommitModal', {});
            await refreshAdventureCards(panel);
        } catch (err) {
            sendToPanel(panel, 'speak', {
                text: '❌ El sello real ha fallado: ' + err.message
            });
        }
    }

    async function acceptQuestById(questId, panel, sourceCardId = null) {
        const quest = currentActiveQuests.find(q => q.id === questId);

        if (!quest) {
            sendToPanel(panel, 'speak', {
                text: '📜 La misión ya no figura en el tablón o ha cambiado de forma.'
            });
            return;
        }

        const accepted = gameState.acceptQuest(quest);
        if (!accepted.success) {
            sendToPanel(panel, 'speak', { text: accepted.message });
            return;
        }

        await revealTargetLocation({
            file: quest.filePath,
            line: quest.line + 1
        });
        sendToPanel(panel, 'openSideTab', { tab: 'quests' });
        dismissAdventureCard(sourceCardId, panel);
        sendToPanel(panel, 'syncInventory', { state: gameState.getState() });
        sendToPanel(panel, 'refreshQuestBoard', { quests: currentActiveQuests });
        sendToPanel(panel, 'speak', {
            text: `📜 Juras completar "${quest.title}". La misión ha sido añadida a la crónica de aventuras.`
        });
        await refreshAdventureCards(panel);
    }

    async function acceptQuestFromCard(card, panel) {
        const target = card?.target || {};
        await acceptQuestById(target.quest_id, panel, card.id);
    }

    async function consumeCoffeePotion(panel, narrationEnabled, apiKey, model, sourceCardId = null) {
        const potion = gameState.useCoffeePotion();
        if (potion.success) {
            let narration = '';
            if (narrationEnabled) {
                narration = await fetchNarration(
                    `Caos reducido a ${potion.newChaos}. Planta: ${potion.newHealth}`,
                    'use-potion',
                    gameState.getState(),
                    apiKey, model
                );
            }
            sendToPanel(panel, 'potionResult', {
                chaos:    potion.newChaos,
                health:   potion.newHealth,
                narration,
                state:    gameState.getState()
            });
            dismissAdventureCard(sourceCardId, panel);
            await refreshAdventureCards(panel);
        } else {
            sendToPanel(panel, 'speak', { text: potion.message });
        }
    }

    async function handleAdventureCardSelection(card, panel, narrationEnabled, apiKey, model) {
        if (!card?.action) return;

        switch (card.action) {
            case 'use_potion':
                await consumeCoffeePotion(panel, narrationEnabled, apiKey, model, card.id);
                break;

            case 'open_shop':
                dismissAdventureCard(card.id, panel);
                sendToPanel(panel, 'openSideTab', { tab: 'shop' });
                sendToPanel(panel, 'speak', {
                    text: '🛒 Jasper señala el Mercado del Gremio. Elige con cuidado qué reliquia comprar.'
                });
                break;

            case 'commit_changes':
                await requestCommitPreview(panel, narrationEnabled, apiKey, model, card.id);
                break;

            case 'accept_quest':
                await acceptQuestFromCard(card, panel);
                break;

            case 'attack_bug':
                sendToPanel(panel, 'focusAdventureCard', { cardId: card.id });
                if (await revealTargetLocation(card.target)) {
                    sendToPanel(panel, 'speak', {
                        text: '⚔️ El enemigo ha sido localizado en su guarida. Ya tienes abierto el archivo y la línea exacta del combate.'
                    });
                }
                break;

            default:
                sendToPanel(panel, 'speak', {
                    text: '🌿 Esta senda aún no tiene ritual completo, pero ya ha quedado señalada en las crónicas.'
                });
                break;
        }
    }

    // ── Comando: Iniciar Aventura ─────────────────────────────────────────────
    const startCommand = vscode.commands.registerCommand('nocodequest.start', () => {
        if (currentPanel) {
            currentPanel.reveal(vscode.ViewColumn.Two);
            return;
        }

        currentPanel = vscode.window.createWebviewPanel(
            'nocodequestEngine',
            '⚔️ NoCodeQuest',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media')
                ]
            }
        );

        currentPanel.webview.html = getWebviewContent(
            currentPanel.webview,
            context.extensionUri
        );

        // Sincronización inicial tras cargar Phaser (delay de 1.2s)
        setTimeout(() => {
            sendToPanel(currentPanel, 'syncInventory', { state: gameState.getState() });
            sendToPanel(currentPanel, 'updateVisualSkins', {
                weapon: gameState.getPlayer().equipped.weapon,
                skin:   gameState.getPlayer().equipped.skin
            });
            refreshAdventureCards(currentPanel);
        }, 1200);

        // ── Receptor de mensajes del WebView ─────────────────────────────────
        currentPanel.webview.onDidReceiveMessage(
            async (message) => {
                const apiKey = getConfig('groqApiKey') || '';
                const model  = getConfig('groqModel')  || 'llama-3.1-8b-instant';
                const narrationEnabled = getConfig('enableNarration') !== false;

                switch (message.command) {

                    // ─ Ataque con arma equipada ───────────────────────────────
                    case 'executeWeaponStrike': {
                        const combatLog = await gameState.useWeaponEffect();
                        const result    = gameState.earnReward(
                            Math.round(10 * gameState.getExpMultiplier()),
                            10,
                            'Ataque con arma'
                        );
                        gameState.recordBugDefeated();
                        gameState.recordAdventureEvent({
                            type: 'bug-defeated',
                            title: 'Bug derrotado en combate directo',
                            description: combatLog,
                            rewardExp: result.expGained,
                            rewardGold: result.goldGained
                        });

                        let narration = '';
                        if (narrationEnabled) {
                            narration = await fetchNarration(
                                `El héroe ha usado su ${gameState.getPlayer().equipped.weapon}.`,
                                'post-combat',
                                gameState.getState(),
                                apiKey, model
                            );
                        }

                        sendToPanel(currentPanel, 'combatResult', {
                            log: combatLog,
                            narration,
                            reward: result,
                            state: gameState.getState()
                        });

                        if (result.leveledUp) {
                            triggerLevelUp(currentPanel, result, apiKey, model, gameState, narrationEnabled);
                        }
                        break;
                    }

                    // ─ Solicitud de narración manual ─────────────────────────
                    case 'requestNarration': {
                        lastChatMessage = {
                            role: 'user',
                            content: message.errorContext || ''
                        };
                        if (!narrationEnabled) break;
                        const text = await fetchNarration(
                            message.errorContext,
                            message.context || 'combat',
                            gameState.getState(),
                            apiKey, model
                        );
                        sendToPanel(currentPanel, 'speak', { text });
                        break;
                    }

                    case 'chatMessage': {
                        const userText = String(message.text || '').trim();
                        if (!userText) break;
                        lastChatMessage = {
                            role: 'user',
                            content: userText
                        };
                        const text = await fetchNarration(
                            userText,
                            'chat',
                            gameState.getState(),
                            apiKey,
                            model
                        );
                        sendToPanel(currentPanel, 'chatResponse', {
                            userText,
                            text
                        });
                        sendToPanel(currentPanel, 'speak', { text });
                        await refreshAdventureCards(currentPanel);
                        break;
                    }

                    // ─ Compra en la tienda ────────────────────────────────────
                    case 'purchaseItem': {
                        const trade = gameState.buyItem(message.itemId, message.price);
                        if (trade.success) {
                            let narration = '';
                            if (narrationEnabled) {
                                narration = await fetchNarration(
                                    `${message.itemId} por ${message.price} monedas`,
                                    'shop-purchase',
                                    gameState.getState(),
                                    apiKey, model
                                );
                            }
                            sendToPanel(currentPanel, 'purchaseResult', {
                                success: true,
                                narration,
                                state: gameState.getState()
                            });
                            await refreshAdventureCards(currentPanel);
                        } else {
                            sendToPanel(currentPanel, 'speak', { text: trade.message });
                        }
                        break;
                    }

                    // ─ Equipar objeto ─────────────────────────────────────────
                    case 'equipItemRequest': {
                        const equip = gameState.equipItem(message.itemId, message.slotType);
                        if (equip.success) {
                            let narration = '';
                            if (narrationEnabled) {
                                narration = await fetchNarration(
                                    `${message.itemId} (ranura: ${message.slotType})`,
                                    'equip-item',
                                    gameState.getState(),
                                    apiKey, model
                                );
                            }
                            sendToPanel(currentPanel, 'equipResult', {
                                success: true,
                                narration,
                                weapon: gameState.getPlayer().equipped.weapon,
                                skin:   gameState.getPlayer().equipped.skin,
                                state:  gameState.getState()
                            });
                            await refreshAdventureCards(currentPanel);
                        } else {
                            sendToPanel(currentPanel, 'speak', { text: equip.message });
                        }
                        break;
                    }

                    // ─ Tomar Poción de Café ───────────────────────────────────
                    case 'consumeCoffeeRequest': {
                        await consumeCoffeePotion(currentPanel, narrationEnabled, apiKey, model);
                        break;
                    }

                    // ─ Selección de Carta de Destino ──────────────────────────
                    case 'cardSelected': {
                        await handleAdventureCardSelection(
                            message.card,
                            currentPanel,
                            narrationEnabled,
                            apiKey,
                            model
                        );
                        break;
                    }

                    case 'acceptQuestRequest': {
                        await acceptQuestById(message.questId, currentPanel);
                        break;
                    }

                    case 'commitChangesRequest': {
                        await requestCommitPreview(currentPanel, narrationEnabled, apiKey, model);
                        break;
                    }

                    case 'confirmCommitRequest': {
                        await executeCommitAction(currentPanel, narrationEnabled, apiKey, model, {
                            overrideMessage: message.commitMessage || '',
                            card: message.cardId ? { id: message.cardId } : null
                        });
                        break;
                    }

                    // ─ Usar Pergamino de Estabilidad (git reset) ─────────────
                    case 'triggerScrollEffect': {
                        const scroll = gameState.useScroll(message.scroll);
                        if (scroll.success) {
                            if (message.scroll === 'pergamino_estabilidad') {
                                const term = vscode.window.activeTerminal
                                    || vscode.window.createTerminal('⚔️ NoCodeQuest');
                                term.sendText('git reset --hard HEAD');
                                sendToPanel(currentPanel, 'speak', {
                                    text: '📜 ¡El Pergamino de la Estabilidad ha sido desatado! El tiempo retrocede al último sello real seguro.'
                                });
                            }
                            sendToPanel(currentPanel, 'syncInventory', { state: gameState.getState() });
                            await refreshAdventureCards(currentPanel);
                        } else {
                            sendToPanel(currentPanel, 'speak', { text: scroll.message || '❌ No quedan pergaminos.' });
                        }
                        break;
                    }

                    // ─ Exportar captura de hazañas ────────────────────────────
                    case 'saveAchievementImage': {
                        try {
                            const buf = Buffer.from(message.base64Data.split(',')[1], 'base64');
                            const defaultName = String(message.fileName || 'gesta_nocodequest.png')
                                .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
                            const defaultPath = workspaceRoot
                                ? path.join(workspaceRoot, defaultName)
                                : path.join(require('os').homedir(), defaultName);

                            const saveUri = await vscode.window.showSaveDialog({
                                defaultUri: vscode.Uri.file(defaultPath),
                                filters: { 'PNG Image': ['png'] }
                            });

                            if (saveUri) {
                                await vscode.workspace.fs.writeFile(saveUri, buf);
                                vscode.window.showInformationMessage(
                                    '📸 ¡Cédula de Hazaña sellada en los pergaminos del reino!'
                                );
                                if (narrationEnabled) {
                                    const n = await fetchNarration(
                                        'El héroe ha inmortalizado sus hazañas para las plazas del reino.',
                                        'share-achievement',
                                        gameState.getState(), apiKey, model
                                    );
                                    sendToPanel(currentPanel, 'speak', { text: n });
                                }
                            }
                        } catch (err) {
                            vscode.window.showErrorMessage('El tintero real se ha derramado: ' + err.message);
                        }
                        break;
                    }
                }
            },
            undefined,
            context.subscriptions
        );

        // ── Listeners del IDE ─────────────────────────────────────────────────

        // 1. Diagnósticos: errores = monstruos
        const diagnosticListener = vscode.languages.onDidChangeDiagnostics(async () => {
            if (!currentPanel) return;
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;

            const diags  = vscode.languages.getDiagnostics(editor.document.uri);
            const errors = diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error);

            if (errors.length > 0) {
                const primaryError = errors[0];
                sendToPanel(currentPanel, 'spawnMonster', {
                    details: {
                        message: primaryError.message,
                        line:    primaryError.range.start.line
                    }
                });

                // Solo narra si es un error nuevo (evita spam)
                if (errors.length !== lastErrorCount) {
                    const apiKey = getConfig('groqApiKey') || '';
                    const model  = getConfig('groqModel')  || 'llama-3.1-8b-instant';
                    if (getConfig('enableNarration') !== false) {
                        const narration = await fetchNarration(
                            primaryError.message,
                            'combat',
                            gameState.getState(),
                            apiKey, model
                        );
                        sendToPanel(currentPanel, 'speak', { text: narration });
                    }
                }
                lastErrorCount = errors.length;
                await refreshAdventureCards(currentPanel);

            } else if (lastErrorCount > 0) {
                // Victoria: todos los errores resueltos
                lastErrorCount = 0;
                const result = gameState.earnReward(15, 10, 'Bug derrotado');
                gameState.recordBugDefeated();
                gameState.recordAdventureEvent({
                    type: 'bug-defeated',
                    title: 'Bug disipado',
                    description: 'Todos los errores activos del archivo fueron purificados.',
                    rewardExp: result.expGained,
                    rewardGold: result.goldGained
                });

                sendToPanel(currentPanel, 'victory', { state: gameState.getState() });

                if (result.leveledUp) {
                    const apiKey = getConfig('groqApiKey') || '';
                    const model  = getConfig('groqModel')  || 'llama-3.1-8b-instant';
                    triggerLevelUp(currentPanel, result, apiKey, model, gameState, getConfig('enableNarration') !== false);
                }
                await refreshAdventureCards(currentPanel);
            }
        });

        // 2. Al guardar: análisis de complejidad + quests
        const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
            if (!currentPanel) return;

            // Análisis de complejidad → Planta de la Guarida
            const analysis = await complexityMapper.analyzeActiveDocument();
            if (analysis.fileName) {
                gameState.getLair().technical_debt_level = analysis.totalChaos;
                gameState.saveGame();

                const { health, color, emoji } = ComplexityMapper.getPlantHealth(analysis.totalChaos);
                sendToPanel(currentPanel, 'updateLairStatus', {
                    chaos: analysis.totalChaos, health, color, emoji,
                    fileName: analysis.fileName
                });

                // Jasper celebra el código limpio
                if (analysis.totalChaos < 10 && analysis.functionsAnalyzed > 0) {
                    const apiKey = getConfig('groqApiKey') || '';
                    const model  = getConfig('groqModel')  || 'llama-3.1-8b-instant';
                    if (getConfig('enableNarration') !== false) {
                        const n = await fetchNarration(
                            `${analysis.fileName} con ${analysis.functionsAnalyzed} conjuros limpios`,
                            'clean-code', gameState.getState(), apiKey, model
                        );
                        sendToPanel(currentPanel, 'speak', { text: n });
                    }
                }
            }

            // Quests: re-escanea misiones activas
            const updatedQuests = questBoard.scanForQuests(document);
            const completed = questBoard.detectCompletedQuests(currentActiveQuests, updatedQuests);

            for (const quest of completed) {
                const result = gameState.earnReward(quest.rewardExp, quest.rewardGold, quest.description);
                gameState.recordQuestCompleted();
                gameState.recordAdventureEvent({
                    type: 'quest-completed',
                    title: quest.title,
                    description: quest.description,
                    rewardExp: quest.rewardExp,
                    rewardGold: quest.rewardGold,
                    targetFile: quest.filePath || quest.fileName || null,
                    targetLine: quest.line
                });

                const apiKey = getConfig('groqApiKey') || '';
                const model  = getConfig('groqModel')  || 'llama-3.1-8b-instant';
                let narration = '';
                if (getConfig('enableNarration') !== false) {
                    narration = await fetchNarration(quest.description, 'quest-completed',
                        gameState.getState(), apiKey, model);
                }
                sendToPanel(currentPanel, 'questCompleted', {
                    quest, narration, reward: result, state: gameState.getState()
                });

                if (result.leveledUp) {
                    triggerLevelUp(currentPanel, result, apiKey, model, gameState, true);
                }
            }

            currentActiveQuests = updatedQuests;
            sendToPanel(currentPanel, 'refreshQuestBoard', { quests: currentActiveQuests });
            await refreshAdventureCards(currentPanel);
        });

        // 3. Cambio de editor: actualiza quest board + detecta merge conflicts
        const editorListener = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (!editor || !currentPanel) return;

            // Quest board
            currentActiveQuests = questBoard.scanForQuests(editor.document);
            sendToPanel(currentPanel, 'refreshQuestBoard', { quests: currentActiveQuests });

            // Boss fight: merge conflicts
            const conflicts = bossManager.countMergeConflicts(editor.document);
            const fileName  = editor.document.fileName.split(/[\\/]/).pop();

            if (conflicts > 0 && !bossManager.isBossFightActive) {
                bossManager.startBossFight(conflicts, fileName);
                sendToPanel(currentPanel, 'spawnBossDragon', { heads: conflicts, fileName });

                const apiKey = getConfig('groqApiKey') || '';
                const model  = getConfig('groqModel')  || 'llama-3.1-8b-instant';
                if (getConfig('enableNarration') !== false) {
                    const n = await fetchNarration(
                        `Dragón de Merge Conflict con ${conflicts} cabezas en ${fileName}`,
                        'boss-spawn', gameState.getState(), apiKey, model
                    );
                    sendToPanel(currentPanel, 'speak', { text: n });
                }
            }
            await refreshAdventureCards(currentPanel);
        });

        // 4. Cambios en texto: actualiza boss HP en tiempo real
        const textChangeListener = vscode.workspace.onDidChangeTextDocument(async (event) => {
            if (!currentPanel || !bossManager.isBossFightActive) return;
            const editor = vscode.window.activeTextEditor;
            if (!editor || event.document !== editor.document) return;

            const conflicts = bossManager.countMergeConflicts(editor.document);
            const bossDefeated = bossManager.updateBossHeads(conflicts);

            if (bossDefeated) {
                const loot = bossManager.getBossLoot(1);
                const result = gameState.earnReward(loot.exp, loot.gold, 'Dragón del Merge derrotado');
                gameState.recordBossDefeated();
                gameState.recordAdventureEvent({
                    type: 'boss-defeated',
                    title: 'Dragón del Merge Derrotado',
                    description: 'Las cabezas del conflicto fueron reducidas a ceniza.',
                    rewardExp: loot.exp,
                    rewardGold: loot.gold
                });
                if (!gameState.getState().badges.includes(loot.badge)) {
                    gameState.getState().badges.push(loot.badge);
                    gameState.saveGame();
                }

                sendToPanel(currentPanel, 'bossDefeated', { state: gameState.getState() });

                const apiKey = getConfig('groqApiKey') || '';
                const model  = getConfig('groqModel')  || 'llama-3.1-8b-instant';
                if (getConfig('enableNarration') !== false) {
                    const n = await fetchNarration(
                        'El aventurero purificó todos los conflictos de merge. +300 EXP, +150 Oro.',
                        'boss-victory', gameState.getState(), apiKey, model
                    );
                    sendToPanel(currentPanel, 'speak', { text: n });
                }

                if (result.leveledUp) {
                    triggerLevelUp(currentPanel, result, apiKey, model, gameState, true);
                }
            } else if (conflicts > 0) {
                sendToPanel(currentPanel, 'damageBoss', { headsLeft: conflicts });
            }
            await refreshAdventureCards(currentPanel);
        });

        // 5. Git: recompensa por commits
        gameState.setupGitHooks(async () => {
            if (!currentPanel) return;
            const result = gameState.earnReward(50, 20, 'Git Commit — Sello Real');
            gameState.recordCommit();

            sendToPanel(currentPanel, 'syncInventory', { state: gameState.getState() });

            const apiKey = getConfig('groqApiKey') || '';
            const model  = getConfig('groqModel')  || 'llama-3.1-8b-instant';
            if (getConfig('enableNarration') !== false) {
                const n = await fetchNarration(
                    'El aventurero ha sellado su partida con un Commit glorioso. +50 EXP, +20 Oro.',
                    'commit-celebration', gameState.getState(), apiKey, model
                );
                sendToPanel(currentPanel, 'speak', { text: `🔒 SELLO REAL: Commit registrado en las crónicas.\n${n}` });
            }

            if (result.leveledUp) {
                triggerLevelUp(currentPanel, result, apiKey, model, gameState, true);
            }
            await refreshAdventureCards(currentPanel);
        });

        // ── Limpieza al cerrar el panel ───────────────────────────────────────
        currentPanel.onDidDispose(() => {
            currentPanel = undefined;
            bossManager.reset();
        }, null, context.subscriptions);

        context.subscriptions.push(
            diagnosticListener, saveListener, editorListener, textChangeListener
        );
    });

    // ── Comando: Ver Perfil ───────────────────────────────────────────────────
    const profileCommand = vscode.commands.registerCommand('nocodequest.showProfile', () => {
        const p = gameState.getPlayer();
        const s = gameState.getState().stats;
        vscode.window.showInformationMessage(
            `⚔️ ${p.name} | Nv.${p.level} ${gameState.getCurrentRank()} | ` +
            `🪙${p.gold} | 💀Bugs:${s.bugsDefeated} | 📜Quests:${s.questsCompleted} | ` +
            `🐉Dragones:${s.bossesDefeated}`
        );
    });

    const inspectIdeStateCommand = vscode.commands.registerCommand('nocodequest.inspectIdeState', async () => {
        const ideState = await adventureOracle.collectIdeState({
            gameState,
            lastChatMessage
        });

        const doc = await vscode.workspace.openTextDocument({
            language: 'json',
            content: JSON.stringify(ideState, null, 2)
        });

        await vscode.window.showTextDocument(doc, {
            preview: false,
            viewColumn: vscode.ViewColumn.One
        });
    });

    context.subscriptions.push(startCommand, profileCommand, inspectIdeStateCommand);
}

// ─── Helper: enviar mensaje al panel ─────────────────────────────────────────
function sendToPanel(panel, command, data = {}) {
    panel?.webview.postMessage({ command, ...data });
}

// ─── Helper: secuencia de subida de nivel ────────────────────────────────────
async function triggerLevelUp(panel, result, apiKey, model, gameState, narrationEnabled) {
    sendToPanel(panel, 'levelUpVisual', {
        level: result.currentLevel,
        rank:  result.rankTitle
    });

    if (narrationEnabled) {
        const n = await fetchNarration(
            `¡El héroe ha alcanzado el nivel ${result.currentLevel}! Rango: ${result.rankTitle}.`,
            'level-up', gameState.getState(), apiKey, model
        );
        sendToPanel(panel, 'speak', { text: n });
    }

    sendToPanel(panel, 'syncInventory', { state: gameState.getState() });
}

// ─── Generador del HTML del WebView ──────────────────────────────────────────
function getWebviewContent(webview, extensionUri) {
    const nonce = getNonce();

    const heroUri    = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'hero.png'));
    const bugUri     = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'bug.png'));
    const dungeonUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'dungeon.png'));
    const phaserUri  = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'phaser.min.js'));

    const csp = [
        `default-src 'none'`,
        `img-src ${webview.cspSource} https: data:`,
        `script-src 'nonce-${nonce}' ${webview.cspSource}`,
        `style-src 'unsafe-inline'`,
        `font-src https://fonts.gstatic.com`,
        `connect-src ${webview.cspSource} https: https://api.groq.com http://127.0.0.1:7777`
    ].join('; ');

    return getPanelHtml(nonce, csp, heroUri, bugUri, dungeonUri, phaserUri);
}

// ─── HTML del panel (importado desde webview/panel.js) ───────────────────────
function getPanelHtml(nonce, csp, heroUri, bugUri, dungeonUri, phaserUri) {
    // El HTML completo se genera aquí para tener acceso a las URIs de los assets
    return require('./webview/panel')(nonce, csp, heroUri.toString(), bugUri.toString(), dungeonUri.toString(), phaserUri.toString());
}

function deactivate() {
    console.log('[NoCodeQuest] La aventura termina... hasta la próxima sesión.');
}

module.exports = { activate, deactivate };
