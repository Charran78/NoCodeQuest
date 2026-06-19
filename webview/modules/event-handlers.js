/**
 * event-handlers.js
 * Módulo de manejo de eventos
 */

const EventHandlers = {
    currentAdventureCards: [],
    currentChatSuggestions: new Map(),
    compactActions: new Map(),
    initialized: false,
    
    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.setupEventDelegation();
        this.setupKeyboardHandlers();
        this.setupPhaserEventBridge();
    },
    
    setupEventDelegation() {
        document.addEventListener('click', (e) => this.handleClick(e));
    },
    
    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                UI.toggleChat(false);
                return;
            }

            const chatInput = e.target && e.target.id === 'chat-input';
            if (chatInput && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleChatSubmit();
            }
        });
    },
    
    setupPhaserEventBridge() {
        window.PhaserEventBridge = {
            onAttackComplete: () => this.handlePhaserAttack(),
            onDamageTaken: (amount) => this.handlePhaserDamage(amount),
            onVictory: () => this.handlePhaserVictory()
        };
    },
    
    handleClick(e) {
        const target = e.target;
        
        // Botones principales
        if (target.closest('#btn-attack')) {
            this.handleAttack();
            return;
        }
        
        if (target.closest('#btn-coffee')) {
            this.handleCoffee();
            return;
        }
        
        if (target.closest('#btn-scroll')) {
            this.handleScroll();
            return;
        }
        
        if (target.closest('#btn-commit')) {
            this.handleCommit();
            return;
        }
        
        if (target.closest('#btn-chat')) {
            UI.toggleChat();
            return;
        }

        if (target.closest('#btn-market')) {
            UI.switchTab('shop');
            return;
        }

        if (target.closest('#btn-chronicle')) {
            UI.switchTab('chronicle');
            return;
        }
        
        if (target.closest('#btn-snapshot')) {
            this.handleSnapshot();
            return;
        }
        
        // Tabs
        const tabBtn = target.closest('[data-tab]');
        if (tabBtn) {
            const tabName = tabBtn.getAttribute('data-tab');
            if (tabName) UI.switchTab(tabName);
            return;
        }
        
        // Compra de items
        const buyBtn = target.closest('.btn-buy');
        if (buyBtn) {
            const item = buyBtn.getAttribute('data-item');
            const price = parseInt(buyBtn.getAttribute('data-price'), 10);
            if (item && !isNaN(price)) {
                VSCodeBridge.postMessage({ command: 'purchaseItem', itemId: item, price });
            }
            return;
        }
        
        // Equipar items
        const equipBtn = target.closest('.btn-equip');
        if (equipBtn) {
            const item = equipBtn.getAttribute('data-item');
            const slot = equipBtn.getAttribute('data-slot');
            if (item && slot) {
                VSCodeBridge.postMessage({ command: 'equipItemRequest', itemId: item, slotType: slot });
            }
            return;
        }
        
        // Quests
        const questBtn = target.closest('.btn-quest-accept');
        if (questBtn) {
            const questId = questBtn.getAttribute('data-quest-id');
            if (questId) {
                VSCodeBridge.postMessage({ command: 'acceptQuestRequest', questId });
            }
            return;
        }
        
        // Cartas de aventura
        const cardBtn = target.closest('.adventure-card, .btn-card-action');
        if (cardBtn) {
            const cardId = cardBtn.getAttribute('data-card-id');
            const card = this.currentAdventureCards.find(c => c.id === cardId);
            if (card) this.handleAdventureCard(card);
            return;
        }
        
        // Chat send
        if (target.closest('#chat-send')) {
            this.handleChatSubmit();
            return;
        }
        
        // Chat close
        if (target.closest('#chat-close')) {
            UI.toggleChat(false);
            return;
        }
        
        // Chat export
        if (target.closest('#chat-export')) {
            VSCodeBridge.postMessage({ command: 'exportChatTranscript' });
            return;
        }

        if (target.closest('#chat-refresh')) {
            if (window.UI) window.UI.setChatActionState('chat-refresh', 'working', 'Diff...');
            VSCodeBridge.postMessage({ command: 'refreshIdeContext' });
            return;
        }

        if (target.closest('#chat-inspect')) {
            if (window.UI) window.UI.setChatActionState('chat-inspect', 'working', 'Abriendo...');
            VSCodeBridge.postMessage({ command: 'runInspectCodeRitual' });
            return;
        }

        if (target.closest('#chat-copy-ide')) {
            if (window.UI) window.UI.setChatActionState('chat-copy-ide', 'working', 'Copiando...');
            VSCodeBridge.postMessage({ command: 'copyLatestChatResponse' });
            return;
        }

        if (target.closest('#chat-regenerate')) {
            if (window.UI) window.UI.setChatActionState('chat-regenerate', 'working', 'Releyendo...');
            VSCodeBridge.postMessage({ command: 'regenerateChatResponse' });
            return;
        }

        if (target.closest('#chat-like')) {
            if (window.UI && typeof window.UI.markChatFeedback === 'function') {
                window.UI.markChatFeedback('like');
            }
            VSCodeBridge.postMessage({ command: 'chatFeedback', kind: 'like' });
            return;
        }

        if (target.closest('#destiny-send-to-jasper')) {
            if (window.UI) window.UI.setChatActionState('destiny-send-to-jasper', 'working', 'Consultando...');
            VSCodeBridge.postMessage({ command: 'askJasperAboutDestiny' });
            return;
        }

        const quickPromptBtn = target.closest('[data-quick-prompt]');
        if (quickPromptBtn) {
            const prompt = quickPromptBtn.getAttribute('data-quick-prompt');
            if (prompt) {
                UI.appendChatMessage('user', prompt);
                VSCodeBridge.postMessage({ command: 'chatMessage', text: prompt });
            }
            return;
        }

        const favoriteItem = target.closest('[data-favorite-index]');
        if (favoriteItem) {
            const index = parseInt(favoriteItem.getAttribute('data-favorite-index'), 10);
            if (!isNaN(index) && window.UI && typeof window.UI.useFavoriteResponse === 'function') {
                window.UI.useFavoriteResponse(index);
            }
            return;
        }

        // Sugerencias de chat
        const suggestionBtn = target.closest('[data-chat-suggestion-btn]');
        if (suggestionBtn) {
            const suggestionId = suggestionBtn.getAttribute('data-chat-suggestion-btn');
            if (suggestionId) this.handleChatSuggestion(suggestionId);
            return;
        }
        
        // Acciones del compact
        const compactActionBtn = target.closest('.compact-action-btn');
        if (compactActionBtn) {
            const actionId = compactActionBtn.getAttribute('data-action-id');
            const action = this.compactActions.get(actionId);
            if (action) this.handleCompactAction(action);
            return;
        }

        if (target.closest('#chat-dislike')) {
            if (window.UI && typeof window.UI.markChatFeedback === 'function') {
                window.UI.markChatFeedback('dislike');
            }
            VSCodeBridge.postMessage({ command: 'chatFeedback', kind: 'dislike' });
            return;
        }
        
        // Botones de vista
        if (target.closest('#btn-move-main')) {
            VSCodeBridge.postMessage({ command: 'moveToColumnOne' });
            return;
        }
        
        if (target.closest('#btn-max-group')) {
            VSCodeBridge.postMessage({ command: 'toggleMaximizeEditorGroup' });
            return;
        }
        
        if (target.closest('#btn-theater')) {
            document.body.classList.toggle('layout-theater');
            return;
        }
        
        if (target.closest('#btn-zen')) {
            document.body.classList.toggle('layout-zen');
            VSCodeBridge.postMessage({ command: 'toggleZenMode' });
            return;
        }
        
        // Modal de commit
        if (target.closest('#commit-confirm-btn')) {
            this.handleCommitConfirm();
            return;
        }
        
        if (target.closest('#commit-cancel-btn') || target.id === 'commit-modal') {
            this.handleCommitCancel();
            return;
        }
        
        // Modal de crónica
        if (target.closest('#chronicle-modal-close') || target.id === 'chronicle-modal') {
            this.handleChronicleClose();
            return;
        }
        
        if (target.closest('#chronicle-export-btn')) {
            this.handleChronicleExport();
            return;
        }
        
        // Entradas de crónica
        const chronicleEntry = target.closest('.chronicle-entry');
        if (chronicleEntry) {
            const index = parseInt(chronicleEntry.getAttribute('data-chronicle-index'), 10);
            if (!isNaN(index)) this.handleChronicleEntry(index);
            return;
        }
    },
    
    handleAttack() {
        const weapon = GameState.getEquippedWeapon();
        PhaserBridge.triggerAttack(weapon);
        VSCodeBridge.postMessage({ command: 'executeWeaponStrike' });
    },
    
    handleCoffee() {
        VSCodeBridge.postMessage({ command: 'consumeCoffeeRequest' });
    },
    
    handleScroll() {
        VSCodeBridge.postMessage({ command: 'triggerScrollEffect', scroll: 'pergamino_estabilidad' });
    },
    
    handleCommit() {
        VSCodeBridge.postMessage({ command: 'commitChangesRequest' });
    },
    
    handleSnapshot() {
        if (window.game && window.game.renderer) {
            window.game.renderer.snapshot((image) => {
                VSCodeBridge.postMessage({ command: 'saveAchievementImage', base64Data: image.src });
            });
        }
    },
    
    handleAdventureCard(card) {
        if (!card) return;
        
        // Highlight visual
        document.querySelectorAll('.adventure-card').forEach(el => {
            el.classList.toggle('selected', el.getAttribute('data-card-id') === card.id);
        });
        
        VSCodeBridge.postMessage({ command: 'cardSelected', card });
    },
    
    handleChatSuggestion(suggestionId) {
        const suggestion = this.currentChatSuggestions.get(suggestionId);
        if (!suggestion) return;
        
        // Marcar como usado visualmente
        const wrapper = document.querySelector('[data-chat-suggestion-id="' + suggestionId + '"]');
        if (wrapper) {
            wrapper.classList.add('used');
            const btn = wrapper.querySelector('.chat-suggestion-btn');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Ritual enviado';
            }
        }
        
        // Enviar a la extensión
        if (suggestion.source === 'adventure_card' && suggestion.payload?.card) {
            VSCodeBridge.postMessage({
                command: 'executeStructuredSuggestion',
                suggestion: suggestion
            });
        } else if (suggestion.source === 'compact_actions') {
            VSCodeBridge.postMessage({
                command: 'executeCompactAction',
                action: suggestion.payload
            });
        }
    },
    
    handleCompactAction(action) {
        if (!action || !action.type) return;
        
        VSCodeBridge.postMessage({
            command: 'executeCompactAction',
            action: action
        });
    },
    
    handleChatSubmit() {
        const input = document.getElementById('chat-input');
        if (!input) return;
        
        const text = input.value.trim();
        if (!text) return;
        
        UI.appendChatMessage('user', text);
        input.value = '';
        
        VSCodeBridge.postMessage({ command: 'chatMessage', text });
    },
    
    handleCommitConfirm() {
        const input = document.getElementById('commit-message-input');
        const message = input ? input.value.trim() : '';
        
        VSCodeBridge.postMessage({
            command: 'confirmCommitRequest',
            commitMessage: message
        });
        
        this.handleCommitCancel(); // Cerrar modal
    },
    
    handleCommitCancel() {
        const modal = document.getElementById('commit-modal');
        if (modal) modal.classList.remove('active');
    },
    
    handleChronicleEntry(index) {
        const entry = window.GameState && typeof window.GameState.getAdventureLog === 'function'
            ? window.GameState.getAdventureLog()[index]
            : null;
        if (!entry) return;

        const modal = document.getElementById('chronicle-modal');
        const date = document.getElementById('chronicle-modal-date');
        const text = document.getElementById('chronicle-modal-text');
        const meta = document.getElementById('chronicle-modal-meta');
        const exportBtn = document.getElementById('chronicle-export-btn');

        if (date) date.textContent = entry.recordedAt || '';
        if (text) text.textContent = entry.chronicleText || entry.description || entry.title || '';
        if (meta) {
            const parts = [];
            if (entry.rewardExp) parts.push('EXP: ' + entry.rewardExp);
            if (entry.rewardGold) parts.push('Oro: ' + entry.rewardGold);
            if (entry.targetFile) parts.push(entry.targetFile);
            meta.textContent = parts.join(' | ');
        }
        if (exportBtn) exportBtn.hidden = true;
        if (modal) modal.classList.add('active');
    },
    
    handleChronicleClose() {
        const modal = document.getElementById('chronicle-modal');
        if (modal) modal.classList.remove('active');
    },
    
    handleChronicleExport() {
        VSCodeBridge.postMessage({ command: 'exportChronicle' });
    },
    
    // Handlers para eventos de Phaser
    handlePhaserAttack() {
        // Lógica post-ataque
    },
    
    handlePhaserDamage(amount) {
        // Lógica de daño recibido
        UI.showFloatingMessage('-' + amount + ' HP', 1500, '#ff4444');
    },
    
    handlePhaserVictory() {
        UI.showFloatingMessage('Victoria!', 2000, '#00ff88');
    },
    
    // Actualizar referencias a cartas
    setAdventureCards(cards) {
        this.currentAdventureCards = cards || [];
    },
    
    // Guardar referencia a sugerencia de chat
    registerChatSuggestion(id, suggestion) {
        this.currentChatSuggestions.set(id, suggestion);
    },
    
    // Guardar acción del compact
    registerCompactAction(id, action) {
        this.compactActions.set(id, action);
    }
};

// Exportar
window.EventHandlers = EventHandlers;
