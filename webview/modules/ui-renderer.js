/**
 * ui-renderer.js
 * Renderizado principal de UI para la arquitectura modular
 */

const UI = {
    elements: {},
    lastAiModel: null,
    lastAssistantPayload: null,
    lastFeedback: null,
    actionStateTimers: new Map(),
    favoriteResponses: [],

    init() {
        this.cacheElements();
    },

    cacheElements() {
        this.elements = {
            playerName: document.getElementById('player-name'),
            playerLevel: document.getElementById('player-level'),
            playerRank: document.getElementById('player-rank'),
            playerGold: document.getElementById('player-gold'),
            coffeeCount: document.getElementById('coffee-count'),
            scrollCount: document.getElementById('scroll-count'),
            expBarFill: document.getElementById('exp-bar-fill'),
            expValues: document.getElementById('exp-values'),
            plantIndicator: document.getElementById('plant-indicator'),
            inventoryList: document.getElementById('inventory-list'),
            questList: document.getElementById('quest-list'),
            shopList: document.getElementById('shop-list'),
            chronicleList: document.getElementById('chronicle-list'),
            ideSummary: document.getElementById('ide-summary'),
            adventureCards: document.getElementById('adventure-cards'),
            speechText: document.getElementById('speech-text'),
            chatOverlay: document.getElementById('chat-overlay'),
            chatHistory: document.getElementById('chat-history'),
            chatInput: document.getElementById('chat-input'),
            chatTitle: document.getElementById('chat-title'),
            chatOracleStatus: document.getElementById('chat-oracle-status'),
            chatOracleLabel: document.getElementById('chat-oracle-label'),
            chatLike: document.getElementById('chat-like'),
            chatDislike: document.getElementById('chat-dislike'),
            chatFavoritesList: document.getElementById('chat-favorites-list'),
            floatingMessage: document.getElementById('floating-message'),
            commitModal: document.getElementById('commit-modal'),
            commitChangedFiles: document.getElementById('commit-changed-files'),
            commitMessageInput: document.getElementById('commit-message-input')
        };
    },

    renderInventory(state) {
        if (!state) return;
        if (window.GameState) window.GameState.update(state);
        this.updatePlayerInfo(state);
        this.updatePlantIndicator(state?.lair?.technical_debt_level > 25 ? 'marchita' : state?.lair?.technical_debt_level > 12 ? 'pachucha' : 'saludable');

        const expCurrent = state?.player?.exp || 0;
        const expNeeded = this.getExpNeeded(state?.player?.level || 1);
        this.updateExpBar(expCurrent, expNeeded);

        const inv = state.inventory || {};
        const sections = [];
        sections.push(this.renderEquipmentSection('Armas', inv.weapons || [], state?.player?.equipped?.weapon || null, 'weapon'));
        sections.push(this.renderEquipmentSection('Skins', inv.skins || [], state?.player?.equipped?.skin || null, 'skin'));
        sections.push(this.renderConsumableSection('Pergaminos', inv.scrolls || {}, 'Artefacto arcano utilizable.'));
        sections.push(this.renderConsumableSection('Pociones', inv.potions || {}, 'Consumible de estabilidad.'));
        sections.push(this.buildInventorySection('Insignias', (state.badges || []).join(', ') || 'Ninguna'));

        if (this.elements.inventoryList) {
            this.elements.inventoryList.innerHTML = sections.join('');
        }

        this.renderShop(state);
        this.renderChronicle(state);
    },

    renderIdeSummary(summary) {
        if (!this.elements.ideSummary) return;
        if (!summary) {
            this.elements.ideSummary.innerHTML = '';
            return;
        }

        const active = summary.activeFile || null;
        const diagnostics = summary.diagnostics || {};
        const modifiedFiles = Array.isArray(summary.modifiedFiles) ? summary.modifiedFiles : [];
        const topError = diagnostics.topError || null;

        const modifiedList = modifiedFiles.length
            ? '<div class="quest-text">' + modifiedFiles.map((file) => {
                const status = file.status ? ' [' + this.escapeHtml(file.status) + ']' : '';
                return this.escapeHtml(file.name || 'archivo') + status;
              }).join('<br>') + '</div>'
            : '<div class="quest-text">Sin cambios pendientes.</div>';

        const activeLine = active
            ? this.escapeHtml(active.name || 'archivo') + (active.isDirty ? ' *' : '')
            : 'Sin editor activo';

        const diagLine = 'Errores: ' + (diagnostics.errorCount || 0) + ' · Avisos: ' + (diagnostics.warnCount || 0);

        const topErrorLine = topError
            ? ('<div class="quest-text">' +
                this.escapeHtml((topError.file || 'archivo') + ':' + (topError.line || '?') + ' — ' + (topError.message || '')) +
              '</div>')
            : '<div class="quest-text">Sin errores críticos.</div>';

        this.elements.ideSummary.innerHTML = `
            <div class="quest-card">
                <div class="quest-title">Contexto del IDE</div>
                <div class="quest-meta">${this.escapeHtml(summary.workspaceName || 'workspace')} · ${this.escapeHtml(activeLine)}</div>
                <div class="quest-meta">${this.escapeHtml(diagLine)} · Modificados: ${this.escapeHtml(String(summary.modifiedCount || 0))}</div>
                ${topErrorLine}
                <div class="quest-meta">Cambios</div>
                ${modifiedList}
            </div>
        `;
    },

    updatePlayerInfo(state) {
        if (!state) return;
        if (this.elements.playerName) this.elements.playerName.textContent = state?.player?.name || window.AppConfig?.playerName || 'Aventurero';
        if (this.elements.playerLevel) this.elements.playerLevel.textContent = 'Nv.' + (state?.player?.level || 1);
        if (this.elements.playerGold) this.elements.playerGold.textContent = (state?.player?.gold || 0) + ' 🪙';
        if (this.elements.playerRank) this.elements.playerRank.textContent = this.getRankName(state?.player?.level || 1);
        if (this.elements.coffeeCount) {
            const coffee = state?.inventory?.potions?.pocion_cafe || 0;
            this.elements.coffeeCount.textContent = '☕ ' + coffee;
            this.elements.coffeeCount.title = 'Pociones de Café disponibles: ' + coffee;
        }
        if (this.elements.scrollCount) {
            const scrolls = Object.values(state?.inventory?.scrolls || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
            this.elements.scrollCount.textContent = '📜 ' + scrolls;
            this.elements.scrollCount.title = 'Pergaminos disponibles: ' + scrolls;
        }
    },

    updateExpBar(current, max) {
        if (!this.elements.expBarFill || !this.elements.expValues) return;
        const percentage = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
        this.elements.expBarFill.style.width = percentage + '%';
        this.elements.expValues.textContent = current + ' / ' + max;
    },

    updatePlantIndicator(health, emoji) {
        if (!this.elements.plantIndicator) return;
        const display = emoji || (health === 'saludable' ? '🌱' : health === 'pachucha' ? '🍂' : '🥀');
        this.elements.plantIndicator.textContent = display;
        this.elements.plantIndicator.title = 'Planta: ' + (health || 'saludable');
    },

    renderQuestBoard(quests) {
        if (!this.elements.questList) return;
        const list = (quests || []).map((quest) => `
            <div class="quest-card">
                <div class="quest-title">${this.escapeHtml(quest.title || 'Mision')}</div>
                <div class="quest-text">${this.escapeHtml(quest.description || 'Sin descripcion')}</div>
                <div class="quest-meta">EXP: ${quest.rewardExp || 0} | Oro: ${quest.rewardGold || 0}</div>
                <button class="btn-quest-accept" data-quest-id="${this.escapeAttr(quest.id || '')}" type="button">Aceptar</button>
            </div>
        `).join('');
        this.elements.questList.innerHTML = list || '<div class="quest-card"><div class="quest-text">No hay misiones activas.</div></div>';
    },

    renderAdventureCards(cards) {
        if (window.EventHandlers) window.EventHandlers.setAdventureCards(cards || []);
        if (!this.elements.adventureCards) return;
        const html = (cards || []).map((card) => `
            <div class="adventure-card" data-card-id="${this.escapeAttr(card.id || '')}">
                <div class="card-title">${this.escapeHtml(card.title || 'Destino')}</div>
                <div class="card-text">${this.escapeHtml(card.description || '')}</div>
                <div class="card-meta">Accion: ${this.escapeHtml(card.action || 'explorar')}</div>
                <button class="btn-card-action" data-card-id="${this.escapeAttr(card.id || '')}" type="button">${this.escapeHtml(card.cta || card.title || 'Seleccionar')}</button>
            </div>
        `).join('');
        this.elements.adventureCards.innerHTML = html || '<div class="adventure-card"><div class="card-text">No hay cartas disponibles.</div></div>';
    },

    removeAdventureCard(cardId) {
        if (!cardId || !this.elements.adventureCards) return;
        const el = this.elements.adventureCards.querySelector('[data-card-id="' + cardId + '"]');
        if (el) el.remove();
    },

    focusAdventureCard(cardId) {
        if (!cardId || !this.elements.adventureCards) return;
        this.elements.adventureCards.querySelectorAll('.adventure-card').forEach((card) => {
            card.classList.toggle('selected', card.getAttribute('data-card-id') === cardId);
        });
    },

    toggleChat(show) {
        if (!this.elements.chatOverlay) return;
        const shouldOpen = typeof show === 'boolean' ? show : !this.elements.chatOverlay.classList.contains('active');
        this.elements.chatOverlay.classList.toggle('active', shouldOpen);
        if (shouldOpen && window.VSCodeBridge) {
            window.VSCodeBridge.postMessage({ command: 'chatOpened' });
        }
        if (shouldOpen && this.elements.chatInput) this.elements.chatInput.focus();
    },

    appendChatMessage(role, text) {
        if (!this.elements.chatHistory) return;
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble ' + (role === 'user' ? 'user' : 'bard');
        bubble.textContent = text || '';
        this.elements.chatHistory.appendChild(bubble);
        this.elements.chatHistory.scrollTop = this.elements.chatHistory.scrollHeight;
    },

    renderChatResponse(data) {
        this.toggleChat(true);
        this.lastAiModel = data.aiModel || null;
        this.lastAssistantPayload = {
            userText: data.userText || '',
            text: data.text || '',
            suggestion: data.suggestion || null,
            aiModel: data.aiModel || null,
            oracle: data.oracle || null
        };
        this.lastFeedback = null;
        this.updateChatTitle();
        this.updateOracleStatus(data.oracle || null);
        if (data.oracle && data.oracle.state && data.oracle.state !== 'live') {
            this.appendChatMessage('bard', '[Estado del oráculo] ' + (data.oracle.label || 'Guía local') + (data.oracle.reason ? ' · ' + data.oracle.reason : ''));
        }
        this.appendChatMessage('bard', data.text || '');
        if (data.suggestion) this.renderChatSuggestion(data.suggestion);
        this.updateChatActions();
    },

    renderChatSuggestion(suggestion) {
        if (!suggestion || !suggestion.id || !this.elements.chatHistory) return;
        if (window.EventHandlers) window.EventHandlers.registerChatSuggestion(suggestion.id, suggestion);

        const wrapper = document.createElement('div');
        wrapper.className = 'chat-suggestion';
        wrapper.setAttribute('data-chat-suggestion-id', suggestion.id);

        const title = document.createElement('div');
        title.className = 'chat-suggestion-title';
        title.textContent = suggestion.title || 'Siguiente paso recomendado';

        const reason = document.createElement('div');
        reason.className = 'chat-suggestion-reason';
        reason.textContent = suggestion.reason || 'Jasper propone un ritual.';

        const meta = document.createElement('div');
        meta.className = 'chat-suggestion-meta';
        meta.textContent = (suggestion.recommended_action || 'accion') + (this.lastAiModel ? ' | ' + this.lastAiModel : '');

        const button = document.createElement('button');
        button.className = 'chat-suggestion-btn';
        button.type = 'button';
        button.setAttribute('data-chat-suggestion-btn', suggestion.id);
        button.textContent = suggestion.cta_label || 'Ejecutar';

        wrapper.appendChild(title);
        wrapper.appendChild(reason);
        wrapper.appendChild(meta);
        wrapper.appendChild(button);
        this.elements.chatHistory.appendChild(wrapper);
        this.elements.chatHistory.scrollTop = this.elements.chatHistory.scrollHeight;
    },

    markChatSuggestionUsed(suggestionId) {
        const wrapper = document.querySelector('[data-chat-suggestion-id="' + suggestionId + '"]');
        if (!wrapper) return;
        wrapper.classList.add('used');
        const button = wrapper.querySelector('[data-chat-suggestion-btn]');
        if (button) {
            button.disabled = true;
            button.textContent = 'Ritual enviado';
        }
    },

    updateChatTitle() {
        if (!this.elements.chatTitle) return;
        this.elements.chatTitle.textContent = this.lastAiModel ? 'Consejo de Jasper · ' + this.lastAiModel : 'Consejo de Jasper';
    },

    updateOracleStatus(oracle) {
        const el = this.elements.chatOracleStatus;
        if (!el) return;
        const state = oracle?.state || 'unknown';
        const label = oracle?.label || 'Oráculo desconocido';
        const labelEl = this.elements.chatOracleLabel;
        if (labelEl) {
            labelEl.textContent = label;
        } else {
            el.textContent = label;
        }
        el.title = oracle?.reason || label;
        el.classList.remove('oracle-live', 'oracle-cooldown', 'oracle-fallback', 'oracle-sleeping', 'oracle-unknown');
        if (state === 'live') {
            el.classList.add('oracle-live');
        } else if (state === 'cooldown') {
            el.classList.add('oracle-cooldown');
        } else if (state === 'fallback') {
            el.classList.add('oracle-fallback');
        } else if (state === 'sleeping') {
            el.classList.add('oracle-sleeping');
        } else {
            el.classList.add('oracle-unknown');
        }
    },

    updateChatActions() {
        const hasAssistantReply = !!(this.lastAssistantPayload && this.lastAssistantPayload.text);
        ['chat-inspect', 'chat-copy-ide', 'chat-regenerate', 'chat-like', 'chat-dislike'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.disabled = !hasAssistantReply && id !== 'chat-inspect';
        });

        if (this.elements.chatLike) {
            this.elements.chatLike.classList.toggle('chat-action-active', this.lastFeedback === 'like');
            this.elements.chatLike.classList.toggle('chat-action-negative', false);
        }
        if (this.elements.chatDislike) {
            this.elements.chatDislike.classList.toggle('chat-action-active', false);
            this.elements.chatDislike.classList.toggle('chat-action-negative', this.lastFeedback === 'dislike');
        }
    },

    markChatFeedback(kind) {
        this.lastFeedback = kind || null;
        if (kind === 'like' && this.lastAssistantPayload?.text) {
            this.favoriteResponses = [
                {
                    text: this.lastAssistantPayload.text,
                    userText: this.lastAssistantPayload.userText || '',
                    aiModel: this.lastAssistantPayload.aiModel || null,
                    savedAt: new Date().toISOString()
                },
                ...this.favoriteResponses.filter((entry) => entry.text !== this.lastAssistantPayload.text)
            ].slice(0, 6);
            this.renderFavoriteResponses();
        }
        this.updateChatActions();
    },

    renderFavoriteResponses() {
        if (!this.elements.chatFavoritesList) return;
        if (!this.favoriteResponses.length) {
            this.elements.chatFavoritesList.textContent = 'Aun no has marcado respuestas utiles.';
            return;
        }

        this.elements.chatFavoritesList.innerHTML = this.favoriteResponses.map((entry, index) => `
            <div class="chat-favorite-item" data-favorite-index="${index}">
                <div class="chat-favorite-text">${this.escapeHtml(entry.text)}</div>
                <div class="chat-favorite-meta">${this.escapeHtml(entry.aiModel || 'Jasper')} · ${this.escapeHtml(entry.savedAt || '')}</div>
            </div>
        `).join('');
    },

    useFavoriteResponse(index) {
        const entry = this.favoriteResponses[index];
        if (!entry) return;
        if (this.elements.chatInput) {
            this.elements.chatInput.value = entry.userText || entry.text || '';
            this.elements.chatInput.focus();
        }
        this.showFloatingMessage('Favorita enviada al pergamino de entrada', 1600, '#00d4ff');
    },

    setChatActionState(buttonId, state, label) {
        const el = document.getElementById(buttonId);
        if (!el) return;
        if (!el.dataset.defaultLabel) el.dataset.defaultLabel = el.textContent || '';
        const defaultLabel = el.dataset.defaultLabel;
        const timer = this.actionStateTimers.get(buttonId);
        if (timer) clearTimeout(timer);

        el.classList.remove('chat-action-active', 'chat-action-negative', 'chat-action-info');
        el.disabled = state === 'working';

        if (state === 'working') {
            el.textContent = label || '...';
            el.classList.add('chat-action-active');
            return;
        }

        if (state === 'done') {
            el.textContent = label || 'Listo';
            el.classList.add('chat-action-active');
        } else if (state === 'info') {
            el.textContent = label || 'Info';
            el.classList.add('chat-action-info');
        } else if (state === 'error') {
            el.textContent = label || 'Error';
            el.classList.add('chat-action-negative');
        } else {
            el.textContent = defaultLabel;
            return;
        }

        this.actionStateTimers.set(buttonId, setTimeout(() => {
            el.textContent = defaultLabel;
            el.classList.remove('chat-action-active', 'chat-action-negative', 'chat-action-info');
            el.disabled = false;
            this.actionStateTimers.delete(buttonId);
        }, 1600));
    },

    speak(text) {
        if (this.elements.speechText) this.elements.speechText.textContent = text || '';
    },

    showCommitModal(payload) {
        if (this.elements.commitChangedFiles) {
            const files = (payload && payload.changedFiles) || [];
            this.elements.commitChangedFiles.textContent = files.length ? 'Pergaminos: ' + files.join(', ') : '';
        }
        if (this.elements.commitMessageInput) {
            this.elements.commitMessageInput.value = (payload && payload.suggestedMessage) || '';
        }
        if (this.elements.commitModal) this.elements.commitModal.classList.add('active');
    },

    hideCommitModal() {
        if (this.elements.commitModal) this.elements.commitModal.classList.remove('active');
    },

    showFloatingMessage(text, duration, color) {
        const el = this.elements.floatingMessage;
        if (!el) return;
        el.textContent = text || '';
        el.style.color = color || '#00d4ff';
        el.style.opacity = '1';
        el.style.transform = 'translate(-50%, -50%)';
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translate(-50%, calc(-50% - 12px))';
        }, duration || 2000);
    },

    showLevelUp(level, rank) {
        if (this.elements.playerLevel) this.elements.playerLevel.textContent = 'Nv.' + (level || 1);
        if (this.elements.playerRank) this.elements.playerRank.textContent = rank || this.elements.playerRank.textContent;
        this.showFloatingMessage('Nivel ' + (level || 1), 1800, '#ffd700');
    },

    switchTab(tabName) {
        document.querySelectorAll('.side-tab').forEach((tab) => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });
        document.querySelectorAll('.tab-content').forEach((content) => {
            content.classList.toggle('active', content.id === 'tab-' + tabName);
        });
    },

    renderShop(state) {
        if (!this.elements.shopList) return;

        const player = state?.player || {};
        const inventory = state?.inventory || {};
        const cards = [
            { id: 'pocion_cafe', title: 'Pocion de Cafe', price: 30, slot: null, owned: (inventory.potions?.pocion_cafe || 0) > 0, type: 'consumible' },
            { id: 'pergamino_estabilidad', title: 'Pergamino de Estabilidad', price: 80, slot: null, owned: (inventory.scrolls?.pergamino_estabilidad || 0) > 0, type: 'consumible' },
            { id: 'espada_linter', title: 'Espada del Linter', price: 120, slot: 'weapon', owned: (inventory.weapons || []).includes('espada_linter'), equipped: player?.equipped?.weapon === 'espada_linter', type: 'weapon' },
            { id: 'arco_breakpoint', title: 'Arco del Breakpoint', price: 180, slot: 'weapon', owned: (inventory.weapons || []).includes('arco_breakpoint'), equipped: player?.equipped?.weapon === 'arco_breakpoint', type: 'weapon' },
            { id: 'skin_mago', title: 'Tunica del Mago', price: 140, slot: 'skin', owned: (inventory.skins || []).includes('skin_mago'), equipped: player?.equipped?.skin === 'skin_mago', type: 'skin' },
            { id: 'traje_arquitecto', title: 'Traje del Arquitecto', price: 200, slot: 'skin', owned: (inventory.skins || []).includes('traje_arquitecto'), equipped: player?.equipped?.skin === 'traje_arquitecto', type: 'skin' }
        ];

        this.elements.shopList.innerHTML = cards.map((item) => {
            let actionHtml = `<button class="btn-buy" data-item="${this.escapeAttr(item.id)}" data-price="${item.price}" type="button" title="Comprar ${this.escapeAttr(item.title)} por ${item.price} monedas">Comprar · ${item.price} 🪙</button>`;
            if (item.owned && item.slot) {
                actionHtml = item.equipped
                    ? `<button class="btn-equip" data-item="${this.escapeAttr(item.id)}" data-slot="${item.slot}" type="button" disabled title="${this.escapeAttr(item.title)} ya está equipado">Equipado</button>`
                    : `<button class="btn-equip" data-item="${this.escapeAttr(item.id)}" data-slot="${item.slot}" type="button" title="Equipar ${this.escapeAttr(item.title)}">Equipar</button>`;
            } else if (item.owned && !item.slot) {
                const amount = item.id === 'pocion_cafe'
                    ? (inventory.potions?.pocion_cafe || 0)
                    : (inventory.scrolls?.[item.id] || 0);
                actionHtml = `<button class="btn-buy" data-item="${this.escapeAttr(item.id)}" data-price="${item.price}" type="button" title="Comprar otra unidad de ${this.escapeAttr(item.title)}">Comprar más · ${item.price} 🪙</button><div class="inventory-meta">En bolsa: ${amount}</div>`;
            }

            return `
                <div class="inventory-card">
                    <div class="inventory-title">${this.escapeHtml(item.title)}</div>
                    <div class="inventory-meta">Tipo: ${this.escapeHtml(item.type)} | Oro actual: ${player.gold || 0}</div>
                    <div class="inventory-text">${this.escapeHtml(item.owned ? 'Disponible en tu inventario.' : 'A la venta en el mercado del gremio.')}</div>
                    ${actionHtml}
                </div>
            `;
        }).join('');
    },

    renderChronicle(state) {
        if (!this.elements.chronicleList) return;
        const entries = Array.isArray(state?.adventureLog) ? state.adventureLog : [];
        this.elements.chronicleList.innerHTML = entries.length
            ? entries.map((entry, index) => `
                <div class="quest-card chronicle-entry" data-chronicle-index="${index}">
                    <div class="quest-title">${this.escapeHtml(entry.title || entry.type || 'Hazana')}</div>
                    <div class="quest-text">${this.escapeHtml(entry.chronicleText || entry.description || '')}</div>
                    <div class="quest-meta">${this.escapeHtml(entry.recordedAt || '')}</div>
                </div>
            `).join('')
            : '<div class="quest-card"><div class="quest-text">Aun no hay entradas en la cronica.</div></div>';
    },

    buildInventorySection(title, text) {
        return `
            <div class="inventory-card">
                <div class="inventory-title">${this.escapeHtml(title)}</div>
                <div class="inventory-text">${this.escapeHtml(text)}</div>
            </div>
        `;
    },

    renderEquipmentSection(title, items, equippedId, slotType) {
        const list = (items || []).length ? (items || []).map((itemId) => {
            const equipped = itemId === equippedId;
            return `
                <div class="inventory-card" title="${this.escapeAttr(this.humanizeItemName(itemId))}">
                    <div class="inventory-title">${this.escapeHtml(this.humanizeItemName(itemId))}</div>
                    <div class="inventory-meta">${equipped ? 'Actualmente equipado' : 'Disponible en inventario'}</div>
                    <button class="btn-equip" data-item="${this.escapeAttr(itemId)}" data-slot="${slotType}" type="button" ${equipped ? 'disabled' : ''}>${equipped ? 'Equipado' : 'Equipar'}</button>
                </div>
            `;
        }).join('') : '<div class="inventory-card"><div class="inventory-text">Ninguno.</div></div>';

        return `<div class="inventory-section"><div class="inventory-title">${this.escapeHtml(title)}</div>${list}</div>`;
    },

    renderConsumableSection(title, map, description) {
        const entries = Object.entries(map || {}).filter(([, amount]) => Number(amount) > 0);
        const list = entries.length ? entries.map(([itemId, amount]) => `
            <div class="inventory-card" title="${this.escapeAttr(this.humanizeItemName(itemId))}">
                <div class="inventory-title">${this.escapeHtml(this.humanizeItemName(itemId))}</div>
                <div class="inventory-meta">Cantidad: ${this.escapeHtml(String(amount))}</div>
                <div class="inventory-text">${this.escapeHtml(description)}</div>
            </div>
        `).join('') : '<div class="inventory-card"><div class="inventory-text">Ninguno.</div></div>';

        return `<div class="inventory-section"><div class="inventory-title">${this.escapeHtml(title)}</div>${list}</div>`;
    },

    humanizeItemName(itemId) {
        const names = {
            martillo_refactor: 'Martillo de la Refactorizacion',
            espada_linter: 'Espada del Linter',
            arco_breakpoint: 'Arco del Breakpoint',
            mono_fabrica: 'Mono de Fabrica',
            skin_mago: 'Tunica del Mago',
            traje_arquitecto: 'Traje del Arquitecto',
            pergamino_estabilidad: 'Pergamino de Estabilidad',
            pergamino_sabiduria: 'Pergamino de Sabiduria',
            pocion_cafe: 'Pocion de Cafe'
        };
        return names[itemId] || itemId;
    },

    formatMap(map) {
        if (!map) return 'Ninguno';
        const parts = Object.keys(map)
            .filter((key) => map[key])
            .map((key) => key + ': ' + map[key]);
        return parts.join(', ') || 'Ninguno';
    },

    getExpNeeded(level) {
        const table = {
            1: 200,
            2: 400,
            3: 600,
            4: 800,
            5: 1000
        };
        return table[level] || 1200;
    },

    getRankName(level) {
        const ranks = {
            1: 'Picacodigo Junior',
            2: 'Artesano de Funciones',
            3: 'Caballero del Clean Code',
            4: 'Mago del Backend',
            5: 'Gran Maestro de Sistemas',
            6: 'Leyenda del Repositorio'
        };
        return ranks[level] || 'Aventurero';
    },

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    escapeAttr(value) {
        return this.escapeHtml(value).replace(/`/g, '');
    }
};

window.UI = UI;
