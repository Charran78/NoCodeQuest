/**
 * webview/panel.js
 * Generador del WebView completo de NoCodeQuest
 * Phaser.js (escena de combate) + HTML (paneles de UI)
 * Carga de assets 100% manual para evitar problemas de crossOrigin en WebView.
 */

module.exports = function generatePanel(nonce, csp, heroUri, bugUri, dungeonUri) {
    const heroUriSafe    = JSON.stringify(heroUri);
    const bugUriSafe     = JSON.stringify(bugUri);
    const dungeonUriSafe = JSON.stringify(dungeonUri);

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>⚔️ NoCodeQuest</title>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.0/dist/phaser.min.js"></script>
  <style>
    :root {
      --bg:         #0d1117;
      --panel:      rgba(13, 22, 38, 0.96);
      --border:     #1e3a5f;
      --border2:    #2a4a6b;
      --green:      #00ff88;
      --cyan:       #00d4ff;
      --gold:       #ffd700;
      --red:        #ff4444;
      --orange:     #ff8800;
      --purple:     #9b59b6;
      --text:       #c9d1d9;
      --text-dim:   #6e7681;
      --font:       'Courier New', Courier, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      font-size: 11px;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── HUD Superior ─────────────────────────────── */
    #hud-top {
      background: var(--panel);
      border-bottom: 1px solid var(--border);
      padding: 6px 8px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    #hud-row1 {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #player-info { display: flex; gap: 10px; align-items: center; }
    #player-name { color: var(--cyan); font-weight: bold; font-size: 12px; }
    #player-level { color: var(--gold); }
    #player-rank  { color: var(--text-dim); font-size: 10px; }
    #player-gold  { color: var(--gold); }

    #plant-indicator { font-size: 13px; cursor: default; }

    #hud-row2 { display: flex; align-items: center; gap: 6px; }
    #exp-label { color: var(--text-dim); white-space: nowrap; font-size: 10px; }
    #exp-bar-bg {
      flex: 1;
      height: 8px;
      background: #1a2332;
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
    }
    #exp-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--green), #00cc66);
      border-radius: 4px;
      transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
    }
    #exp-values { color: var(--text-dim); font-size: 9px; white-space: nowrap; }

    /* ── Layout central ───────────────────────────── */
    #center-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* ── Canvas de Phaser ─────────────────────────── */
    #phaser-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    #phaser-container canvas { display: block; }

    /* ── Notificación de victoria/nivel flotante ─── */
    #floating-message {
      position: absolute;
      top: 20px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.85);
      border: 1px solid var(--gold);
      color: var(--gold);
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 12px;
      text-align: center;
      display: none;
      z-index: 20;
      pointer-events: none;
    }

    /* ── Panel lateral derecho ────────────────────── */
    #side-panel {
      width: 175px;
      min-width: 175px;
      background: var(--panel);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    #side-tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
    }
    .side-tab {
      flex: 1;
      padding: 5px 2px;
      text-align: center;
      cursor: pointer;
      color: var(--text-dim);
      font-size: 9px;
      border: none;
      background: transparent;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    .side-tab:hover { color: var(--text); background: rgba(255,255,255,0.05); }
    .side-tab.active { color: var(--cyan); border-bottom-color: var(--cyan); }

    .tab-content { display: none; flex: 1; overflow-y: auto; padding: 6px; }
    .tab-content.active { display: block; }

    /* Scrollbar medieval */
    .tab-content::-webkit-scrollbar { width: 4px; }
    .tab-content::-webkit-scrollbar-track { background: #0d1117; }
    .tab-content::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

    /* ── Tablón de misiones ───────────────────────── */
    .section-title {
      color: var(--gold);
      font-size: 9px;
      font-weight: bold;
      border-bottom: 1px solid var(--border);
      padding-bottom: 3px;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .quest-item {
      background: rgba(255,215,0,0.06);
      border: 1px solid rgba(255,215,0,0.2);
      border-radius: 4px;
      padding: 5px;
      margin-bottom: 5px;
      cursor: default;
    }
    .quest-type { font-weight: bold; font-size: 9px; }
    .quest-type.TODO  { color: var(--cyan); }
    .quest-type.FIXME { color: var(--red); }
    .quest-type.HACK  { color: var(--orange); }
    .quest-desc { color: var(--text); font-size: 9px; margin: 2px 0; word-break: break-word; }
    .quest-reward { color: var(--green); font-size: 8px; }
    .no-quests { color: var(--text-dim); font-size: 9px; text-align: center; padding: 10px; font-style: italic; }

    /* ── Tienda ───────────────────────────────────── */
    .shop-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 4px;
      border-bottom: 1px solid rgba(30,58,95,0.5);
      gap: 4px;
    }
    .shop-item-info { flex: 1; }
    .shop-item-name { color: var(--text); font-size: 9px; }
    .shop-item-price { color: var(--gold); font-size: 9px; }
    .btn-buy {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid var(--cyan);
      color: var(--cyan);
      font-size: 8px;
      padding: 2px 5px;
      cursor: pointer;
      border-radius: 3px;
      font-family: var(--font);
      transition: all 0.2s;
      white-space: nowrap;
    }
    .btn-buy:hover { background: rgba(0,212,255,0.25); }
    .btn-buy:disabled { opacity: 0.4; cursor: not-allowed; }

    /* ── Arsenal ──────────────────────────────────── */
    .arsenal-section { margin-bottom: 10px; }
    .arsenal-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px;
      border-radius: 3px;
      margin-bottom: 3px;
      gap: 4px;
    }
    .arsenal-item.equipped { background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3); }
    .arsenal-item:not(.equipped) { background: rgba(255,255,255,0.03); }
    .arsenal-item-name { flex: 1; font-size: 9px; color: var(--text); }
    .equipped-badge { color: var(--gold); font-size: 8px; }
    .btn-equip {
      background: rgba(155,89,182,0.15);
      border: 1px solid var(--purple);
      color: var(--purple);
      font-size: 8px;
      padding: 2px 4px;
      cursor: pointer;
      border-radius: 3px;
      font-family: var(--font);
      transition: all 0.2s;
    }
    .btn-equip:hover { background: rgba(155,89,182,0.3); }

    /* ── Badges ───────────────────────────────────── */
    .badges-grid { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .badge-chip {
      background: rgba(255,215,0,0.1);
      border: 1px solid rgba(255,215,0,0.3);
      border-radius: 3px;
      padding: 2px 5px;
      font-size: 8px;
      color: var(--gold);
    }

    /* ── Burbuja del Bardo ────────────────────────── */
    #speech-area {
      background: var(--panel);
      border-top: 1px solid var(--border);
      padding: 6px 8px;
      min-height: 60px;
      max-height: 80px;
      overflow-y: auto;
      flex-shrink: 0;
    }
    #speech-area::-webkit-scrollbar { width: 4px; }
    #speech-area::-webkit-scrollbar-thumb { background: var(--border2); }
    #speech-label { color: var(--gold); font-size: 9px; margin-bottom: 3px; font-weight: bold; }
    #speech-text {
      color: var(--green);
      font-size: 10px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    /* ── Barra de acciones ────────────────────────── */
    #action-bar {
      background: var(--panel);
      border-top: 1px solid var(--border);
      padding: 5px 8px;
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      flex-shrink: 0;
    }
    .action-btn {
      flex: 1;
      min-width: 60px;
      padding: 5px 4px;
      font-family: var(--font);
      font-size: 9px;
      font-weight: bold;
      border-radius: 4px;
      cursor: pointer;
      border: 1px solid;
      transition: all 0.2s;
      text-align: center;
    }
    .action-btn:hover { filter: brightness(1.3); transform: translateY(-1px); }
    .action-btn:active { transform: translateY(0); }

    #btn-attack  { background: rgba(255,68,68,0.15); border-color: var(--red); color: var(--red); }
    #btn-coffee  { background: rgba(255,136,0,0.15); border-color: var(--orange); color: var(--orange); }
    #btn-scroll  { background: rgba(0,212,255,0.1); border-color: var(--cyan); color: var(--cyan); }
    #btn-snapshot{ background: rgba(155,89,182,0.15); border-color: var(--purple); color: var(--purple); }

    /* ── Boss HP Bar ──────────────────────────────── */
    #boss-bar {
      display: none;
      background: rgba(80,0,0,0.9);
      border: 1px solid var(--red);
      border-radius: 4px;
      padding: 5px 8px;
      margin: 4px 8px;
      text-align: center;
    }
    #boss-bar-label { color: var(--red); font-weight: bold; font-size: 10px; margin-bottom: 3px; }
    #boss-heads { display: flex; gap: 4px; justify-content: center; }
    .boss-head-pip {
      width: 16px; height: 16px;
      background: var(--red);
      border-radius: 2px;
      font-size: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .boss-head-pip.dead { background: #333; }

    /* ── Animaciones CSS ──────────────────────────── */
    @keyframes flash-gold {
      0%,100% { opacity: 1; }
      50% { opacity: 0.3; background: rgba(255,215,0,0.3); }
    }
    @keyframes pulse-red {
      0%,100% { box-shadow: 0 0 0 0 rgba(255,0,0,0); }
      50%      { box-shadow: 0 0 20px 5px rgba(255,0,0,0.6); }
    }
    @keyframes slide-in-text {
      from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .level-up-anim { animation: flash-gold 0.3s ease 3; }
    .boss-mode { animation: pulse-red 1.5s infinite; }
  </style>
</head>
<body>

<!-- ╔═ HUD SUPERIOR ════════════════════════════════╗ -->
<div id="hud-top">
  <div id="hud-row1">
    <div id="player-info">
      <span id="player-name">Aventurero</span>
      <span id="player-level">Nv.1</span>
      <span id="player-rank">Picacódigo Junior</span>
      <span id="player-gold">🪙 50</span>
    </div>
    <div style="display:flex; align-items:center; gap:6px;">
      <span title="Stock de Pociones de Café">☕<span id="coffee-count">0</span></span>
      <span id="plant-indicator" title="Salud de la Planta de la Guarida">🌱</span>
    </div>
  </div>
  <div id="hud-row2">
    <span id="exp-label">EXP</span>
    <div id="exp-bar-bg"><div id="exp-bar-fill"></div></div>
    <span id="exp-values">0/200</span>
  </div>
</div>

<!-- ╔═ BOSS HP BAR ══════════════════════════════════╗ -->
<div id="boss-bar">
  <div id="boss-bar-label">🐉 DRAGÓN DEL MERGE CONFLICT</div>
  <div id="boss-heads"></div>
</div>

<!-- ╔═ LAYOUT CENTRAL ═══════════════════════════════╗ -->
<div id="center-layout">

  <!-- Canvas de Phaser -->
  <div id="phaser-container" style="position:relative;">
    <div id="floating-message"></div>
  </div>

  <!-- Panel lateral derecho -->
  <div id="side-panel">
    <div id="side-tabs">
      <button class="side-tab active" data-tab="quests">📌 Quests</button>
      <button class="side-tab" data-tab="shop">🛒 Mercado</button>
      <button class="side-tab" data-tab="arsenal">🛡️ Arsenal</button>
    </div>

    <!-- Tab: Tablón de Misiones -->
    <div id="tab-quests" class="tab-content active">
      <div class="section-title">📌 Tablón de Anuncios</div>
      <div id="quests-list"><p class="no-quests">No hay misiones activas.<br>Añade un // TODO: en tu código.</p></div>
    </div>

    <!-- Tab: Mercado del Gremio -->
    <div id="tab-shop" class="tab-content">
      <div class="section-title">🛒 Mercado del Gremio</div>
      <div class="shop-item">
        <div class="shop-item-info">
          <div class="shop-item-name">☕ Poción de Café</div>
          <div class="shop-item-price">30 🪙 — Cura caos (-15)</div>
        </div>
        <button class="btn-buy" data-item="pocion_cafe" data-price="30">Comprar</button>
      </div>
      <div class="shop-item">
        <div class="shop-item-info">
          <div class="shop-item-name">⚔️ Espada del Linter</div>
          <div class="shop-item-price">100 🪙 — Auto-fix</div>
        </div>
        <button class="btn-buy" data-item="espada_linter" data-price="100">Comprar</button>
      </div>
      <div class="shop-item">
        <div class="shop-item-info">
          <div class="shop-item-name">🏹 Arco del Breakpoint</div>
          <div class="shop-item-price">250 🪙 — +25% EXP crit</div>
        </div>
        <button class="btn-buy" data-item="arco_breakpoint" data-price="250">Comprar</button>
      </div>
      <div class="shop-item">
        <div class="shop-item-info">
          <div class="shop-item-name">🔮 Túnica del Mago</div>
          <div class="shop-item-price">500 🪙 — Skin épica</div>
        </div>
        <button class="btn-buy" data-item="skin_mago" data-price="500">Comprar</button>
      </div>
      <div class="shop-item">
        <div class="shop-item-info">
          <div class="shop-item-name">📜 Pergamino Estabilidad</div>
          <div class="shop-item-price">80 🪙 — git reset HEAD</div>
        </div>
        <button class="btn-buy" data-item="pergamino_estabilidad" data-price="80">Comprar</button>
      </div>
    </div>

    <!-- Tab: Arsenal y Skins -->
    <div id="tab-arsenal" class="tab-content">
      <div class="section-title">⚔️ Armas</div>
      <div id="arsenal-weapons"></div>
      <div class="section-title" style="margin-top:8px;">👕 Skins</div>
      <div id="arsenal-skins"></div>
      <div class="section-title" style="margin-top:8px;">🏅 Logros</div>
      <div id="badges-display" class="badges-grid"></div>
    </div>
  </div>
</div>

<!-- ╔═ SPEECH BUBBLE (JASKIER) ══════════════════════╗ -->
<div id="speech-area">
  <div id="speech-label">🎵 Jaskier el Bardo dice:</div>
  <div id="speech-text">⚔️ Explorando las catacumbas del directorio raíz... El camino está despejado, Aventurero.</div>
</div>

<!-- ╔═ BARRA DE ACCIONES ════════════════════════════╗ -->
<div id="action-bar">
  <button id="btn-attack"   class="action-btn">⚔️ Atacar</button>
  <button id="btn-coffee"   class="action-btn">☕ Café</button>
  <button id="btn-scroll"   class="action-btn">📜 Pergamino</button>
  <button id="btn-snapshot" class="action-btn">📸 Gesta</button>
</div>

<!-- ╔═ SCRIPT DEL JUEGO (carga manual de imágenes + Phaser) ═══════════════════╗ -->
<script nonce="${nonce}">
'use strict';

const HERO_URI    = ${heroUriSafe};
const BUG_URI     = ${bugUriSafe};
const DUNGEON_URI = ${dungeonUriSafe};

console.log('[NoCodeQuest] HERO_URI:', HERO_URI);
console.log('[NoCodeQuest] BUG_URI:', BUG_URI);
console.log('[NoCodeQuest] DUNGEON_URI:', DUNGEON_URI);

const vscode = acquireVsCodeApi();
let gameState = null;
let scene = null;
let game = null;
let heroPawn, bugPawn, bossPawn;
let heroShadow, bugShadow; // 👈 Añade esta nueva línea
let bgImage;
let assetsLoaded = false;
let enemyVisible = false;
let bossHeads = 0;

// ─── Carga manual de imágenes (evita el loader nativo y sus restricciones) ──
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo cargar: ' + url));
        img.src = url;
    });
}

let loadedDungeon, loadedHero, loadedBug;

function startGame() {
    console.log('[NoCodeQuest] Iniciando Phaser con texturas precargadas...');

    const config = {
        type: Phaser.AUTO,
        parent: 'phaser-container',
        backgroundColor: '#111625',
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: {
            create: createScene,
            update: function() {}
        }
    };

    game = new Phaser.Game(config);
}

function createScene() {
    scene = this;
    assetsLoaded = true;

    // Inyectar las imágenes como texturas
    this.textures.addImage('dungeon', loadedDungeon);
    this.textures.addSpriteSheet('hero', loadedHero, { frameWidth: 64, frameHeight: 64 });
    this.textures.addSpriteSheet('bug', loadedBug, { frameWidth: 64, frameHeight: 64 });

    const W = this.scale.width;
    const H = this.scale.height;
    console.log('[NoCodeQuest] Canvas:', W, 'x', H);
    console.log('[NoCodeQuest] Texturas en cache:', this.textures.getTextureKeys());

    try {
        bgImage = this.add.image(0, 0, 'dungeon').setOrigin(0, 0).setDisplaySize(W, H);
        console.log('[NoCodeQuest] Fondo cargado');

        this.add.rectangle(0, 0, W, H, 0x000000, 0.3).setOrigin(0, 0);

        const heroX = Math.max(60, W * 0.18);
        const heroY = H * 0.72;
        // 1. Crear Sombra del Héroe (Ancho: 40px, Alto: 12px, Color: Negro, Transparencia: 40%)
        // Ajustamos la Y un poco más abajo (+22) para que quede justo en la base del sprite de 32x32 escalado a 1.5
        heroShadow = this.add.ellipse(heroX, heroY + 22, 40, 12, 0x000000, 0.4);
        // 👈 Cambia 2.5 por 1.5 para hacerlo más pequeño
        heroPawn = this.add.sprite(heroX, heroY, 'hero').setScale(1.5);
        console.log('[NoCodeQuest] Héroe cargado');
        this.tweens.add({
            targets: heroPawn,
            y: heroY - 5,
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        const bugX = W - Math.max(60, W * 0.18);
        const bugY = H * 0.72;
        // 2. Crear Sombra del Bug (Oculta por defecto igual que el bug)
        bugShadow = this.add.ellipse(bugX, bugY + 22, 40, 12, 0x000000, 0.4).setVisible(false);
        // 👈 Cambia 2.5 por 1.5 para hacerlo más pequeño y setVisible(true) para que se vea
        bugPawn = this.add.sprite(bugX, bugY, 'bug').setScale(1.5).setVisible(true).setFlipX(true);
        console.log('[NoCodeQuest] Bug cargado');

        bossPawn = this.add.rectangle(W / 2, H * 0.35, 80, 65, 0x3d0c02).setVisible(false);

        this.scale.on('resize', (gs) => {
            const nW = gs.width, nH = gs.height;
            if (bgImage) bgImage.setDisplaySize(nW, nH);
            heroPawn.setPosition(Math.max(60, nW * 0.18), nH * 0.72);
            bugPawn.setPosition(nW - Math.max(60, nW * 0.18), nH * 0.72);
            bossPawn.setPosition(nW / 2, nH * 0.35);

            // Reposicionar sombras 👈 Añade estas dos líneas
            if (heroShadow) heroShadow.setPosition(Math.max(60, nW * 0.18), (nH * 0.72) + 22);
            if (bugShadow) bugShadow.setPosition(nW - Math.max(60, nW * 0.18), (nH * 0.72) + 22);
        });

        this.add.text(W/2, 50, '⚔️ NoCodeQuest - ¡Listo!', {
            fontFamily: 'Courier New',
            fontSize: '16px',
            color: '#00ff88',
            align: 'center'
        }).setOrigin(0.5);

    } catch (err) {
        console.error('[NoCodeQuest] Error en createScene:', err);
    }

                // 1. Creamos la animación del héroe (fotogramas del 0 al 7)
        this.anims.create({
            key: 'hero_anim',
            frames: this.anims.generateFrameNumbers('hero', { start: 0, end: 7 }),
            frameRate: 5, // Velocidad (10 fotogramas por segundo)
            repeat: -1     // Bucle infinito
        });

        // 2. Creamos la animación del bug
        this.anims.create({
            key: 'bug_anim',
            frames: this.anims.generateFrameNumbers('bug', { start: 0, end: 7 }),
            frameRate: 5,
            repeat: -1
        });

        // 3. Activamos las animaciones en los personajes
        heroPawn.play('hero_anim');
        bugPawn.play('bug_anim');

}

// ── EFECTOS VISUALES Y LÓGICA DE COMBATE ────────────────────────────────
function spawnMonster() {
    if (!scene || !assetsLoaded) return;
    bugShadow.setVisible(true); // 👈 Mostrar sombra
    bugPawn.setVisible(true);
    enemyVisible = true;
    scene.cameras.main.shake(200, 0.008);
    scene.tweens.add({
        targets: bugPawn,
        alpha: { from: 0, to: 1 },
        scaleX: { from: 3.5, to: 2.5 },
        scaleY: { from: 3.5, to: 2.5 },
        duration: 300,
        ease: 'Back.easeOut'
    });
}
function victoryEffect() {
    if (!scene || !assetsLoaded || !enemyVisible) return;
    enemyVisible = false;
    bugShadow.setVisible(false); // 👈 Ocultar sombra al morir
    scene.tweens.add({
        targets: bugPawn,
        alpha: 0, y: bugPawn.y + 30,
        duration: 400,
        ease: 'Quad.easeIn',
        onComplete: () => { bugPawn.setVisible(false).setAlpha(1); }
    });
    scene.cameras.main.flash(300, 0, 255, 80, true);
    spawnParticles(bugPawn.x, bugPawn.y, 0x00ff88, 20);
}
function levelUpEffect(level, rank) {
    if (!scene) return;
    scene.cameras.main.shake(500, 0.02);
    scene.cameras.main.flash(600, 255, 215, 0, true);
    spawnParticles(scene.scale.width / 2, scene.scale.height / 2, 0xffd700, 40);
    showFloatingMessage('👑 ¡NIVEL ' + level + '!\\n' + rank, 3000, '#ffd700');
}
function spawnParticles(x, y, color, count) {
    if (!scene) return;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const speed = 60 + Math.random() * 80;
        const dot = scene.add.rectangle(x, y, 4, 4, color);
        scene.tweens.add({
            targets: dot,
            x: x + Math.cos(angle) * speed * (0.5 + Math.random()),
            y: y + Math.sin(angle) * speed * (0.5 + Math.random()) - 30,
            alpha: 0, scaleX: 0, scaleY: 0,
            duration: 600 + Math.random() * 400,
            ease: 'Quad.easeOut',
            onComplete: () => dot.destroy()
        });
    }
}
function attackEffect(weapon) {
    if (!scene || !assetsLoaded || !enemyVisible) return;
    const sx = heroPawn.x + 20, sy = heroPawn.y;
    const tx = bugPawn.x - 20, ty = bugPawn.y;
    if (weapon === 'espada_linter') {
        const beam = scene.add.rectangle(sx, sy, 8, 3, 0x00ff88);
        scene.tweens.add({
            targets: beam,
            x: tx, scaleX: 5,
            duration: 150,
            ease: 'Expo.easeIn',
            onComplete: () => {
                beam.destroy();
                impactEnemy();
                spawnParticles(tx, ty, 0x00ff88, 12);
            }
        });
    } else if (weapon === 'arco_breakpoint') {
        const arrow = scene.add.rectangle(sx, sy, 12, 2, 0x00d4ff);
        scene.tweens.add({
            targets: arrow,
            x: tx, y: ty,
            duration: 250,
            ease: 'Linear',
            onComplete: () => {
                arrow.destroy();
                impactEnemy();
                spawnParticles(tx, ty, 0x00d4ff, 10);
                scene.tweens.add({
                    targets: bugPawn,
                    tint: 0x00d4ff,
                    duration: 200,
                    yoyo: true, repeat: 2
                });
            }
        });
    } else {
        const spark = scene.add.circle(sx, sy - 10, 5, 0xff8800);
        scene.tweens.add({
            targets: spark,
            x: (sx + tx) / 2, y: sy - 50,
            duration: 120,
            ease: 'Quad.easeOut',
            onComplete: () => {
                scene.tweens.add({
                    targets: spark,
                    x: tx, y: ty,
                    duration: 120,
                    ease: 'Quad.easeIn',
                    onComplete: () => {
                        spark.destroy();
                        impactEnemy();
                        spawnParticles(tx, ty, 0xff8800, 8);
                    }
                });
            }
        });
    }
}
function impactEnemy() {
    if (!scene || !bugPawn.visible) return;
    scene.cameras.main.shake(120, 0.006);
    const origX = bugPawn.x;
    scene.tweens.add({
        targets: bugPawn,
        x: origX + 15,
        duration: 60,
        yoyo: true,
        ease: 'Sine.easeInOut',
        onComplete: () => {
            scene.tweens.add({ targets: bugPawn, tint: 0xff3333, duration: 100,
                onComplete: () => scene.tweens.add({ targets: bugPawn, tint: 0xffffff, duration: 150 })
            });
        }
    });
}
function spawnBossDragon(heads) {
    if (!scene) return;
    bossHeads = heads;
    enemyVisible = false;
    bugPawn.setVisible(false);
    bossPawn.setVisible(true);
    scene.cameras.main.shake(800, 0.03);
    scene.cameras.main.setBackgroundColor('#2a0000');
    bgImage.setTint(0xff4444);
    scene.tweens.add({
        targets: bossPawn,
        scaleX: 1.05, scaleY: 1.05,
        duration: 300,
        yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut'
    });
    updateBossHPBar(heads);
    document.getElementById('boss-bar').style.display = 'block';
    document.body.classList.add('boss-mode');
}
function damageBossEffect(headsLeft) {
    if (!scene) return;
    scene.cameras.main.flash(200, 255, 255, 255, true);
    spawnParticles(bossPawn.x, bossPawn.y, 0xff4444, 10);
    updateBossHPBar(headsLeft);
}
function bossDefeatedEffect() {
    if (!scene) return;
    scene.tweens.killTweensOf(bossPawn);
    scene.tweens.add({
        targets: bossPawn,
        alpha: 0, scale: 3,
        duration: 600,
        ease: 'Quad.easeOut',
        onComplete: () => { bossPawn.setVisible(false).setAlpha(1).setScale(1); }
    });
    scene.cameras.main.setBackgroundColor('#111625');
    scene.cameras.main.flash(800, 0, 255, 80, true);
    bgImage.clearTint();
    document.getElementById('boss-bar').style.display = 'none';
    document.body.classList.remove('boss-mode');
    spawnParticles(scene.scale.width / 2, scene.scale.height / 2, 0xffd700, 60);
    showFloatingMessage('🐉 ¡DRAGÓN DERROTADO!\\n+300 EXP | +150 🪙', 4000, '#ff4444');
}
function updateHeroSkin(skin) {
    if (!scene || !heroPawn) return;
    if (skin === 'skin_mago') {
        heroPawn.setTint(0x9b59b6);
        scene.tweens.add({ targets: heroPawn, alpha: 0.75, duration: 800, yoyo: true, repeat: -1 });
    } else {
        heroPawn.clearTint();
        scene.tweens.killTweensOf(heroPawn);
        heroPawn.setAlpha(1);
    }
}
function updatePlantIndicator(health, emoji) {
    document.getElementById('plant-indicator').textContent = emoji;
    document.getElementById('plant-indicator').title = 'Planta de la Guarida: ' + health;
}
function showFloatingMessage(text, duration = 2000, color = '#ffd700') {
    const el = document.getElementById('floating-message');
    el.textContent = text;
    el.style.color = color;
    el.style.borderColor = color;
    el.style.display = 'block';
    el.style.animation = 'slide-in-text 0.3s ease';
    setTimeout(() => { el.style.display = 'none'; }, duration);
}
function updateBossHPBar(headsLeft) {
    bossHeads = Math.max(0, headsLeft);
    const container = document.getElementById('boss-heads');
    const totalHeads = Math.max(bossHeads, container.children.length || bossHeads);
    container.innerHTML = '';
    for (let i = 0; i < totalHeads; i++) {
        const pip = document.createElement('div');
        pip.className = 'boss-head-pip' + (i >= bossHeads ? ' dead' : '');
        pip.textContent = i < bossHeads ? '🐉' : '💀';
        container.appendChild(pip);
    }
}
function renderInventory(state) {
    if (!state) return;
    gameState = state;
    const { player, inventory, badges, lair } = state;
    document.getElementById('player-name').textContent = player.name;
    document.getElementById('player-level').textContent = 'Nv.' + player.level;
    document.getElementById('player-gold').textContent  = '🪙 ' + player.gold;
    document.getElementById('coffee-count').textContent = inventory.potions?.pocion_cafe || 0;
    const expNeeded = player.level * 200;
    const pct = Math.min(100, (player.exp / expNeeded) * 100);
    document.getElementById('exp-bar-fill').style.width = pct + '%';
    document.getElementById('exp-values').textContent   = player.exp + '/' + expNeeded;

    const weaponsEl = document.getElementById('arsenal-weapons');
    const WEAPON_NAMES = {
        martillo_refactor: '🔨 Martillo Refactor',
        espada_linter:     '⚔️ Espada del Linter',
        arco_breakpoint:   '🏹 Arco Breakpoint'
    };
    weaponsEl.innerHTML = inventory.weapons.map(w => {
        const equipped = player.equipped.weapon === w;
        return '<div class="arsenal-item' + (equipped ? ' equipped' : '') + '">' +
          '<span class="arsenal-item-name">' + (WEAPON_NAMES[w] || w) + '</span>' +
          (equipped
            ? '<span class="equipped-badge">[E]</span>'
            : '<button class="btn-equip" data-item="' + w + '" data-slot="weapon">Equipar</button>') +
        '</div>';
    }).join('');

    const skinsEl = document.getElementById('arsenal-skins');
    const SKIN_NAMES = {
        mono_fabrica:     '👕 Mono de Fábrica',
        manto_bardo:      '🎵 Manto del Bardo',
        traje_arquitecto: '🧥 Traje Arquitecto',
        skin_mago:        '🔮 Túnica del Mago'
    };
    skinsEl.innerHTML = inventory.skins.map(s => {
        const equipped = player.equipped.skin === s;
        return '<div class="arsenal-item' + (equipped ? ' equipped' : '') + '">' +
          '<span class="arsenal-item-name">' + (SKIN_NAMES[s] || s) + '</span>' +
          (equipped
            ? '<span class="equipped-badge">[E]</span>'
            : '<button class="btn-equip" data-item="' + s + '" data-slot="skin">Vestir</button>') +
        '</div>';
    }).join('');

    const BADGE_NAMES = {
        primer_commit:   '🔒 Primer Commit',
        cazador_nulls:   '💀 Cazador de Nulls',
        primer_encargo:  '📜 Primer Encargo',
        asesino_dragones:'🐉 Cazador de Dragones',
        exterminador:    '☠️ Exterminador'
    };
    document.getElementById('badges-display').innerHTML = badges.length
        ? badges.map(b => '<span class="badge-chip">' + (BADGE_NAMES[b] || b) + '</span>').join('')
        : '<span style="color:var(--text-dim);font-size:9px">Sin logros aún...</span>';

    const chaos = lair?.technical_debt_level || 0;
    const emoji = chaos === 0 ? '🌿' : chaos < 10 ? '🌱' : chaos < 20 ? '🍂' : '🥀';
    document.getElementById('plant-indicator').textContent = emoji;
    document.getElementById('plant-indicator').title = 'Caos del código: ' + chaos;
}
function renderQuestBoard(quests) {
    const list = document.getElementById('quests-list');
    if (!quests || quests.length === 0) {
        list.innerHTML = '<p class="no-quests">No hay misiones activas.<br>Añade un // TODO: en tu código.</p>';
        return;
    }
    list.innerHTML = quests.map(q =>
      '<div class="quest-item">' +
        '<div class="quest-type ' + q.type + '">' + q.title + '</div>' +
        '<div class="quest-desc">' + escHtml(q.description) + '</div>' +
        '<div class="quest-reward">💎 +' + q.rewardExp + ' EXP | 🪙 +' + q.rewardGold + ' G</div>' +
      '</div>'
    ).join('');
}
function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function speak(text) {
    const el = document.getElementById('speech-text');
    el.textContent = text;
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = '';
    document.getElementById('speech-area').scrollTop = 0;
}
function switchTab(name) {
    document.querySelectorAll('.side-tab').forEach((t,i) => {
        t.classList.toggle('active', ['quests','shop','arsenal'][i] === name);
    });
    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.toggle('active', c.id === 'tab-' + name);
    });
}

// ── DELEGACIÓN DE EVENTOS ──────────────────────────────────────────────
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-tab]');
    if (target) {
        const tab = target.getAttribute('data-tab');
        if (tab) switchTab(tab);
        return;
    }
    if (e.target.closest('#btn-attack')) {
        attackWithWeapon();
        return;
    }
    if (e.target.closest('#btn-coffee')) {
        useCoffee();
        return;
    }
    if (e.target.closest('#btn-scroll')) {
        useScroll();
        return;
    }
    if (e.target.closest('#btn-snapshot')) {
        takeSnapshot();
        return;
    }
    const buyBtn = e.target.closest('.btn-buy');
    if (buyBtn) {
        const item = buyBtn.getAttribute('data-item');
        const price = parseInt(buyBtn.getAttribute('data-price'), 10);
        if (item && !isNaN(price)) purchaseItem(item, price);
        return;
    }
    const equipBtn = e.target.closest('.btn-equip');
    if (equipBtn) {
        const item = equipBtn.getAttribute('data-item');
        const slot = equipBtn.getAttribute('data-slot');
        if (item && slot) doEquip(item, slot);
        return;
    }
});

function attackWithWeapon() {
    const weapon = gameState?.player?.equipped?.weapon || 'martillo_refactor';
    attackEffect(weapon);
    vscode.postMessage({ command: 'executeWeaponStrike' });
}
function useCoffee() {
    vscode.postMessage({ command: 'consumeCoffeeRequest' });
}
function useScroll() {
    vscode.postMessage({ command: 'triggerScrollEffect', scroll: 'pergamino_estabilidad' });
}
function purchaseItem(itemId, price) {
    vscode.postMessage({ command: 'purchaseItem', itemId, price });
}
function doEquip(itemId, slotType) {
    vscode.postMessage({ command: 'equipItemRequest', itemId, slotType });
}
function takeSnapshot() {
    game.renderer.snapshot((image) => {
        vscode.postMessage({ command: 'saveAchievementImage', base64Data: image.src });
    });
}

// ── RECEPTOR DE MENSAJES DESDE extension.js ─────────────────────────────
window.addEventListener('message', (event) => {
    const data = event.data;
    switch (data.command) {
        case 'syncInventory':
            renderInventory(data.state);
            break;
        case 'spawnMonster':
            spawnMonster();
            speak('⚠️ [Monstruo detectado en la línea ' + ((data.details?.line || 0) + 1) + '] ' + (data.details?.message || ''));
            break;
        case 'victory':
            victoryEffect();
            renderInventory(data.state);
            speak('🎉 ¡Estocada perfecta! El bug se desvanece en polvo arcano.');
            break;
        case 'speak':
            speak(data.text || '');
            break;
        case 'levelUpVisual':
            levelUpEffect(data.level, data.rank || '');
            document.getElementById('player-level').textContent = 'Nv.' + data.level;
            document.getElementById('player-level').style.animation = 'flash-gold 0.5s ease 3';
            document.getElementById('player-rank').textContent = data.rank || '';
            break;
        case 'combatResult':
            if (data.narration) speak(data.narration);
            if (data.state) renderInventory(data.state);
            showFloatingMessage('+' + (data.reward?.expGained || 0) + ' EXP | +' + (data.reward?.goldGained || 0) + ' 🪙', 1500, '#00ff88');
            break;
        case 'purchaseResult':
            if (data.success) {
                if (data.narration) speak(data.narration);
                if (data.state) renderInventory(data.state);
                showFloatingMessage('🛍️ ¡Compra realizada!', 1500, '#00d4ff');
            }
            break;
        case 'equipResult':
            if (data.success) {
                if (data.narration) speak(data.narration);
                if (data.state) renderInventory(data.state);
                updateHeroSkin(data.skin);
            }
            break;
        case 'potionResult':
            if (data.narration) speak(data.narration);
            if (data.state) renderInventory(data.state);
            updatePlantIndicator(data.health, data.health === 'saludable' ? '🌱' : data.health === 'pachucha' ? '🍂' : '🥀');
            showFloatingMessage('☕ ¡Caos reducido!', 1500, '#ff8800');
            break;
        case 'updateLairStatus':
            updatePlantIndicator(data.health, data.emoji || '🌱');
            if (data.chaos > 25) speak('🔥 ¡Alerta! La Planta de la Guarida se marchita por el caos del código (' + data.chaos + ' puntos). ¡Refactoriza!');
            break;
        case 'refreshQuestBoard':
            renderQuestBoard(data.quests);
            break;
        case 'questCompleted':
            if (data.narration) speak('🎉 MISIÓN CUMPLIDA: ' + data.quest.title + '\\n' + data.narration);
            if (data.state) renderInventory(data.state);
            showFloatingMessage('📜 Quest completada! +' + data.quest.rewardExp + ' EXP', 2000, '#ffd700');
            break;
        case 'spawnBossDragon':
            spawnBossDragon(data.heads || 1);
            break;
        case 'damageBoss':
            damageBossEffect(data.headsLeft || 0);
            break;
        case 'bossDefeated':
            bossDefeatedEffect();
            if (data.state) renderInventory(data.state);
            break;
        case 'updateVisualSkins':
            updateHeroSkin(data.skin);
            break;
    }
});

// ── INICIO REAL: Cargar imágenes con fetch, luego arrancar Phaser ────────
console.log('[NoCodeQuest] Cargando imágenes con fetch...');
Promise.all([
    loadImage(DUNGEON_URI),
    loadImage(HERO_URI),
    loadImage(BUG_URI)
]).then(([dungeonImg, heroImg, bugImg]) => {
    loadedDungeon = dungeonImg;
    loadedHero = heroImg;
    loadedBug = bugImg;
    console.log('[NoCodeQuest] Imágenes cargadas correctamente');
    startGame();
}).catch(err => {
    console.error('[NoCodeQuest] Error fatal al cargar imágenes:', err);
    document.getElementById('phaser-container').innerHTML = '<div style="color:red;padding:20px;">Error al cargar los pergaminos visuales. Revisa la consola.</div>';
});
</script>
</body>
</html>`;
};