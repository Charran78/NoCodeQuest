/**
 * navigation.js
 * Navegacion entre flashscreen, login y juego
 */

const Navigation = {
    currentScreen: null,
    gameInitialized: false,
    phaserRuntimePromise: null,
    splashDurationMs: 5200,
    splashMessageIntervalMs: 950,
    creditsBubbleReminderMs: 10 * 60 * 1000,
    creditsBubbleFocusCooldownMs: 45000,
    flashMessages: [
        'Cargando... arrastrando y soltando scripts visuales',
        'Generando enemigos... sin una sola linea de codigo',
        'Buscando bugs... y fingiendo que son caracteristicas',
        'Compilando... espera, eso no es lo que hacemos aqui',
        'Importando assets... hemos pagado por esto?'
    ],
    messageIndex: 0,
    flashInterval: null,
    images: {
        flashscreen: null,
        login: null,
        credits: null,
        dungeon: null
    },
    playerName: 'Aventurero',
    lastNonCreditsScreen: 'login',
    creditsBubbleTimer: null,
    creditsBubbleCollapseTimer: null,
    creditsBubbleLastFocusNudgeAt: 0,
    creditLinks: [
        {
            id: 'repo',
            kicker: 'Desarrollo activo',
            title: 'NoCodeQuest sigue creciendo en GitHub',
            copy: 'Si quieres seguir la aventura desde cerca, entra al repo y mira los cambios, ideas y siguientes hechizos.',
            cta: 'Ir al repo',
            url: 'https://github.com/Charran78/NoCodeQuest'
        },
        {
            id: 'market',
            kicker: 'Instalacion',
            title: 'Ver la extension publicada en Open VSX',
            copy: 'Si te viene bien tenerla localizada fuera del repo, aqui tienes la ficha del market para compartirla o revisarla.',
            cta: 'Abrir Open VSX',
            url: 'https://open-vsx.org/extension/pedromencias/nocodequest'
        },
        {
            id: 'support',
            kicker: 'Apoyo directo',
            title: 'Invitar a un cafe y apoyar el desarrollo',
            copy: 'La aventura sigue en desarrollo activo. Si te esta gustando, un cafe ayuda a seguir picando codigo y puliendo ideas.',
            cta: 'Apoyar al dev',
            url: 'https://buymeacoffee.com/beyonddigiv'
        }
    ],

    init(config) {
        if (config && config.images) this.images = { ...this.images, ...config.images };
        if (config && config.playerName) this.playerName = config.playerName;
        this.createScreens();
        this.setupCreditsBubble();
        this.showScreen('flashscreen');
    },

    createScreens() {
        const root = document.getElementById('screens-container');
        if (!root) return;
        root.innerHTML = '';
        root.appendChild(this.buildFlashScreen());
        root.appendChild(this.buildLoginScreen());
        root.appendChild(this.buildCreditsScreen());
        root.appendChild(this.buildGameScreen());
    },

    buildFlashScreen() {
        const screen = document.createElement('div');
        screen.id = 'screen-flashscreen';
        screen.className = 'nav-screen';
        screen.style.cssText = [
            'background-color:#0d1117',
            this.images.flashscreen ? `background-image:url('${this.images.flashscreen}')` : '',
            'background-position:center',
            'background-repeat:no-repeat',
            'background-size:contain'
        ].join(';');

        const content = document.createElement('div');
        content.style.cssText = 'position:absolute;left:50%;bottom:20%;transform:translateX(-50%);width:min(80%,760px);text-align:center;padding:0 16px;';

        const message = document.createElement('div');
        message.id = 'flash-message';
        message.style.cssText = 'color:#fff;font-size:18px;font-weight:bold;text-shadow:0 2px 10px rgba(0,0,0,0.8);animation:fadeInOut 1.3s ease-in-out;';
        message.textContent = this.flashMessages[0];

        const style = document.createElement('style');
        style.textContent = '@keyframes fadeInOut {0%{opacity:0;transform:translateY(10px)}20%{opacity:1;transform:translateY(0)}80%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-10px)}} @keyframes reverberate {0%,100%{box-shadow:0 0 5px rgba(0,212,255,.5),0 0 10px rgba(0,212,255,.3),0 0 15px rgba(0,212,255,.1);transform:scale(1)}50%{box-shadow:0 0 10px rgba(0,212,255,.8),0 0 20px rgba(0,212,255,.5),0 0 30px rgba(0,212,255,.3),0 0 40px rgba(0,212,255,.1);transform:scale(1.04)}}';
        document.head.appendChild(style);

        content.appendChild(message);
        screen.appendChild(content);
        return screen;
    },

    buildLoginScreen() {
        const screen = document.createElement('div');
        screen.id = 'screen-login';
        screen.className = 'nav-screen';
        screen.style.cssText = [
            'background-color:#0d1117',
            this.images.login ? `background-image:url('${this.images.login}')` : '',
            'background-position:center',
            'background-repeat:no-repeat',
            'background-size:contain'
        ].join(';');

        const box = document.createElement('div');
        box.id = 'login-box';
        box.style.cssText = 'position:absolute;left:50%;bottom:35%;transform:translateX(-50%);width:min(90%,460px);text-align:center;padding:0 16px;';

        const name = document.createElement('div');
        name.id = 'login-name';
        name.style.cssText = 'color:#fff;font-size:16px;font-weight:bold;text-shadow:0 2px 8px rgba(0,0,0,0.8);margin-bottom:8px;';
        name.textContent = 'Nombre: ' + this.playerName;

        const pass = document.createElement('div');
        pass.id = 'login-pass';
        pass.style.cssText = 'color:#fff;font-size:14px;text-shadow:0 2px 8px rgba(0,0,0,0.8);margin-bottom:24px;';
        pass.textContent = 'Contraseña: ☠☠☠☠☠☠☠☠';

        const start = document.createElement('button');
        start.id = 'btn-start-game';
        start.type = 'button';
        start.textContent = 'Start';
        start.style.cssText = 'padding:14px 48px;font-size:18px;font-weight:bold;color:#00d4ff;background:transparent;border:2px solid #00d4ff;border-radius:8px;cursor:pointer;text-transform:uppercase;letter-spacing:4px;animation:reverberate 2s ease-in-out infinite;text-shadow:0 0 10px rgba(0,212,255,.5);';
        start.addEventListener('click', () => this.showScreen('game'));

        const credits = document.createElement('button');
        credits.id = 'btn-open-credits';
        credits.type = 'button';
        credits.textContent = 'Creditos';
        credits.className = 'menu-back-btn';
        credits.style.cssText = 'margin-top:14px;';

        box.appendChild(name);
        box.appendChild(pass);
        box.appendChild(start);
        box.appendChild(credits);
        screen.appendChild(box);
        return screen;
    },

    buildCreditsScreen() {
        const screen = document.createElement('div');
        screen.id = 'screen-credits';
        screen.className = 'nav-screen';
        screen.style.cssText = [
            'background-color:#0d1117',
            this.images.credits ? `background-image:url('${this.images.credits}')` : '',
            'background-position:center',
            'background-repeat:no-repeat',
            'background-size:contain'
        ].join(';');

        const topbar = document.createElement('div');
        topbar.id = 'credits-topbar';

        const back = document.createElement('button');
        back.id = 'btn-credits-back';
        back.type = 'button';
        back.className = 'menu-back-btn';
        back.textContent = 'Volver';
        topbar.appendChild(back);

        const panel = document.createElement('div');
        panel.id = 'credits-links-panel';
        panel.innerHTML = this.creditLinks.map((link) => `
            <div class="credits-link-card" data-credit-card="${this.escapeAttr(link.id)}">
                <div>
                    <div class="credits-link-kicker">${this.escapeHtml(link.kicker)}</div>
                    <div class="credits-link-title">${this.escapeHtml(link.title)}</div>
                </div>
                <div class="credits-link-copy">${this.escapeHtml(link.copy)}</div>
                <div>
                    <button class="credits-link-open" type="button" data-external-url="${this.escapeAttr(link.url)}">${this.escapeHtml(link.cta)}</button>
                    <div class="credits-link-url">${this.escapeHtml(link.url)}</div>
                </div>
            </div>
        `).join('');

        screen.appendChild(topbar);
        screen.appendChild(panel);
        return screen;
    },

    buildGameScreen() {
        const screen = document.createElement('div');
        screen.id = 'screen-game';
        screen.className = 'nav-screen';
        screen.style.cssText = 'background-color:#0d1117';

        screen.innerHTML = `
            <div id="game-ui">
                <header id="hud-top">
                    <div id="hud-row1">
                        <div id="player-info">
                            <span id="player-name" title="Nombre del aventurero">${this.playerName}</span>
                            <span id="player-level" title="Nivel actual">Nv.1</span>
                            <span id="player-rank" title="Rango del gremio">Novicio</span>
                            <span id="player-gold" title="Monedas disponibles">0 🪙</span>
                            <span id="coffee-count" title="Pociones de Café">☕ 0</span>
                            <span id="scroll-count" title="Pergaminos disponibles">📜 0</span>
                        </div>
                        <div id="plant-indicator" title="Estado de la planta">🌱</div>
                    </div>
                    <div id="hud-row2">
                        <span id="exp-label" title="Experiencia acumulada">EXP</span>
                        <div id="exp-bar-bg"><div id="exp-bar-fill"></div></div>
                        <span id="exp-values">0 / 200</span>
                    </div>
                </header>
                <div id="center-layout">
                    <div id="phaser-container">
                        <div id="view-controls">
                            <button id="btn-move-main" class="view-btn" type="button" title="Mover el panel al grupo principal del IDE">IDE</button>
                            <button id="btn-max-group" class="view-btn" type="button" title="Maximizar o restaurar el grupo actual">MAX</button>
                            <button id="btn-theater" class="view-btn" type="button" title="Expandir el marco de juego en modo teatro">THE</button>
                            <button id="btn-zen" class="view-btn" type="button" title="Alternar Zen Mode del editor">ZEN</button>
                        </div>
                    </div>
                    <aside id="side-panel">
                        <nav id="tab-bar">
                            <button class="side-tab active" data-tab="destiny" type="button" title="Cartas guiadas por el contexto del IDE">Destino</button>
                            <button class="side-tab" data-tab="inventory" type="button" title="Equipo, pociones y pergaminos del aventurero">Inventario</button>
                            <button class="side-tab" data-tab="quests" type="button" title="Encargos pendientes detectados en el proyecto">Misiones</button>
                            <button class="side-tab" data-tab="shop" type="button" title="Comprar y equipar reliquias">Mercado</button>
                            <button class="side-tab" data-tab="chronicle" type="button" title="Historial de hazañas y eventos">Cronica</button>
                        </nav>
                        <section id="tab-destiny" class="tab-content active">
                            <div id="destiny-actions">
                                <button id="destiny-send-to-jasper" class="chat-suggestion-btn" type="button" title="Pedir a Jasper consejo usando el contexto actual de Destino">Enviar a Jasper</button>
                            </div>
                            <div id="ide-summary"></div>
                            <div id="adventure-cards"></div>
                        </section>
                        <section id="tab-inventory" class="tab-content"><div id="inventory-list"></div></section>
                        <section id="tab-quests" class="tab-content"><div id="quest-list"></div></section>
                        <section id="tab-shop" class="tab-content"><div id="shop-list"></div></section>
                        <section id="tab-chronicle" class="tab-content"><div id="chronicle-list"></div></section>
                    </aside>
                </div>
                <div id="speech-area"><div id="speech-text">Jasper afina su laud mientras el reino despierta...</div></div>
                <div id="action-bar">
                    <button id="btn-attack" class="action-btn" type="button" title="Atacar al bug o ejecutar el arma equipada">Atacar</button>
                    <button id="btn-coffee" class="action-btn" type="button" title="Beber una Poción de Café para bajar la deuda técnica">Cafe</button>
                    <button id="btn-scroll" class="action-btn" type="button" title="Usar un pergamino de estabilidad">Pergamino</button>
                    <button id="btn-commit" class="action-btn" type="button" title="Preparar un Sello Real de commit">Commit</button>
                    <button id="btn-chat" class="action-btn" type="button" title="Abrir el consejo de Jasper y pedir contexto">Chat</button>
                    <div id="music-controls">
                        <button id="music-toggle" class="action-btn" type="button" title="Play/Pause">▶</button>
                        <button id="music-mute" class="action-btn" type="button" title="Silencio">🔇</button>
                        <input id="music-volume" type="range" min="0" max="100" value="70" />
                        <span id="music-status">Música: OFF · Vol 70%</span>
                    </div>
                    <button id="btn-market" class="action-btn" type="button" title="Abrir el mercado del gremio">Mercado</button>
                    <button id="btn-chronicle" class="action-btn" type="button" title="Abrir la crónica de aventuras">Cronica</button>
                    <button id="btn-snapshot" class="action-btn" type="button" title="Guardar una captura de la hazaña">Foto</button>
                </div>
                <div id="chat-overlay">
                    <div id="chat-header">
                        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                            <div id="jasper-portrait"></div>
                            <div style="display:flex;flex-direction:column;gap:4px;min-width:0;">
                                <span id="chat-title">Consejo de Jasper</span>
                                <span id="chat-oracle-status" class="chat-oracle-badge oracle-unknown">
                                    <span id="chat-oracle-led" class="chat-oracle-led"></span>
                                    <span id="chat-oracle-label">Oráculo desconocido</span>
                                </span>
                            </div>
                        </div>
                        <div id="chat-header-actions">
                            <button id="chat-inspect" class="chat-suggestion-btn" type="button">Inspeccionar</button>
                            <button id="chat-copy-ide" class="chat-suggestion-btn" type="button">Copiar IDE</button>
                            <button id="chat-regenerate" class="chat-suggestion-btn" type="button">Recrear</button>
                            <button id="chat-like" class="chat-suggestion-btn" type="button">👍</button>
                            <button id="chat-dislike" class="chat-suggestion-btn" type="button">👎</button>
                            <button id="chat-refresh" class="chat-suggestion-btn" type="button">Actualizar</button>
                            <button id="chat-export" class="chat-suggestion-btn" type="button">Exportar</button>
                            <button id="chat-close" type="button">×</button>
                        </div>
                    </div>
                    <div id="chat-quick-hint">Usa "Copiar IDE" para pegar la respuesta de Jasper en el chat del IDE y seguir la cadena de contexto.</div>
                    <div id="chat-quick-prompts">
                        <button class="chat-suggestion-btn chat-quick-btn" data-quick-prompt="cual es el siguiente paso que debemos dar en cuanto a codigo?" type="button">Siguiente paso</button>
                        <button class="chat-suggestion-btn chat-quick-btn" data-quick-prompt="que archivo deberiamos inspeccionar ahora mismo?" type="button">Abrir archivo</button>
                        <button class="chat-suggestion-btn chat-quick-btn" data-quick-prompt="que riesgo tecnico ves ahora mismo?" type="button">Riesgos</button>
                    </div>
                    <div id="chat-history"></div>
                    <div id="chat-favorites">
                        <div id="chat-favorites-title">Favoritas</div>
                        <div id="chat-favorites-list">Aun no has marcado respuestas utiles.</div>
                    </div>
                    <div id="chat-input-container">
                        <input id="chat-input" type="text" placeholder="Habla con Jasper..." />
                        <button id="chat-send" type="button">Enviar</button>
                    </div>
                </div>
                <div id="commit-modal">
                    <div id="commit-modal-card">
                        <div id="commit-modal-title">Sello Real</div>
                        <div id="commit-changed-files"></div>
                        <textarea id="commit-message-input" placeholder="Mensaje del commit"></textarea>
                        <div id="commit-modal-actions">
                            <button id="commit-cancel-btn" class="modal-btn" type="button">Cancelar</button>
                            <button id="commit-confirm-btn" class="modal-btn" type="button">Confirmar</button>
                        </div>
                    </div>
                </div>
                <div id="chronicle-modal">
                    <div id="chronicle-modal-card">
                        <div id="chronicle-modal-title">Crónica</div>
                        <div id="chronicle-modal-date"></div>
                        <div id="chronicle-modal-text"></div>
                        <div id="chronicle-modal-meta"></div>
                        <button id="chronicle-export-btn" class="modal-btn" type="button" hidden>Exportar</button>
                        <button id="chronicle-modal-close" class="modal-btn" type="button">Cerrar</button>
                    </div>
                </div>
                <button id="credits-floating-cta" type="button" title="Colabora con el desarrollador y abre la pantalla de creditos">
                    <span id="credits-floating-icon">+</span>
                    <span id="credits-floating-copy">
                        <span id="credits-floating-text">Invita un cafe al bardo</span>
                        <span id="credits-floating-badge">Dev</span>
                    </span>
                </button>
                <div id="floating-message"></div>
            </div>
        `;

        return screen;
    },

    showScreen(screenName) {
        document.querySelectorAll('.nav-screen').forEach((screen) => {
            screen.style.display = 'none';
        });

        if (this.flashInterval) {
            clearInterval(this.flashInterval);
            this.flashInterval = null;
        }

        if (screenName === 'flashscreen') {
            const screen = document.getElementById('screen-flashscreen');
            if (screen) {
                screen.style.display = 'block';
                this.startFlashMessages();
                setTimeout(() => {
                    if (this.currentScreen === 'flashscreen') this.showScreen('login');
                }, this.splashDurationMs);
            }
        } else if (screenName === 'login') {
            const screen = document.getElementById('screen-login');
            if (screen) screen.style.display = 'block';
        } else if (screenName === 'credits') {
            const screen = document.getElementById('screen-credits');
            if (screen) screen.style.display = 'block';
        } else if (screenName === 'game') {
            const screen = document.getElementById('screen-game');
            if (screen) {
                screen.style.display = 'block';
                this.initGame();
            }
        }

        if (screenName !== 'credits') {
            this.lastNonCreditsScreen = screenName;
        }
        this.updateCreditsBubbleVisibility(screenName);
        this.currentScreen = screenName;
    },

    openCredits(sourceScreen) {
        const origin = sourceScreen || (this.currentScreen && this.currentScreen !== 'credits' ? this.currentScreen : this.lastNonCreditsScreen || 'login');
        this.lastNonCreditsScreen = origin;
        this.showScreen('credits');
    },

    closeCredits() {
        this.showScreen(this.lastNonCreditsScreen || 'login');
    },

    startFlashMessages() {
        const messageEl = document.getElementById('flash-message');
        if (!messageEl) return;
        this.messageIndex = 0;
        messageEl.textContent = this.flashMessages[0];

        this.flashInterval = setInterval(() => {
            this.messageIndex = (this.messageIndex + 1) % this.flashMessages.length;
            messageEl.textContent = this.flashMessages[this.messageIndex];
            messageEl.style.animation = 'none';
            messageEl.offsetHeight;
            messageEl.style.animation = 'fadeInOut 1.3s ease-in-out';
        }, this.splashMessageIntervalMs);
    },

    loadScript(url) {
        return new Promise((resolve, reject) => {
            if (!url) {
                reject(new Error('URL de script no disponible'));
                return;
            }

            const existing = document.querySelector('script[data-runtime-src="' + url + '"]');
            if (existing) {
                if (existing.dataset.loaded === 'true') {
                    resolve();
                    return;
                }
                existing.addEventListener('load', () => resolve(), { once: true });
                existing.addEventListener('error', () => reject(new Error('No se pudo cargar: ' + url)), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = url;
            script.async = false;
            script.dataset.runtimeSrc = url;
            script.onload = () => {
                script.dataset.loaded = 'true';
                resolve();
            };
            script.onerror = () => reject(new Error('No se pudo cargar: ' + url));
            document.body.appendChild(script);
        });
    },

    ensurePhaserRuntime() {
        if (window.PhaserBridge && window.Phaser) {
            return Promise.resolve();
        }
        if (this.phaserRuntimePromise) {
            return this.phaserRuntimePromise;
        }

        const phaserUri = window.AppConfig?.phaserUri || '';
        const phaserSceneUri = window.AppConfig?.phaserSceneUri || '';
        this.phaserRuntimePromise = this.loadScript(phaserUri)
            .then(() => this.loadScript(phaserSceneUri))
            .catch((error) => {
                this.phaserRuntimePromise = null;
                throw error;
            });

        return this.phaserRuntimePromise;
    },

    setupCreditsBubble() {
        const bubble = document.getElementById('credits-floating-cta');
        const gameUi = document.getElementById('game-ui');
        if (!bubble) return;

        bubble.addEventListener('mouseenter', () => this.nudgeCreditsBubble('hover'));
        bubble.addEventListener('focus', () => this.nudgeCreditsBubble('focus'));

        if (gameUi) {
            gameUi.addEventListener('mouseenter', () => {
                const now = Date.now();
                if ((now - this.creditsBubbleLastFocusNudgeAt) < this.creditsBubbleFocusCooldownMs) return;
                this.creditsBubbleLastFocusNudgeAt = now;
                this.nudgeCreditsBubble('focus');
            });
        }

        if (this.creditsBubbleTimer) {
            clearInterval(this.creditsBubbleTimer);
        }
        this.creditsBubbleTimer = window.setInterval(() => {
            if (this.currentScreen === 'game') {
                this.nudgeCreditsBubble('timer');
            }
        }, this.creditsBubbleReminderMs);
    },

    nudgeCreditsBubble(reason) {
        const bubble = document.getElementById('credits-floating-cta');
        if (!bubble) return;
        bubble.classList.add('is-expanded', 'is-nudging');
        bubble.dataset.nudgeReason = reason || 'manual';
        window.clearTimeout(this.creditsBubbleCollapseTimer);
        this.creditsBubbleCollapseTimer = window.setTimeout(() => {
            bubble.classList.remove('is-expanded', 'is-nudging');
        }, reason === 'timer' ? 6200 : 3600);
    },

    updateCreditsBubbleVisibility(screenName) {
        const bubble = document.getElementById('credits-floating-cta');
        if (!bubble) return;
        bubble.style.display = screenName === 'game' ? 'inline-flex' : 'none';
    },

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    escapeAttr(value) {
        return this.escapeHtml(value).replace(/`/g, '');
    },

    initGame() {
        const bootPhaser = () => {
            if (window.PhaserBridge && !window.game) {
                const container = document.getElementById('phaser-container');
                if (container) {
                    window.PhaserBridge.init({
                        parentId: 'phaser-container',
                        width: Math.max(container.clientWidth, 640),
                        height: Math.max(container.clientHeight, 360)
                    });
                }
            }
        };

        if (!this.gameInitialized) {
            this.gameInitialized = true;
            if (window.UI) window.UI.init();
            if (window.EventHandlers) window.EventHandlers.init();

            this.ensurePhaserRuntime()
                .then(() => {
                    if (window.PreloadedAssets && window.PreloadedAssets.ready) {
                        return window.PreloadedAssets.ready.then(() => bootPhaser()).catch(() => bootPhaser());
                    }
                    bootPhaser();
                    return null;
                })
                .catch(() => {
                    const container = document.getElementById('phaser-container');
                    if (container) {
                        container.innerHTML = '<div style="padding:18px;color:#ffb3b3;">No se pudo invocar el motor visual de la mazmorra.</div>';
                    }
                });
        }

        if (window.PanelRuntime && typeof window.PanelRuntime.onGameReady === 'function') {
            window.PanelRuntime.onGameReady();
        }
    }
};

window.Navigation = Navigation;
