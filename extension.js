/**
 * extension.js
 * NoCodeQuest — Núcleo de la extensión
 * El puente entre el IDE y la aventura gráfica
 */

const vscode   = require('vscode');
const path     = require('path');
const crypto   = require('crypto');
const http     = require('http');
const fs       = require('fs');

const InventoryManager  = require('./inventoryManager');
const QuestBoard        = require('./questBoard');
const ComplexityMapper  = require('./complexityMapper');
const BossManager       = require('./bossManager');
const AdventureOracle   = require('./adventureOracle');
const { fetchNarration, fetchNarrationDetailed } = require('./narrationEngine');
const CompactSystem     = require('./compactSystem');

const BUILD_STAMP = 'H-2026-06-19-rt7';
const panelRuntimeMirrors = new WeakMap();

function buildRuntimeBootstrap(gameState, quests = []) {
    const state = gameState?.getState?.() || null;
    return {
        state,
        quests: quests || [],
        cards: [],
        ideSummary: null,
        visualSkins: {
            weapon: state?.player?.equipped?.weapon || null,
            skin: state?.player?.equipped?.skin || null
        },
        speechText: 'Jasper afina su laud mientras el reino despierta...'
    };
}

function readRuntimeMirrorSpeech(workspaceRoot) {
    if (!workspaceRoot) return '';
    try {
        const filePath = path.join(workspaceRoot, '.nocodequest', 'webview-runtime.json');
        if (!fs.existsSync(filePath)) return '';
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        const speech = parsed?.bootstrap?.speechText;
        return speech ? String(speech) : '';
    } catch (_) {
        return '';
    }
}

function buildNextStepSpeech(ideState) {
    const diagnostics = Array.isArray(ideState?.diagnostics) ? ideState.diagnostics : [];
    const errors = diagnostics.filter((entry) => entry.severity === 'error');
    if (errors.length) {
        const topError = errors[0];
        return '🧭 Siguiente paso: revisar ' + (topError.file || 'el archivo activo') + ' en línea ' + (topError.line || '?') + ' por ' + (topError.message || 'un error activo');
    }

    const quests = Array.isArray(ideState?.quests) ? ideState.quests : [];
    if (quests.length) {
        const quest = quests[0];
        return '🧭 Siguiente paso: aceptar la misión pendiente en ' + (quest.fileName || 'el IDE');
    }

    const modifiedFiles = Array.isArray(ideState?.modified_files) ? ideState.modified_files : [];
    if (modifiedFiles.length) {
        return '🧭 Siguiente paso: revisar ' + modifiedFiles.length + ' archivo(s) modificado(s) antes de sellar commit.';
    }

    const cards = Array.isArray(ideState?.adventure_cards) ? ideState.adventure_cards : [];
    const top = cards[0];
    if (!top?.title) return '🧭 Siguiente paso: abre Destino y elige una carta.';
    return '🧭 Siguiente paso: ' + String(top.title);
}

function syncRuntimeBootstrapFromEvent(bootstrap, command, data = {}) {
    if (!bootstrap || !command) return;

    switch (command) {
        case 'syncInventory':
            bootstrap.state = data.state || null;
            break;
        case 'refreshQuestBoard':
            bootstrap.quests = data.quests || [];
            break;
        case 'showAdventureCards':
            bootstrap.cards = data.cards || [];
            break;
        case 'syncIdeSummary':
            bootstrap.ideSummary = data.summary || null;
            break;
        case 'updateVisualSkins':
            bootstrap.visualSkins = {
                weapon: data.weapon || null,
                skin: data.skin || null
            };
            break;
        case 'speak':
            bootstrap.speechText = data.text || bootstrap.speechText || '';
            break;
        case 'combatResult':
        case 'purchaseResult':
        case 'equipResult':
        case 'potionResult':
        case 'questCompleted':
        case 'bossDefeated':
        case 'victory':
            if (data.state) bootstrap.state = data.state;
            if (data.narration) bootstrap.speechText = data.narration;
            break;
        default:
            break;
    }
}

function flushRuntimeMirror(panel) {
    const mirror = panel && panelRuntimeMirrors.get(panel);
    if (!mirror?.filePath) return;

    try {
        fs.mkdirSync(path.dirname(mirror.filePath), { recursive: true });
        fs.writeFileSync(
            mirror.filePath,
            JSON.stringify({
                buildStamp: BUILD_STAMP,
                seq: mirror.seq,
                bootstrap: mirror.bootstrap,
                events: mirror.events
            }, null, 2),
            'utf8'
        );
    } catch (error) {
        reportExtensionDebug('E', 'extension.js:runtime-mirror', 'runtime mirror flush failed', {
            message: error?.message || String(error),
            filePath: mirror.filePath
        });
    }
}

function registerRuntimeMirror(panel, filePath, bootstrap) {
    if (!panel || !filePath) return;
    panelRuntimeMirrors.set(panel, {
        filePath,
        seq: 0,
        bootstrap: bootstrap || buildRuntimeBootstrap(null, []),
        events: []
    });
    flushRuntimeMirror(panel);
}

function mirrorPanelEvent(panel, command, data = {}) {
    const mirror = panel && panelRuntimeMirrors.get(panel);
    if (!mirror) return;

    syncRuntimeBootstrapFromEvent(mirror.bootstrap, command, data);
    mirror.seq += 1;
    mirror.events.push({
        id: mirror.seq,
        command,
        ...data,
        ts: Date.now()
    });
    if (mirror.events.length > 160) {
        mirror.events = mirror.events.slice(mirror.events.length - 160);
    }
    flushRuntimeMirror(panel);
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function getNonce() {
    return crypto.randomBytes(16).toString('hex');
}

function getConfig(key) {
    return vscode.workspace.getConfiguration('nocodequest').get(key);
}

function buildIdeSummary(ideState) {
    const diagnostics = Array.isArray(ideState?.diagnostics) ? ideState.diagnostics : [];
    const modifiedFiles = Array.isArray(ideState?.modified_files) ? ideState.modified_files : [];
    const activeFile = ideState?.active_file || null;

    const errorCount = diagnostics.filter(d => d.severity === 'error').length;
    const warnCount = diagnostics.filter(d => d.severity === 'warning').length;
    const topError = diagnostics.find(d => d.severity === 'error') || null;

    return {
        generatedAt: ideState?.generated_at || new Date().toISOString(),
        workspaceName: ideState?.workspace?.name || null,
        activeFile: activeFile
            ? {
                name: activeFile.name || null,
                path: activeFile.path || null,
                language: activeFile.language || null,
                isDirty: !!activeFile.is_dirty
            }
            : null,
        modifiedCount: modifiedFiles.length,
        modifiedFiles: modifiedFiles.slice(0, 6).map(f => ({
            name: f.name || null,
            status: f.status || null,
            path: f.path || null
        })),
        diagnostics: {
            errorCount,
            warnCount,
            topError: topError
                ? {
                    file: topError.file || null,
                    line: topError.line || null,
                    message: topError.message || null
                }
                : null
        }
    };
}

function reportExtensionDebug(hypothesisId, location, msg, data = {}) {
    // #region debug-point ext:A-E
    try {
        const payload = JSON.stringify({
            sessionId: 'webview-black-screen',
            runId: 'pre-fix',
            hypothesisId,
            location,
            msg: '[DEBUG] ' + msg,
            data,
            ts: Date.now()
        });

        const req = http.request({
            hostname: '127.0.0.1',
            port: 7777,
            path: '/event',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        });

        req.on('error', () => {});
        req.write(payload);
        req.end();
    } catch (_) {}
    // #endregion debug-point ext:A-E
}

// ─── Función de activación principal ─────────────────────────────────────────

function activate(context) {
    console.log(`[NoCodeQuest][BUILD ${BUILD_STAMP}] ⚔️  La aventura comienza...`);

    // Módulos del juego
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
    let gameState       = new InventoryManager(workspaceRoot);
    const compactSystem = new CompactSystem(workspaceRoot);
    const questBoard    = new QuestBoard();
    const complexityMapper = new ComplexityMapper();
    const bossManager   = new BossManager();
    const adventureOracle = new AdventureOracle(questBoard);

    // Estado de la sesión
    let currentPanel        = undefined;
    let currentActiveQuests = [];
    let lastErrorCount      = 0;
    let lastChatMessage     = null;
    let lastAssistantReply  = null;
    let lastIdeDigest       = null;
    let chatTranscript      = [];
    let lastDecisions       = [];

    function appendChatTranscript(entry) {
        chatTranscript.push({
            ...entry,
            recordedAt: new Date().toISOString()
        });
        if (chatTranscript.length > 80) {
            chatTranscript = chatTranscript.slice(chatTranscript.length - 80);
        }
    }

    function buildChatTranscriptMarkdown() {
        const model = getConfig('groqModel') || 'llama-3.1-8b-instant';
        const lines = [];
        lines.push('# NoCodeQuest — Registro de Chat');
        lines.push('');
        lines.push('- Modelo: ' + model);
        lines.push('- Generado: ' + new Date().toISOString());
        lines.push('');

        for (const entry of chatTranscript) {
            const who = entry.role === 'user' ? 'Usuario' : 'Jasper';
            lines.push('---');
            lines.push('');
            lines.push('## ' + who);
            if (entry.recordedAt) lines.push('- ' + entry.recordedAt);
            if (entry.aiModel && entry.role !== 'user') lines.push('- Modelo: ' + entry.aiModel);
            if (entry.suggestion?.title && entry.role !== 'user') {
                lines.push('- HITL: ' + entry.suggestion.title + ' (' + (entry.suggestion.recommended_action || 'accion') + ')');
            }
            lines.push('');
            lines.push(String(entry.text || '').trim());
            lines.push('');
        }

        if (!chatTranscript.length) {
            lines.push('_(Aún no hay entradas. Usa el chat dentro del WebView para generar conversación.)_');
            lines.push('');
        }

        return lines.join('\n');
    }

    function buildChatLogFileName() {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `nocodequest_chatlog_${stamp}.md`;
    }

    function storeAssistantReply(payload) {
        lastAssistantReply = payload ? {
            userText: payload.userText || '',
            text: payload.text || '',
            suggestion: payload.suggestion || null,
            aiModel: payload.aiModel || null,
            oracle: payload.oracle || null,
            generatedAt: new Date().toISOString()
        } : null;
    }

    function buildClipboardPayloadForIde() {
        if (!lastAssistantReply?.text) return '';
        const lines = [];
        lines.push('Jasper dice:');
        lines.push(lastAssistantReply.text);
        if (lastAssistantReply.suggestion?.title) {
            lines.push('');
            lines.push('HITL sugerido: ' + lastAssistantReply.suggestion.title);
            if (lastAssistantReply.suggestion.reason) {
                lines.push('Motivo: ' + lastAssistantReply.suggestion.reason);
            }
            if (lastAssistantReply.suggestion.recommended_action) {
                lines.push('Accion: ' + lastAssistantReply.suggestion.recommended_action);
            }
        }
        lines.push('');
        lines.push('Pegalo en el chat del IDE para continuar con contexto compartido.');
        return lines.join('\n');
    }

    function sendChatActionState(panel, buttonId, state, label, toastText = '', color = undefined) {
        if (buttonId) {
            sendToPanel(panel, 'chatActionState', {
                buttonId,
                state,
                label
            });
        }
        if (toastText) {
            sendToPanel(panel, 'hitlToast', {
                text: toastText,
                color
            });
        }
    }

    function formatTargetLocation(target) {
        if (!target?.file) return 'sin pergamino';
        const fileName = path.basename(target.file);
        return target.line ? `${fileName}:${target.line}` : fileName;
    }

    function refreshAdventureCardsInBackground(panel, ideStateOverride = null) {
        refreshAdventureCards(panel, ideStateOverride).catch((error) => {
            reportExtensionDebug('E', 'extension.js:refreshAdventureCardsInBackground', 'background refresh failed', {
                message: error?.message || String(error)
            });
        });
    }

    function buildIdeDigest(ideState) {
        if (!ideState) return '';
        const diagnostics = Array.isArray(ideState.diagnostics) ? ideState.diagnostics : [];
        const topError = diagnostics.find((entry) => entry.severity === 'error') || diagnostics[0] || null;
        return JSON.stringify({
            active: ideState.active_file?.path || null,
            modified: (ideState.modified_files || []).map((file) => file.path || file.name || '').slice(0, 12),
            quests: (ideState.quests || []).map((quest) => quest.id || quest.filePath || quest.fileName || '').slice(0, 8),
            topError: topError ? [topError.path || topError.file || null, topError.line || null, topError.message || null] : null,
            cards: (ideState.adventure_cards || []).map((card) => card.id || card.title || '').slice(0, 5)
        });
    }

    function describeIdeDiff(previousDigest, nextDigest, ideState) {
        if (!previousDigest) return 'primera lectura';
        if (previousDigest === nextDigest) return 'sin cambios';
        if (ideState?.active_file?.name) return 'cambio detectado en ' + ideState.active_file.name;
        return 'contexto actualizado';
    }

    async function runChatAdvice(panel, userText, apiKey, model, options = {}) {
        const {
            appendUserEntry = false,
            source = 'chat',
            ideStateOverride = null
        } = options;
        if (!userText) return;

        if (appendUserEntry) {
            appendChatTranscript({
                role: 'user',
                text: userText
            });
        }

        const ideState = ideStateOverride || await adventureOracle.collectIdeState({
            gameState,
            lastChatMessage
        });
        lastIdeDigest = buildIdeDigest(ideState);
        const suggestion = buildChatSuggestion(ideState, userText);
        const speechText = readRuntimeMirrorSpeech(workspaceRoot) || buildNextStepSpeech(ideState);
        const compact = compactSystem.generateCompact({
            ideState,
            gameState,
            chatTranscript,
            lastDecisions,
            includeHumanContext: true,
            uiState: { speech_text: speechText }
        });
        const narration = await fetchNarrationDetailed(
            userText,
            'chat',
            gameState.getState(),
            apiKey,
            model,
            { compact }
        );
        const text = narration.text || '';
        const oracle = narration.oracle || null;

        appendChatTranscript({
            role: 'assistant',
            text,
            aiModel: model,
            suggestion,
            oracle
        });
        storeAssistantReply({
            userText,
            text,
            suggestion,
            aiModel: model,
            oracle
        });

        sendToPanel(panel, 'chatResponse', {
            userText,
            text,
            suggestion,
            aiModel: model,
            oracle,
            source
        });
        if (suggestion?.title) {
            sendToPanel(panel, 'hitlToast', {
                text: `🧭 Jasper sugiere: ${suggestion.title}`
            });
        }
        if (suggestion?.payload?.cardId) {
            sendToPanel(panel, 'hitlNudge', {
                cardId: suggestion.payload.cardId,
                action: suggestion.recommended_action || null
            });
        }
        sendToPanel(panel, 'speak', { text });
        await refreshAdventureCards(panel, ideState);
    }

    async function quickExportChatTranscript(panel) {
        const logDir = workspaceRoot ? path.join(workspaceRoot, '.nocodequest', 'chatlogs') : null;
        if (!logDir) {
            sendToPanel(panel, 'hitlToast', { text: '📤 No hay workspace abierto para exportar el registro.' });
            return;
        }

        const dirUri = vscode.Uri.file(logDir);
        await vscode.workspace.fs.createDirectory(dirUri);

        const fileUri = vscode.Uri.file(path.join(logDir, buildChatLogFileName()));
        const md = buildChatTranscriptMarkdown();
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(md, 'utf8'));

        try {
            await vscode.env.clipboard.writeText(fileUri.fsPath);
        } catch (_) { }

        sendToPanel(panel, 'hitlToast', { text: '📤 Registro guardado y ruta copiada' });

        try {
            const doc = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
        } catch (_) { }
    }

    async function refreshAdventureCards(panel = currentPanel, ideStateOverride = null) {
        if (!panel) return;
        const ideState = ideStateOverride || await adventureOracle.collectIdeState({
            gameState,
            lastChatMessage
        });
        lastIdeDigest = buildIdeDigest(ideState);
        sendToPanel(panel, 'syncIdeSummary', {
            summary: buildIdeSummary(ideState)
        });
        sendToPanel(panel, 'showAdventureCards', {
            cards: ideState.adventure_cards || []
        });
    }

    function dismissAdventureCard(cardId, panel = currentPanel) {
        if (!cardId) return;
        sendToPanel(panel, 'removeAdventureCard', { cardId });
    }

    function normalizeChatText(value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function getCardPriorityScore(priority) {
        const scores = {
            critical: 400,
            high: 300,
            medium: 200,
            low: 100,
            optional: 0
        };
        return scores[priority] ?? 0;
    }

    function getSuggestionIntent(action) {
        switch (action) {
            case 'inspect_code':
                return 'inspect_code';
            case 'attack_bug':
                return 'resolve_error';
            case 'accept_quest':
                return 'accept_mission';
            case 'use_potion':
                return 'recover_stability';
            case 'open_shop':
                return 'prepare_loadout';
            case 'commit_changes':
                return 'preserve_progress';
            default:
                return 'continue_exploring';
        }
    }

    function getSuggestionCta(card) {
        switch (card?.action) {
            case 'inspect_code':
                return 'Abrir pergamino';
            case 'attack_bug':
                return 'Ir al enemigo';
            case 'accept_quest':
                return 'Juramentar misión';
            case 'use_potion':
                return 'Beber poción';
            case 'open_shop':
                return 'Abrir mercado';
            case 'commit_changes':
                return 'Abrir sello real';
            default:
                return 'Seguir adelante';
        }
    }

    function buildSuggestionReason(card, ideState) {
        const diagnostics = ideState?.diagnostics || [];
        const modifiedFiles = ideState?.modified_files || [];
        const quests = ideState?.quests || [];
        const player = ideState?.player_state || {};
        const activeFile = ideState?.active_file || null;

        switch (card?.action) {
            case 'inspect_code': {
                const label = card?.target?.file
                    ? path.basename(card.target.file)
                    : (card?.target?.label || 'el pergamino relevante');
                if (card?.target?.line) {
                    return `No hay un combate directo listo, pero ${label} parece el mejor punto de entrada. Jasper propone abrirlo en la línea ${card.target.line}.`;
                }
                return `No hay archivo activo ahora mismo. Jasper propone abrir ${label} para recuperar contexto técnico real antes de decidir.`;
            }
            case 'attack_bug': {
                const criticalError = diagnostics.find(entry => entry.severity === 'error');
                if (!criticalError) return 'Hay una amenaza activa en el IDE y conviene golpear primero.';
                return `Hay un error activo en ${criticalError.file}, línea ${criticalError.line}. Jasper propone atacar donde el IDE ya ha visto sangre.`;
            }
            case 'accept_quest': {
                const quest = quests.find(entry => entry.id === card?.target?.quest_id);
                if (!quest) return 'Hay un encargo pendiente que todavía no has jurado.';
                return `Existe un encargo pendiente en ${quest.fileName}. Convertirlo en misión te deja un objetivo explícito dentro de la campaña.`;
            }
            case 'use_potion':
                return `La planta está ${player.plant_health || 'inestable'} y aún guardas ${player.coffee_potions || 0} poción(es) de café. Recuperar estabilidad ahora reduce fricción.`;
            case 'open_shop':
                return `Tienes ${player.gold || 0} monedas y el mercado puede darte aire antes del siguiente combate.`;
            case 'commit_changes':
                return `Hay ${modifiedFiles.length} archivo(s) con cambios${activeFile?.name ? ', incluido ' + activeFile.name : ''}. Fijar el progreso ahora evita perder una victoria parcial.`;
            default:
                return 'No hay urgencias claras; Jasper recomienda seguir explorando el reino del código.';
        }
    }

    function detectChatFocus(normalizedText) {
        if (!normalizedText) return 'general';
        if (/(codigo|contexto|archivo|errores?|diagnostico|linter|refactor|funcion|hechizo|bug|stack|tipos?|warning|warnings|cambios|diff|commit|repo|git|siguiente paso|proximo paso|qué hacemos|que hacemos|que deberiamos|deberiamos hacer|abrir archivo|inspeccionar)/.test(normalizedText)) {
            return 'code';
        }
        if (/(cafe|pocion|planta|caos|energia|descansar|recuperar)/.test(normalizedText)) {
            return 'stability';
        }
        if (/(tienda|mercado|comprar|oro|arma|equipo)/.test(normalizedText)) {
            return 'shop';
        }
        return 'general';
    }

    function getFocusScoreBoost(action, focus, ideState) {
        if (focus === 'code') {
            if (action === 'attack_bug') return (ideState?.diagnostics || []).some(d => d.severity === 'error') ? 520 : 260;
            if (action === 'accept_quest') return (ideState?.quests || []).length ? 300 : 120;
            if (action === 'commit_changes') {
                const hasActiveFile = !!ideState?.active_file;
                if (!hasActiveFile) return -120;
                return (ideState?.modified_files || []).length ? 180 : 40;
            }
            if (action === 'use_potion') return -260;
            if (action === 'open_shop') return -180;
        }
        if (focus === 'stability') {
            if (action === 'use_potion') return 420;
        }
        if (focus === 'shop') {
            if (action === 'open_shop') return 360;
        }
        return 0;
    }

    function getActionKeywordBoost(action, normalizedText) {
        const keywordMap = {
            attack_bug: ['bug', 'error', 'fallo', 'diagnostico', 'diagnosticos', 'arreglar', 'enemigo', 'rompio', 'roto', 'codigo', 'archivo', 'warning', 'warnings', 'linter', 'contexto'],
            accept_quest: ['quest', 'mision', 'misiones', 'todo', 'fixme', 'pendiente', 'encargo'],
            use_potion: ['cafe', 'pocion', 'planta', 'caos', 'energia', 'descansar', 'recuperar'],
            open_shop: ['tienda', 'mercado', 'comprar', 'compra', 'oro', 'arma', 'equipo'],
            commit_changes: ['commit', 'git', 'guardar', 'sello', 'sellar', 'repositorio', 'repo', 'cronica']
        };
        const keywords = keywordMap[action] || [];
        return keywords.some(keyword => normalizedText.includes(keyword)) ? 220 : 0;
    }

    function selectSuggestedCard(cards, userText, ideState) {
        if (!cards.length) return null;

        const normalizedText = normalizeChatText(userText);
        const focus = detectChatFocus(normalizedText);
        const rankedCards = cards
            .map((card, index) => ({
                card,
                score:
                    getCardPriorityScore(card.priority) +
                    getActionKeywordBoost(card.action, normalizedText) +
                    getFocusScoreBoost(card.action, focus, ideState) -
                    index
            }))
            .sort((left, right) => right.score - left.score);

        return rankedCards[0]?.card || null;
    }

    function buildCodeFocusSuggestion(ideState) {
        const diagnostics = Array.isArray(ideState?.diagnostics) ? ideState.diagnostics : [];
        const quests = Array.isArray(ideState?.quests) ? ideState.quests : [];
        const cards = Array.isArray(ideState?.adventure_cards) ? ideState.adventure_cards : [];
        const activeFile = ideState?.active_file || null;
        const modifiedFiles = Array.isArray(ideState?.modified_files) ? ideState.modified_files : [];

        const criticalError = diagnostics.find((entry) => entry.severity === 'error' && entry.path);
        if (criticalError) {
            const liveAttackCard = cards.find((card) => card.action === 'attack_bug' && card.target?.file === criticalError.path);
            const card = liveAttackCard || {
                id: `inspect-error-${criticalError.path}-${criticalError.line || 1}`,
                title: '⚔️ Revisar Error Detectado',
                action: 'inspect_code',
                priority: 'critical',
                target: {
                    file: criticalError.path,
                    line: criticalError.line || 1,
                    label: criticalError.file || path.basename(criticalError.path)
                }
            };

            return {
                id: `chat-hitl-${card.id}`,
                source: liveAttackCard ? 'adventure_card' : 'code_focus',
                intent: getSuggestionIntent(card.action),
                title: liveAttackCard ? card.title : '⚔️ Revisar Error Detectado',
                recommended_action: card.action,
                reason: buildSuggestionReason(card, ideState),
                cta_label: getSuggestionCta(card),
                requires_confirmation: false,
                payload: {
                    cardId: liveAttackCard ? card.id : null,
                    card
                }
            };
        }

        const pendingQuest = quests[0];
        if (pendingQuest?.filePath) {
            const liveQuestCard = cards.find((card) => card.action === 'accept_quest' && card.target?.quest_id === pendingQuest.id);
            const card = liveQuestCard || {
                id: `inspect-quest-${pendingQuest.id}`,
                title: '📜 Abrir Misión Pendiente',
                action: 'inspect_code',
                priority: 'high',
                target: {
                    file: pendingQuest.filePath,
                    line: (typeof pendingQuest.line === 'number' ? pendingQuest.line + 1 : 1),
                    label: pendingQuest.fileName || path.basename(pendingQuest.filePath)
                }
            };

            return {
                id: `chat-hitl-${card.id}`,
                source: liveQuestCard ? 'adventure_card' : 'code_focus',
                intent: liveQuestCard ? getSuggestionIntent(card.action) : 'inspect_code',
                title: liveQuestCard ? card.title : '📜 Abrir Misión Pendiente',
                recommended_action: card.action,
                reason: liveQuestCard
                    ? buildSuggestionReason(card, ideState)
                    : `Hay una misión pendiente en ${pendingQuest.fileName || 'un archivo del reino'}. Jasper propone abrirla antes de seguir improvisando.`,
                cta_label: liveQuestCard ? getSuggestionCta(card) : 'Abrir misión',
                requires_confirmation: false,
                payload: {
                    cardId: liveQuestCard ? card.id : null,
                    card
                }
            };
        }

        const candidateFile = activeFile?.path ? {
            file: activeFile.path,
            line: 1,
            label: activeFile.name || path.basename(activeFile.path)
        } : modifiedFiles[0]?.path ? {
            file: modifiedFiles[0].path,
            line: 1,
            label: modifiedFiles[0].name || path.basename(modifiedFiles[0].path)
        } : null;

        if (candidateFile) {
            const card = {
                id: `inspect-file-${candidateFile.file}`,
                title: activeFile?.path ? '🧭 Inspeccionar Archivo Activo' : '🧭 Abrir Archivo Modificado',
                action: 'inspect_code',
                priority: 'high',
                target: candidateFile
            };

            return {
                id: `chat-hitl-${card.id}`,
                source: 'code_focus',
                intent: 'inspect_code',
                title: card.title,
                recommended_action: card.action,
                reason: buildSuggestionReason(card, ideState),
                cta_label: getSuggestionCta(card),
                requires_confirmation: false,
                payload: { card }
            };
        }

        return null;
    }

    function buildChatSuggestion(ideState, userText) {
        const normalizedText = normalizeChatText(userText);
        const focus = detectChatFocus(normalizedText);
        if (focus === 'code') {
            const codeSuggestion = buildCodeFocusSuggestion(ideState);
            if (codeSuggestion) return codeSuggestion;
        }

        const cards = Array.isArray(ideState?.adventure_cards) ? ideState.adventure_cards : [];
        const selectedCard = selectSuggestedCard(cards, userText, ideState);
        if (!selectedCard) return null;

        return {
            id: `chat-hitl-${selectedCard.id}`,
            source: 'adventure_card',
            intent: getSuggestionIntent(selectedCard.action),
            title: selectedCard.title,
            recommended_action: selectedCard.action,
            reason: buildSuggestionReason(selectedCard, ideState),
            cta_label: getSuggestionCta(selectedCard),
            requires_confirmation: selectedCard.action === 'commit_changes',
            payload: {
                cardId: selectedCard.id,
                card: selectedCard
            }
        };
    }

    function resolveSuggestionCard(suggestion, ideState) {
        const cards = Array.isArray(ideState?.adventure_cards) ? ideState.adventure_cards : [];
        const cardId = suggestion?.payload?.cardId;
        if (cardId) {
            const liveCard = cards.find(card => card.id === cardId);
            if (liveCard) return liveCard;
        }
        return suggestion?.payload?.card || null;
    }

    async function executeStructuredSuggestion(panel, suggestion, narrationEnabled, apiKey, model) {
        if (!suggestion) return;

        const ideState = await adventureOracle.collectIdeState({
            gameState,
            lastChatMessage
        });
        const card = resolveSuggestionCard(suggestion, ideState);

        if (!card) {
            sendToPanel(panel, 'speak', {
                text: '🧭 La sugerencia de Jasper ya no coincide con el estado del IDE. El Oráculo recomienda pedir consejo de nuevo.'
            });
            await refreshAdventureCards(panel, ideState);
            return {
                ok: false,
                reason: 'stale-suggestion'
            };
        }

        sendToPanel(panel, 'markChatSuggestionUsed', {
            suggestionId: suggestion.id
        });

        if (card.action === 'ignore') {
            sendToPanel(panel, 'speak', {
                text: '🌿 Jasper no ve un ritual urgente. Puedes seguir explorando hasta que el IDE revele una nueva grieta.'
            });
            sendToPanel(panel, 'hitlToast', {
                text: '🌿 Sin urgencias: sigue explorando'
            });
            await refreshAdventureCards(panel, ideState);
            return {
                ok: true,
                action: 'ignore'
            };
        }

        sendToPanel(panel, 'hitlToast', {
            text: `🧭 Ritual: ${card.title || card.action}`
        });
        return await handleAdventureCardSelection(card, panel, narrationEnabled, apiKey, model);
    }

    async function syncPanelBootstrap(panel, gameState, currentActiveQuests = []) {
        if (!panel || !gameState) return;

        // #region debug-point E:sync-bootstrap
        reportExtensionDebug('E', 'extension.js:syncPanelBootstrap', 'sync panel bootstrap', {
            level: gameState.getState()?.player?.level ?? null,
            gold: gameState.getState()?.player?.gold ?? null,
            questCount: currentActiveQuests.length
        });
        // #endregion debug-point E:sync-bootstrap

        sendToPanel(panel, 'syncInventory', { state: gameState.getState() });
        sendToPanel(panel, 'updateVisualSkins', {
            weapon: gameState.getPlayer().equipped.weapon,
            skin: gameState.getPlayer().equipped.skin
        });
        sendToPanel(panel, 'refreshQuestBoard', { quests: currentActiveQuests });
        await refreshAdventureCards(panel);
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
            const resolvedPath = path.resolve(String(target.file));
            if (!fs.existsSync(resolvedPath)) {
                throw new Error('El pergamino no existe en disco: ' + resolvedPath);
            }
            const targetUri = vscode.Uri.file(resolvedPath);
            const doc = await vscode.workspace.openTextDocument(targetUri);
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

        lastDecisions.push({
            recordedAt: new Date().toISOString(),
            cardId: card.id || null,
            action: card.action || null,
            title: card.title || null
        });
        if (lastDecisions.length > 40) {
            lastDecisions = lastDecisions.slice(lastDecisions.length - 40);
        }

        switch (card.action) {
            case 'inspect_code':
                sendToPanel(panel, 'openSideTab', { tab: 'destiny' });
                sendToPanel(panel, 'focusAdventureCard', { cardId: card.id });
                if (await revealTargetLocation(card.target)) {
                    sendToPanel(panel, 'speak', {
                        text: '🧭 Jasper ha abierto el pergamino clave. Ya tienes contexto técnico real para decidir el siguiente paso.'
                    });
                    refreshAdventureCardsInBackground(panel);
                    return {
                        ok: true,
                        action: 'inspect_code',
                        opened: true,
                        targetLabel: formatTargetLocation(card.target)
                    };
                } else {
                    sendToPanel(panel, 'speak', {
                        text: '🧭 Jasper no pudo abrir el pergamino, pero ha fijado el foco en Destino para que revises el contexto del IDE.'
                    });
                    refreshAdventureCardsInBackground(panel);
                    return {
                        ok: false,
                        action: 'inspect_code',
                        opened: false,
                        targetLabel: formatTargetLocation(card.target)
                    };
                }

            case 'use_potion':
                await consumeCoffeePotion(panel, narrationEnabled, apiKey, model, card.id);
                return {
                    ok: true,
                    action: 'use_potion'
                };

            case 'open_shop':
                dismissAdventureCard(card.id, panel);
                sendToPanel(panel, 'openSideTab', { tab: 'shop' });
                sendToPanel(panel, 'speak', {
                    text: '🛒 Jasper señala el Mercado del Gremio. Elige con cuidado qué reliquia comprar.'
                });
                return {
                    ok: true,
                    action: 'open_shop'
                };

            case 'commit_changes':
                await requestCommitPreview(panel, narrationEnabled, apiKey, model, card.id);
                return {
                    ok: true,
                    action: 'commit_changes'
                };

            case 'accept_quest':
                await acceptQuestFromCard(card, panel);
                return {
                    ok: true,
                    action: 'accept_quest'
                };

            case 'attack_bug':
                sendToPanel(panel, 'focusAdventureCard', { cardId: card.id });
                if (await revealTargetLocation(card.target)) {
                    sendToPanel(panel, 'speak', {
                        text: '⚔️ El enemigo ha sido localizado en su guarida. Ya tienes abierto el archivo y la línea exacta del combate.'
                    });
                    refreshAdventureCardsInBackground(panel);
                    return {
                        ok: true,
                        action: 'attack_bug',
                        opened: true,
                        targetLabel: formatTargetLocation(card.target)
                    };
                }
                refreshAdventureCardsInBackground(panel);
                return {
                    ok: false,
                    action: 'attack_bug',
                    opened: false,
                    targetLabel: formatTargetLocation(card.target)
                };

            default:
                sendToPanel(panel, 'speak', {
                    text: '🌿 Esta senda aún no tiene ritual completo, pero ya ha quedado señalada en las crónicas.'
                });
                return {
                    ok: true,
                    action: card.action
                };
        }
    }

    // ── Comando: Iniciar Aventura ─────────────────────────────────────────────
    const startCommand = vscode.commands.registerCommand('nocodequest.start', () => {
        if (currentPanel) {
            currentPanel.reveal(vscode.ViewColumn.Two);
            return;
        }

        // #region debug-point A:start-command
        reportExtensionDebug('A', 'extension.js:startCommand', 'start command invoked', {
            extensionUri: String(context.extensionUri),
            workspaceRoot: workspaceRoot || null
        });
        // #endregion debug-point A:start-command

        const runtimeMirrorPath = workspaceRoot
            ? path.join(workspaceRoot, '.nocodequest', 'webview-runtime.json')
            : null;
        const runtimeMirrorDir = runtimeMirrorPath ? path.dirname(runtimeMirrorPath) : null;
        const localResourceRoots = [
            vscode.Uri.joinPath(context.extensionUri, 'media'),
            vscode.Uri.joinPath(context.extensionUri, 'webview', 'modules')
        ];
        if (runtimeMirrorDir) {
            localResourceRoots.push(vscode.Uri.file(runtimeMirrorDir));
        }

        currentPanel = vscode.window.createWebviewPanel(
            'nocodequestEngine',
            '⚔️ NoCodeQuest',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots
            }
        );

        registerRuntimeMirror(
            currentPanel,
            runtimeMirrorPath,
            buildRuntimeBootstrap(gameState, currentActiveQuests)
        );

        const runtimeMirrorUri = runtimeMirrorPath
            ? currentPanel.webview.asWebviewUri(vscode.Uri.file(runtimeMirrorPath))
            : null;

        currentPanel.webview.html = getWebviewContent(
            currentPanel.webview,
            context.extensionUri,
            runtimeMirrorUri
        );

        // #region debug-point A:html-assigned
        reportExtensionDebug('A', 'extension.js:startCommand', 'webview html assigned', {
            hasPanel: !!currentPanel,
            localResourceRoots: localResourceRoots.map((uri) => path.basename(uri.fsPath || String(uri))),
            runtimeMirrorPath
        });
        // #endregion debug-point A:html-assigned

        // ── Receptor de mensajes del WebView ─────────────────────────────────
        currentPanel.webview.onDidReceiveMessage(
            async (message) => {
                // #region debug-point E:webview-message
                reportExtensionDebug('E', 'extension.js:onDidReceiveMessage', 'message received from webview', {
                    command: message && message.command ? message.command : null
                });
                // #endregion debug-point E:webview-message
                const apiKey = getConfig('groqApiKey') || '';
                const model  = getConfig('groqModel')  || 'llama-3.1-8b-instant';
                const narrationEnabled = getConfig('enableNarration') !== false;

                switch (message.command) {
                    case 'webviewReady': {
                        // #region debug-point E:webview-ready
                        reportExtensionDebug('E', 'extension.js:webviewReady', 'webviewReady received', {});
                        // #endregion debug-point E:webview-ready
                        await syncPanelBootstrap(currentPanel, gameState, currentActiveQuests);
                        break;
                    }

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
                        await runChatAdvice(currentPanel, userText, apiKey, model, {
                            appendUserEntry: true,
                            source: 'chat'
                        });
                        break;
                    }

                    case 'chatOpened': {
                        const ideState = await adventureOracle.collectIdeState({
                            gameState,
                            lastChatMessage
                        });
                        sendToPanel(currentPanel, 'speak', { text: buildNextStepSpeech(ideState) });
                        await refreshAdventureCards(currentPanel, ideState);
                        break;
                    }

                    case 'openExternalUrl': {
                        const rawUrl = String(message.url || '').trim();
                        if (!rawUrl || !/^https:\/\//i.test(rawUrl)) {
                            sendToPanel(currentPanel, 'hitlToast', {
                                text: '⚠️ Enlace externo no valido.',
                                color: '#ffb3b3'
                            });
                            break;
                        }
                        try {
                            await vscode.env.openExternal(vscode.Uri.parse(rawUrl));
                            sendToPanel(currentPanel, 'hitlToast', {
                                text: '🌍 Enlace abierto en tu navegador.',
                                color: '#00d4ff'
                            });
                        } catch (error) {
                            sendToPanel(currentPanel, 'hitlToast', {
                                text: '❌ No pude abrir el enlace: ' + (error?.message || String(error)),
                                color: '#ffb3b3'
                            });
                        }
                        break;
                    }

                    case 'refreshIdeContext': {
                        try {
                            const ideState = await adventureOracle.collectIdeState({
                                gameState,
                                lastChatMessage
                            });
                            const nextDigest = buildIdeDigest(ideState);
                            const diffLabel = describeIdeDiff(lastIdeDigest, nextDigest, ideState);
                            if (diffLabel === 'sin cambios') {
                                sendChatActionState(
                                    currentPanel,
                                    'chat-refresh',
                                    'info',
                                    'Sin diff',
                                    '🧭 Sin cambios desde la ultima lectura del IDE'
                                );
                                break;
                            }
                            await refreshAdventureCards(currentPanel, ideState);
                            sendChatActionState(
                                currentPanel,
                                'chat-refresh',
                                'done',
                                'Con diff',
                                `🧭 Contexto actualizado: ${diffLabel}`
                            );
                        } catch (error) {
                            sendChatActionState(
                                currentPanel,
                                'chat-refresh',
                                'error',
                                'Error',
                                '❌ No pude refrescar el contexto del IDE: ' + (error?.message || String(error))
                            );
                        }
                        break;
                    }

                    case 'copyLatestChatResponse': {
                        const payload = buildClipboardPayloadForIde();
                        if (!payload) {
                            sendChatActionState(
                                currentPanel,
                                'chat-copy-ide',
                                'info',
                                'Sin texto',
                                '📋 Aún no hay respuesta de Jasper para copiar.'
                            );
                            break;
                        }
                        try {
                            await vscode.env.clipboard.writeText(payload);
                            sendChatActionState(
                                currentPanel,
                                'chat-copy-ide',
                                'done',
                                'Copiado',
                                '📋 Respuesta copiada. Pégala en el chat del IDE.'
                            );
                        } catch (error) {
                            sendChatActionState(
                                currentPanel,
                                'chat-copy-ide',
                                'error',
                                'Error',
                                '❌ No pude copiar la respuesta: ' + (error?.message || String(error))
                            );
                        }
                        break;
                    }

                    case 'regenerateChatResponse': {
                        const userText = String(lastChatMessage?.content || '').trim();
                        if (!userText) {
                            sendChatActionState(
                                currentPanel,
                                'chat-regenerate',
                                'info',
                                'Sin pregunta',
                                '🔁 Primero haz una pregunta a Jasper.'
                            );
                            break;
                        }
                        try {
                            const ideState = await adventureOracle.collectIdeState({
                                gameState,
                                lastChatMessage
                            });
                            const nextDigest = buildIdeDigest(ideState);
                            const diffLabel = describeIdeDiff(lastIdeDigest, nextDigest, ideState);
                            await runChatAdvice(currentPanel, userText, apiKey, model, {
                                appendUserEntry: false,
                                source: 'regenerate',
                                ideStateOverride: ideState
                            });
                            sendChatActionState(
                                currentPanel,
                                'chat-regenerate',
                                diffLabel === 'sin cambios' ? 'info' : 'done',
                                diffLabel === 'sin cambios' ? 'Sin diff' : 'Con diff',
                                diffLabel === 'sin cambios'
                                    ? '🔁 Jasper relee el mismo contexto; no hay diff nuevo en el IDE.'
                                    : `🔁 Jasper relee el reino: ${diffLabel}`
                            );
                        } catch (error) {
                            sendChatActionState(
                                currentPanel,
                                'chat-regenerate',
                                'error',
                                'Error',
                                '❌ Jasper no pudo recrear la respuesta: ' + (error?.message || String(error))
                            );
                        }
                        break;
                    }

                    case 'runInspectCodeRitual': {
                        try {
                            const ideState = await adventureOracle.collectIdeState({
                                gameState,
                                lastChatMessage
                            });
                            const nextDigest = buildIdeDigest(ideState);
                            const suggestion = buildCodeFocusSuggestion(ideState);
                            if (!suggestion?.payload?.card) {
                                sendChatActionState(
                                    currentPanel,
                                    'chat-inspect',
                                    'info',
                                    'Sin objetivo',
                                    '🧭 Jasper no ha encontrado un pergamino técnico claro.'
                                );
                                break;
                            }
                            const diffLabel = describeIdeDiff(lastIdeDigest, nextDigest, ideState);
                            const execution = await executeStructuredSuggestion(currentPanel, suggestion, narrationEnabled, apiKey, model);
                            if (execution?.opened) {
                                sendChatActionState(
                                    currentPanel,
                                    'chat-inspect',
                                    'done',
                                    'Abierto',
                                    `🧭 Pergamino abierto: ${execution.targetLabel} · ${diffLabel}`
                                );
                            } else if (execution?.action === 'inspect_code' || execution?.action === 'attack_bug') {
                                sendChatActionState(
                                    currentPanel,
                                    'chat-inspect',
                                    'error',
                                    'Sin abrir',
                                    `🧭 Jasper fijó el foco, pero no pudo abrir ${execution.targetLabel || 'el pergamino'}`
                                );
                            } else {
                                sendChatActionState(
                                    currentPanel,
                                    'chat-inspect',
                                    'info',
                                    'Sin accion',
                                    `🧭 Ritual inspect_code revisado: ${suggestion.title} · ${diffLabel}`
                                );
                            }
                        } catch (error) {
                            sendChatActionState(
                                currentPanel,
                                'chat-inspect',
                                'error',
                                'Error',
                                '❌ Jasper no pudo inspeccionar el código: ' + (error?.message || String(error))
                            );
                        }
                        break;
                    }

                    case 'askJasperAboutDestiny': {
                        try {
                            const ideState = await adventureOracle.collectIdeState({
                                gameState,
                                lastChatMessage
                            });
                            const topCard = Array.isArray(ideState.adventure_cards) ? ideState.adventure_cards[0] : null;
                            const prompt = topCard
                                ? `teniendo en cuenta destino, ${topCard.title}: cual es el siguiente paso tecnico?`
                                : 'teniendo en cuenta destino, cual es el siguiente paso tecnico?';
                            lastChatMessage = {
                                role: 'user',
                                content: prompt
                            };
                            sendToPanel(currentPanel, 'appendChatUserMessage', { text: prompt });
                            await runChatAdvice(currentPanel, prompt, apiKey, model, {
                                appendUserEntry: true,
                                source: 'destiny'
                            });
                            sendChatActionState(
                                currentPanel,
                                'destiny-send-to-jasper',
                                'done',
                                'Enviado',
                                '🧭 Destino enviado a Jasper'
                            );
                        } catch (error) {
                            sendChatActionState(
                                currentPanel,
                                'destiny-send-to-jasper',
                                'error',
                                'Error',
                                '❌ No pude consultar a Jasper desde Destino: ' + (error?.message || String(error))
                            );
                        }
                        break;
                    }

                    case 'chatFeedback': {
                        const kind = message.kind === 'dislike' ? 'dislike' : 'like';
                        lastDecisions.push({
                            recordedAt: new Date().toISOString(),
                            action: 'chat_feedback',
                            title: kind === 'like' ? 'Respuesta util' : 'Respuesta poco util',
                            feedback: kind,
                            forUserText: lastAssistantReply?.userText || null
                        });
                        if (lastDecisions.length > 40) {
                            lastDecisions = lastDecisions.slice(lastDecisions.length - 40);
                        }
                        sendToPanel(currentPanel, 'hitlToast', {
                            text: kind === 'like' ? '👍 Jasper toma nota de que este consejo fue util.' : '👎 Jasper toma nota y afinara su proximo consejo.'
                        });
                        break;
                    }

                    case 'executeStructuredSuggestion': {
                        await executeStructuredSuggestion(
                            currentPanel,
                            message.suggestion,
                            narrationEnabled,
                            apiKey,
                            model
                        );
                        break;
                    }
                    
                    case 'moveToColumnOne': {
                        try {
                            currentPanel?.reveal(vscode.ViewColumn.One);
                        } catch (_) { }
                        break;
                    }

                    case 'toggleMaximizeEditorGroup': {
                        try {
                            await vscode.commands.executeCommand('workbench.action.toggleMaximizeEditorGroup');
                        } catch (_) { }
                        break;
                    }

                    case 'toggleZenMode': {
                        try {
                            await vscode.commands.executeCommand('workbench.action.toggleZenMode');
                        } catch (_) { }
                        break;
                    }

                    case 'exportChatTranscript': {
                        await quickExportChatTranscript(currentPanel);
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
    mirrorPanelEvent(panel, command, data);
    const delivered = panel?.webview.postMessage({ command, ...data });
    // #region debug-point E:send-to-panel
    reportExtensionDebug('E', 'extension.js:sendToPanel', 'message sent to panel', {
        command,
        delivered: typeof delivered === 'boolean' ? delivered : 'promise'
    });
    // #endregion debug-point E:send-to-panel
    return delivered;
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
function getWebviewContent(webview, extensionUri, runtimeBridgeUri = null) {
    const nonce = getNonce();

    const heroUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'hero.png'));
    const heroAttackUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'hero_attack.png'));
    const bugUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'bug.png'));
    const dungeonUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'dungeon.png'));
    const flashscreenUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'fondo_flashscreen.png'));
    const loginBgUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'fondo_login.png'));
    const creditsBgUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'fondo_creditos.png'));
    const jasperUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'Jasper.png'));
    const musicUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'music', 'Path_to_the_Serpent_Keep.mp3'));
    const phaserUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'phaser.min.js'));
    const modulesDir = vscode.Uri.joinPath(extensionUri, 'webview', 'modules');
    const vscodeBridgeUri = webview.asWebviewUri(vscode.Uri.joinPath(modulesDir, 'vscode-bridge.js'));
    const gameStateUri = webview.asWebviewUri(vscode.Uri.joinPath(modulesDir, 'game-state.js'));
    const uiRendererUri = webview.asWebviewUri(vscode.Uri.joinPath(modulesDir, 'ui-renderer.js'));
    const eventHandlersUri = webview.asWebviewUri(vscode.Uri.joinPath(modulesDir, 'event-handlers.js'));
    const navigationUri = webview.asWebviewUri(vscode.Uri.joinPath(modulesDir, 'navigation.js'));
    const phaserSceneUri = webview.asWebviewUri(vscode.Uri.joinPath(modulesDir, 'phaser-scene.js'));
    const playerName = getConfig('playerName') || 'Aventurero';

    const csp = [
        `default-src 'none'`,
        `img-src ${webview.cspSource} https: data:`,
        `media-src ${webview.cspSource} https: data:`,
        `script-src 'nonce-${nonce}' ${webview.cspSource}`,
        `style-src 'unsafe-inline'`,
        `font-src https://fonts.gstatic.com`,
        `connect-src ${webview.cspSource} https: https://api.groq.com http://127.0.0.1:7777`
    ].join('; ');

    const html = getPanelHtml(
        nonce,
        csp,
        heroUri,
        heroAttackUri,
        bugUri,
        dungeonUri,
        flashscreenUri,
        loginBgUri,
        creditsBgUri,
        jasperUri,
        musicUri,
        phaserUri,
        vscodeBridgeUri,
        gameStateUri,
        uiRendererUri,
        eventHandlersUri,
        navigationUri,
        phaserSceneUri,
        playerName,
        runtimeBridgeUri ? runtimeBridgeUri.toString() : '',
        BUILD_STAMP
    );

    // #region debug-point A:html-shape
    reportExtensionDebug('A', 'extension.js:getWebviewContent', 'generated webview html summary', {
        htmlLength: html.length,
        hasEarlyBoot: html.includes('bootstrap-inline-start'),
        hasNavigationModuleTag: html.includes('navigation.js'),
        hasBridgeModuleTag: html.includes('vscode-bridge.js'),
        hasDomContentLoaded: html.includes('DOMContentLoaded'),
        cspConnects7778: csp.includes('127.0.0.1:7778'),
        buildStamp: BUILD_STAMP
    });
    // #endregion debug-point A:html-shape

    return html;
}

// ─── HTML del panel (importado desde webview/panel.js) ───────────────────────
function getPanelHtml(
    nonce,
    csp,
    heroUri,
    heroAttackUri,
    bugUri,
    dungeonUri,
    flashscreenUri,
    loginBgUri,
    creditsBgUri,
    jasperUri,
    musicUri,
    phaserUri,
    vscodeBridgeUri,
    gameStateUri,
    uiRendererUri,
    eventHandlersUri,
    navigationUri,
    phaserSceneUri,
    playerName,
    runtimeBridgeUri,
    buildStamp
) {
    // El HTML completo se genera aquí para tener acceso a las URIs de los assets
    return require('./webview/panel')(
        nonce,
        csp,
        heroUri.toString(),
        heroAttackUri.toString(),
        bugUri.toString(),
        dungeonUri.toString(),
        flashscreenUri.toString(),
        loginBgUri.toString(),
        creditsBgUri.toString(),
        jasperUri.toString(),
        musicUri.toString(),
        phaserUri.toString(),
        vscodeBridgeUri.toString(),
        gameStateUri.toString(),
        uiRendererUri.toString(),
        eventHandlersUri.toString(),
        navigationUri.toString(),
        phaserSceneUri.toString(),
        playerName,
        runtimeBridgeUri,
        buildStamp
    );
}

function deactivate() {
    console.log('[NoCodeQuest] La aventura termina... hasta la próxima sesión.');
}

module.exports = { activate, deactivate };
