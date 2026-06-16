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

    // Estado de la sesión
    let currentPanel        = undefined;
    let currentActiveQuests = [];
    let lastErrorCount      = 0;

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
                        } else {
                            sendToPanel(currentPanel, 'speak', { text: equip.message });
                        }
                        break;
                    }

                    // ─ Tomar Poción de Café ───────────────────────────────────
                    case 'consumeCoffeeRequest': {
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
                            sendToPanel(currentPanel, 'potionResult', {
                                chaos:    potion.newChaos,
                                health:   potion.newHealth,
                                narration,
                                state:    gameState.getState()
                            });
                        } else {
                            sendToPanel(currentPanel, 'speak', { text: potion.message });
                        }
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
                        } else {
                            sendToPanel(currentPanel, 'speak', { text: scroll.message || '❌ No quedan pergaminos.' });
                        }
                        break;
                    }

                    // ─ Exportar captura de hazañas ────────────────────────────
                    case 'saveAchievementImage': {
                        try {
                            const buf = Buffer.from(message.base64Data.split(',')[1], 'base64');
                            const defaultPath = workspaceRoot
                                ? path.join(workspaceRoot, 'gesta_nocodequest.png')
                                : path.join(require('os').homedir(), 'gesta_nocodequest.png');

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

            } else if (lastErrorCount > 0) {
                // Victoria: todos los errores resueltos
                lastErrorCount = 0;
                const result = gameState.earnReward(15, 10, 'Bug derrotado');
                gameState.recordBugDefeated();

                sendToPanel(currentPanel, 'victory', { state: gameState.getState() });

                if (result.leveledUp) {
                    const apiKey = getConfig('groqApiKey') || '';
                    const model  = getConfig('groqModel')  || 'llama-3.1-8b-instant';
                    triggerLevelUp(currentPanel, result, apiKey, model, gameState, getConfig('enableNarration') !== false);
                }
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

                // Jaskier celebra el código limpio
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
                    'post-combat', gameState.getState(), apiKey, model
                );
                sendToPanel(currentPanel, 'speak', { text: `🔒 SELLO REAL: Commit registrado en las crónicas.\n${n}` });
            }

            if (result.leveledUp) {
                triggerLevelUp(currentPanel, result, apiKey, model, gameState, true);
            }
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

    context.subscriptions.push(startCommand, profileCommand);
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

    const csp = [
        `default-src 'none'`,
        `img-src ${webview.cspSource} https: data:`,
        `script-src 'nonce-${nonce}' https://cdn.jsdelivr.net`,
        `style-src 'unsafe-inline'`,
        `font-src https://fonts.gstatic.com`,
        `connect-src ${webview.cspSource} https: https://api.groq.com`
    ].join('; ');

    return getPanelHtml(nonce, csp, heroUri, bugUri, dungeonUri);
}

// ─── HTML del panel (importado desde webview/panel.js) ───────────────────────
function getPanelHtml(nonce, csp, heroUri, bugUri, dungeonUri) {
    // El HTML completo se genera aquí para tener acceso a las URIs de los assets
    return require('./webview/panel')(nonce, csp, heroUri.toString(), bugUri.toString(), dungeonUri.toString());
}

function deactivate() {
    console.log('[NoCodeQuest] La aventura termina... hasta la próxima sesión.');
}

module.exports = { activate, deactivate };
