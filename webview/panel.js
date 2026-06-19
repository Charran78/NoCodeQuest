/**
 * webview/panel.js
 * Entry point modular del WebView de NoCodeQuest
 */

module.exports = function generatePanel(
    nonce,
    csp,
    heroUri,
    heroAttackUri,
    bugUri,
    dungeonUri,
    flashscreenUri,
    loginBgUri,
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
    const heroUriSafe = JSON.stringify(heroUri);
    const heroAttackUriSafe = JSON.stringify(heroAttackUri);
    const bugUriSafe = JSON.stringify(bugUri);
    const dungeonUriSafe = JSON.stringify(dungeonUri);
    const flashscreenUriSafe = JSON.stringify(flashscreenUri);
    const loginBgUriSafe = JSON.stringify(loginBgUri);
    const jasperUriSafe = JSON.stringify(jasperUri);
    const musicUriSafe = JSON.stringify(musicUri);
    const phaserUriSafe = JSON.stringify(phaserUri);
    const vscodeBridgeUriSafe = JSON.stringify(vscodeBridgeUri);
    const gameStateUriSafe = JSON.stringify(gameStateUri);
    const uiRendererUriSafe = JSON.stringify(uiRendererUri);
    const eventHandlersUriSafe = JSON.stringify(eventHandlersUri);
    const navigationUriSafe = JSON.stringify(navigationUri);
    const phaserSceneUriSafe = JSON.stringify(phaserSceneUri);
    const playerNameSafe = JSON.stringify(playerName || 'Aventurero');
    const runtimeBridgeUriSafe = JSON.stringify(runtimeBridgeUri || '');
    const buildStampSafe = JSON.stringify(buildStamp || 'unknown-build');

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>NoCodeQuest</title>
  <style>
    :root {
      --bg: #0d1117;
      --panel: rgba(13, 22, 38, 0.96);
      --border: #1e3a5f;
      --border2: #2a4a6b;
      --green: #00ff88;
      --cyan: #00d4ff;
      --gold: #ffd700;
      --text: #c9d1d9;
      --text-dim: #6e7681;
      --font: 'Courier New', Courier, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      font-size: 11px;
    }
    body { position: relative; }
    #screens-container { position: relative; width: 100%; height: 100%; overflow: hidden; }
    .nav-screen { position: absolute; inset: 0; display: none; width: 100%; height: 100%; }
    #game-ui { width: 100%; height: 100%; display: flex; flex-direction: column; background: var(--bg); min-width: 0; min-height: 0; }
    #hud-top {
      background: var(--panel);
      border-bottom: 1px solid var(--border);
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex-shrink: 0;
    }
    #hud-row1 { display: flex; justify-content: space-between; align-items: center; }
    #player-info { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    #player-name { color: var(--cyan); font-weight: bold; font-size: 12px; }
    #player-level, #player-gold, #coffee-count, #scroll-count { color: var(--gold); }
    #player-rank, #exp-label, #exp-values { color: var(--text-dim); }
    #player-rank { font-size: 10px; }
    #coffee-count, #scroll-count {
      font-size: 10px;
      padding: 2px 6px;
      border: 1px solid rgba(255, 215, 0, 0.18);
      border-radius: 999px;
      background: rgba(255, 215, 0, 0.06);
    }
    #exp-label { white-space: nowrap; font-size: 10px; }
    #exp-values { font-size: 9px; white-space: nowrap; }
    #plant-indicator {
      font-size: 13px;
      padding: 2px 8px;
      border: 1px solid rgba(0, 212, 255, 0.18);
      border-radius: 999px;
      background: rgba(0, 212, 255, 0.05);
    }
    #hud-row2 { display: flex; align-items: center; gap: 6px; }
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
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #center-layout { display: flex; flex: 1; min-height: 0; overflow: hidden; }
    #phaser-container {
      flex: 1;
      position: relative;
      overflow: hidden;
      min-width: 0;
      background: #111625;
      border-right: 1px solid rgba(30, 58, 95, 0.55);
    }
    #phaser-container::before {
      content: '';
      position: absolute;
      inset: 12px;
      border: 1px solid rgba(0, 212, 255, 0.22);
      border-radius: 8px;
      pointer-events: none;
      z-index: 2;
      box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.18);
    }
    #phaser-container canvas {
      display: block;
      position: relative;
      z-index: 1;
      width: 100% !important;
      height: 100% !important;
    }
    #view-controls {
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      gap: 6px;
      z-index: 30;
      background: rgba(13, 22, 38, 0.70);
      border: 1px solid rgba(30, 58, 95, 0.85);
      border-radius: 8px;
      padding: 6px;
      backdrop-filter: blur(4px);
    }
    .view-btn {
      width: 44px;
      height: 26px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 212, 255, 0.10);
      border: 1px solid rgba(0, 212, 255, 0.35);
      color: var(--cyan);
      border-radius: 6px;
      cursor: pointer;
      font-family: var(--font);
      font-size: 10px;
      line-height: 1;
    }
    .view-btn:hover { background: rgba(0, 212, 255, 0.22); }
    #side-panel {
      width: 380px;
      max-width: 42vw;
      background: var(--panel);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex-shrink: 0;
    }
    #tab-bar { display: flex; border-bottom: 1px solid var(--border); background: rgba(0,0,0,0.2); }
    .side-tab {
      flex: 1;
      padding: 10px 8px;
      border: none;
      background: transparent;
      color: var(--text-dim);
      font-family: var(--font);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }
    .side-tab:hover { color: var(--text); background: rgba(255,255,255,0.05); }
    .side-tab.active { color: var(--cyan); border-bottom-color: var(--cyan); background: rgba(0,212,255,0.05); }
    .tab-content { display: none; flex: 1; overflow-y: auto; padding: 12px; }
    .tab-content.active { display: block; }
    #destiny-actions {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 10px;
    }
    #speech-area {
      min-height: 56px;
      padding: 10px 12px;
      background: rgba(13, 22, 38, 0.96);
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      line-height: 1.45;
    }
    #speech-text { font-size: 10px; white-space: pre-wrap; }
    #action-bar { display: flex; gap: 8px; padding: 10px; background: var(--panel); border-top: 1px solid var(--border); flex-wrap: wrap; }
    .action-btn, .chat-suggestion-btn, .modal-btn, .btn-quest-accept, .btn-card-action, .compact-action-btn {
      padding: 7px 10px;
      border: 1px solid var(--border2);
      background: rgba(13, 17, 23, 0.90);
      color: var(--cyan);
      font-family: var(--font);
      font-size: 10px;
      cursor: pointer;
      border-radius: 4px;
    }
    #btn-chat {
      padding: 9px 14px;
      border-color: rgba(0, 212, 255, 0.7);
      background: linear-gradient(180deg, rgba(0, 212, 255, 0.18), rgba(0, 212, 255, 0.06));
      box-shadow: 0 0 0 1px rgba(0, 212, 255, 0.18), 0 0 18px rgba(0, 212, 255, 0.18);
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.7px;
    }
    #btn-chat:hover {
      background: linear-gradient(180deg, rgba(0, 212, 255, 0.28), rgba(0, 212, 255, 0.10));
    }
    #btn-attack {
      border-color: rgba(255, 68, 68, 0.6);
      color: #ffb3b3;
    }
    #btn-attack:hover {
      background: rgba(255, 68, 68, 0.16);
    }
    #btn-commit {
      border-color: rgba(255, 215, 0, 0.55);
      color: var(--gold);
    }
    #btn-commit:hover {
      background: rgba(255, 215, 0, 0.12);
    }
    #btn-coffee {
      border-color: rgba(0, 255, 136, 0.55);
      color: var(--green);
    }
    #btn-coffee:hover {
      background: rgba(0, 255, 136, 0.12);
    }
    #btn-scroll {
      border-color: rgba(165, 92, 255, 0.55);
      color: #d2b3ff;
    }
    #btn-scroll:hover {
      background: rgba(165, 92, 255, 0.14);
    }
    #music-controls {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border: 1px solid rgba(30, 58, 95, 0.75);
      border-radius: 8px;
      background: rgba(13, 22, 38, 0.72);
    }
    #music-controls .action-btn {
      padding: 6px 10px;
      min-width: 36px;
    }
    #music-volume {
      width: 110px;
      accent-color: var(--cyan);
    }
    #music-status {
      color: var(--text-dim);
      font-size: 9px;
      white-space: nowrap;
    }
    #btn-market, #btn-chronicle, #btn-snapshot {
      border-color: rgba(110, 118, 129, 0.55);
      color: var(--text);
    }
    #btn-market:hover, #btn-chronicle:hover, #btn-snapshot:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .action-btn:hover, .chat-suggestion-btn:hover, .modal-btn:hover, .btn-quest-accept:hover, .btn-card-action:hover, .compact-action-btn:hover { background: rgba(0, 212, 255, 0.14); }
    .adventure-card, .quest-card, .inventory-card, .chat-suggestion {
      background: linear-gradient(180deg, rgba(13, 22, 38, 0.98), rgba(10, 17, 28, 0.98));
      border: 1px solid var(--border2);
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 10px;
    }
    .adventure-card.selected { border-color: var(--gold); box-shadow: 0 0 0 1px rgba(255,215,0,0.35); }
    .card-title, .quest-title, .inventory-title, .chat-suggestion-title { color: var(--cyan); font-weight: bold; margin-bottom: 6px; font-size: 10px; }
    .card-text, .quest-text, .inventory-text, .chat-suggestion-reason { color: var(--text); line-height: 1.45; font-size: 9px; margin-bottom: 8px; white-space: pre-wrap; }
    .card-meta, .quest-meta, .inventory-meta, .chat-suggestion-meta { color: var(--text-dim); font-size: 8px; margin-bottom: 8px; }
    #chat-overlay {
      position: fixed;
      inset: 0;
      background: rgba(13, 17, 23, 0.95);
      z-index: 1000;
      display: none;
      flex-direction: column;
    }
    #chat-overlay.active { display: flex; animation: overlayIn 140ms ease-out; }
    @keyframes overlayIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    #chat-header {
      padding: 12px 16px;
      background: var(--panel);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #chat-title { color: var(--cyan); font-size: 12px; font-weight: bold; }
    #chat-oracle-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: fit-content;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid rgba(0, 212, 255, 0.24);
      background: rgba(13, 17, 23, 0.82);
      color: #d9e7f2;
      font-size: 9px;
      font-weight: bold;
      letter-spacing: 0.4px;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
    }
    .chat-oracle-led {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #6e7681;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.14), 0 0 8px rgba(110,118,129,0.45);
      flex-shrink: 0;
    }
    #chat-oracle-status.oracle-live {
      border-color: rgba(0, 255, 136, 0.55);
      color: #c8ffd9;
      background: rgba(0, 255, 136, 0.12);
    }
    #chat-oracle-status.oracle-live .chat-oracle-led {
      background: #00ff88;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.16), 0 0 12px rgba(0,255,136,0.95), 0 0 20px rgba(0,255,136,0.55);
    }
    #chat-oracle-status.oracle-cooldown,
    #chat-oracle-status.oracle-fallback {
      border-color: rgba(255, 215, 0, 0.55);
      color: #ffe9a8;
      background: rgba(255, 215, 0, 0.12);
    }
    #chat-oracle-status.oracle-cooldown .chat-oracle-led,
    #chat-oracle-status.oracle-fallback .chat-oracle-led {
      background: #ffd700;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.16), 0 0 12px rgba(255,215,0,0.95), 0 0 20px rgba(255,215,0,0.55);
    }
    #chat-oracle-status.oracle-sleeping {
      border-color: rgba(165, 92, 255, 0.55);
      color: #ead6ff;
      background: rgba(165, 92, 255, 0.12);
    }
    #chat-oracle-status.oracle-sleeping .chat-oracle-led {
      background: #b784ff;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.16), 0 0 12px rgba(183,132,255,0.95), 0 0 20px rgba(183,132,255,0.55);
    }
    #chat-oracle-status.oracle-unknown {
      border-color: rgba(110, 118, 129, 0.45);
      color: #d9e7f2;
      background: rgba(110, 118, 129, 0.10);
    }
    #chat-oracle-status.oracle-unknown .chat-oracle-led {
      background: #8b949e;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.14), 0 0 8px rgba(139,148,158,0.55);
    }
    #jasper-portrait {
      width: 64px;
      height: 64px;
      flex-shrink: 0;
      border-radius: 10px;
      border: 1px solid rgba(0, 212, 255, 0.35);
      background-color: rgba(13, 17, 23, 0.85);
      background-image: var(--jasper-sprite);
      background-repeat: no-repeat;
      background-position: 0 0;
      background-size: 512px 64px;
      image-rendering: pixelated;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35), 0 0 18px rgba(0, 212, 255, 0.16);
      opacity: 0.95;
    }
    #chat-overlay.active #jasper-portrait {
      animation: jasperTalk 0.7s steps(8) infinite;
    }
    @keyframes jasperTalk {
      from { background-position: 0 0; }
      to { background-position: -512px 0; }
    }
    #chat-header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
    #chat-quick-hint {
      padding: 6px 12px 0;
      color: var(--text-dim);
      font-size: 9px;
      line-height: 1.4;
    }
    #chat-quick-prompts {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding: 10px 12px 0;
    }
    .chat-quick-btn {
      font-size: 9px;
      padding: 6px 8px;
    }
    .chat-action-active {
      border-color: rgba(0, 255, 136, 0.6) !important;
      color: var(--green) !important;
      background: rgba(0, 255, 136, 0.10) !important;
    }
    .chat-action-negative {
      border-color: rgba(255, 68, 68, 0.6) !important;
      color: #ffb3b3 !important;
      background: rgba(255, 68, 68, 0.10) !important;
    }
    .chat-action-info {
      border-color: rgba(255, 215, 0, 0.55) !important;
      color: var(--gold) !important;
      background: rgba(255, 215, 0, 0.10) !important;
    }
    #chat-close { background: none; border: none; color: var(--text-dim); font-size: 18px; cursor: pointer; padding: 4px 8px; }
    #chat-history {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .chat-bubble {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 11px;
      line-height: 1.4;
      word-wrap: break-word;
      white-space: pre-wrap;
    }
    .chat-bubble.user { align-self: flex-end; background: var(--cyan); color: var(--bg); border-bottom-right-radius: 4px; }
    .chat-bubble.bard { align-self: flex-start; background: var(--panel); color: var(--text); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
    #chat-favorites {
      border-top: 1px solid rgba(30, 58, 95, 0.55);
      background: rgba(13, 22, 38, 0.72);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 132px;
      overflow-y: auto;
    }
    #chat-favorites-title {
      color: var(--cyan);
      font-size: 10px;
      font-weight: bold;
    }
    .chat-favorite-item {
      border: 1px solid rgba(0, 212, 255, 0.16);
      border-radius: 8px;
      padding: 8px;
      background: rgba(13, 17, 23, 0.72);
      cursor: pointer;
    }
    .chat-favorite-item:hover {
      background: rgba(0, 212, 255, 0.08);
    }
    .chat-favorite-text {
      font-size: 9px;
      line-height: 1.4;
      color: var(--text);
      white-space: pre-wrap;
    }
    .chat-favorite-meta {
      margin-top: 6px;
      font-size: 8px;
      color: var(--text-dim);
    }
    #chat-input-container { padding: 12px 16px; background: var(--panel); border-top: 1px solid var(--border); display: flex; gap: 8px; }
    #chat-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      font-size: 11px;
      border-radius: 4px;
    }
    #commit-modal, #chronicle-modal {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 60;
      padding: 18px;
    }
    #commit-modal.active, #chronicle-modal.active { display: flex; }
    #commit-modal-card, #chronicle-modal-card {
      width: min(520px, 100%);
      max-height: 80vh;
      overflow-y: auto;
      background: linear-gradient(180deg, rgba(20, 17, 10, 0.98), rgba(35, 24, 14, 0.98));
      border: 1px solid rgba(255, 215, 0, 0.3);
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }
    #commit-message-input {
      width: 100%;
      min-height: 96px;
      resize: vertical;
      background: rgba(13,17,23,0.85);
      border: 1px solid var(--border2);
      color: var(--text);
      border-radius: 6px;
      padding: 8px;
      font-family: var(--font);
      font-size: 10px;
      margin-bottom: 10px;
    }
    #commit-modal-actions { display: flex; gap: 8px; }
    #floating-message {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 18px;
      font-weight: bold;
      text-shadow: 0 0 10px rgba(0,0,0,0.8);
      pointer-events: none;
      opacity: 0;
      z-index: 9999;
      transition: opacity 0.3s, transform 0.3s;
    }
    #build-stamp {
      position: fixed;
      top: 52px;
      left: 12px;
      z-index: 12;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid rgba(0, 212, 255, 0.22);
      background: rgba(13, 22, 38, 0.34);
      color: var(--cyan);
      font-size: 8px;
      letter-spacing: 0.3px;
      pointer-events: none;
      backdrop-filter: blur(3px);
      opacity: 0.42;
    }
  </style>
</head>
<body>
  <div id="build-stamp"></div>
  <div id="screens-container"></div>

  <script nonce="${nonce}">
    (function() {
      window.AppConfig = {
        buildStamp: ${buildStampSafe},
        playerName: ${playerNameSafe},
        runtimeBridgeUri: ${runtimeBridgeUriSafe},
        phaserUri: ${phaserUriSafe},
        phaserSceneUri: ${phaserSceneUriSafe},
        assets: {
          hero: ${heroUriSafe},
          heroAttack: ${heroAttackUriSafe},
          bug: ${bugUriSafe},
          dungeon: ${dungeonUriSafe},
          flashscreen: ${flashscreenUriSafe},
          login: ${loginBgUriSafe},
          jasper: ${jasperUriSafe},
          music: ${musicUriSafe}
        }
      };

      window.assetURIs = {
        hero: window.AppConfig.assets.hero,
        bug: window.AppConfig.assets.bug,
        dungeon: window.AppConfig.assets.dungeon,
        heroAttack: window.AppConfig.assets.heroAttack || window.AppConfig.assets.hero
      };

      const buildStampEl = document.getElementById('build-stamp');
      if (buildStampEl) {
        buildStampEl.textContent = 'BUILD ' + window.AppConfig.buildStamp;
      }
      document.documentElement.style.setProperty('--jasper-sprite', "url('" + window.AppConfig.assets.jasper + "')");

      const root = document.getElementById('screens-container');
      if (root) {
        root.innerHTML = [
          '<div id="screen-flashscreen" class="nav-screen" style="display:block;background-color:#0d1117;background-image:url(\\'' + window.AppConfig.assets.flashscreen + '\\');background-position:center;background-repeat:no-repeat;background-size:contain;">',
          '  <div style="position:absolute;left:50%;bottom:20%;transform:translateX(-50%);width:min(80%,760px);text-align:center;padding:0 16px;">',
          '    <div id="flash-message" style="color:#fff;font-size:18px;font-weight:bold;text-shadow:0 2px 10px rgba(0,0,0,0.8);animation:fadeInOut 1.3s ease-in-out;">Cargando... arrastrando y soltando scripts visuales</div>',
          '  </div>',
          '</div>'
        ].join('');
      }
    })();
  </script>

  <script nonce="${nonce}">
    (function() {
      // #region debug-point A-E:early-boot
      function reportEarlyBoot(kind, payload) {
        fetch('http://127.0.0.1:7777/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'webview-black-screen',
            runId: 'pre-fix',
            hypothesisId: 'E',
            location: 'panel.js:early-boot',
            msg: '[DEBUG] ' + kind,
            data: payload || {},
            ts: Date.now()
          })
        }).catch(function() {});
      }
      // #endregion debug-point A-E:early-boot

      window.addEventListener('error', function(event) {
        reportEarlyBoot('window-error', {
          message: event.message || null,
          source: event.filename || null,
          line: event.lineno || null,
          column: event.colno || null
        });
      });

      window.addEventListener('unhandledrejection', function(event) {
        reportEarlyBoot('unhandled-rejection', {
          reason: event && event.reason ? String(event.reason) : null
        });
      });

      reportEarlyBoot('bootstrap-inline-start', {});
    })();
  </script>

  <script nonce="${nonce}" src=${vscodeBridgeUriSafe}></script>
  <script nonce="${nonce}" src=${gameStateUriSafe}></script>
  <script nonce="${nonce}" src=${uiRendererUriSafe}></script>
  <script nonce="${nonce}" src=${eventHandlersUriSafe}></script>
  <script nonce="${nonce}" src=${navigationUriSafe}></script>

  <script nonce="${nonce}">
    // #region debug-point A-E:panel-runtime
    function reportPanelDebug(hypothesisId, location, msg, data) {
      fetch('http://127.0.0.1:7777/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'webview-black-screen',
          runId: 'pre-fix',
          hypothesisId: hypothesisId,
          location: location,
          msg: '[DEBUG] ' + msg,
          data: data || {},
          ts: Date.now()
        })
      }).catch(function() {});
    }
    // #endregion debug-point A-E:panel-runtime

    function loadPanelImage(url) {
      return new Promise(function(resolve, reject) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() { resolve(img); };
        img.onerror = function() { reject(new Error('No se pudo cargar: ' + url)); };
        img.src = url;
      });
    }

    window.PreloadedAssets = {
      images: {},
      ready: Promise.all([
        loadPanelImage(window.AppConfig.assets.dungeon),
        loadPanelImage(window.AppConfig.assets.hero),
        loadPanelImage(window.AppConfig.assets.bug),
        loadPanelImage(window.AppConfig.assets.heroAttack || window.AppConfig.assets.hero)
      ]).then(function(results) {
        window.PreloadedAssets.images.dungeon = results[0];
        window.PreloadedAssets.images.hero = results[1];
        window.PreloadedAssets.images.bug = results[2];
        window.PreloadedAssets.images.heroAttack = results[3] || results[1];
        reportPanelDebug('B', 'panel.js:asset-preload', 'browser image preload success', {
          dungeon: !!results[0],
          hero: !!results[1],
          bug: !!results[2],
          heroAttack: !!results[3]
        });
        return window.PreloadedAssets.images;
      }).catch(function(error) {
        reportPanelDebug('B', 'panel.js:asset-preload', 'browser image preload failed', {
          message: error && error.message ? error.message : String(error)
        });
        throw error;
      })
    };

    window.PanelRuntime = {
      cache: { state: null, quests: [], cards: [], ideSummary: null },
      readyPosted: false,
      onGameReady() {
        reportPanelDebug('E', 'panel.js:onGameReady', 'game screen ready', {
          hasState: !!this.cache.state,
          questCount: this.cache.quests.length,
          cardCount: this.cache.cards.length
        });
        if (!this.readyPosted && window.VSCodeBridge) {
          this.readyPosted = true;
          window.VSCodeBridge.postMessage({ command: 'webviewReady' });
        }
        if (window.UI) window.UI.init();
        if (window.EventHandlers) window.EventHandlers.init();
        this.flush();
      },
      flush() {
        if (!window.UI) return;
        if (this.cache.state) window.UI.renderInventory(this.cache.state);
        if (this.cache.quests) window.UI.renderQuestBoard(this.cache.quests);
        if (this.cache.cards) window.UI.renderAdventureCards(this.cache.cards);
        if (this.cache.ideSummary && window.UI.renderIdeSummary) window.UI.renderIdeSummary(this.cache.ideSummary);
      },
      handleMessage(data) {
        if (!data || !data.command) return;
        switch (data.command) {
          case 'syncInventory':
            this.cache.state = data.state || null;
            reportPanelDebug('E', 'panel.js:syncInventory', 'syncInventory received', {
              hasState: !!data.state,
              level: data && data.state && data.state.player ? data.state.player.level : null,
              gold: data && data.state && data.state.player ? data.state.player.gold : null
            });
            if (window.UI) window.UI.renderInventory(data.state || null);
            break;
          case 'refreshQuestBoard':
            this.cache.quests = data.quests || [];
            if (window.UI) window.UI.renderQuestBoard(data.quests || []);
            break;
          case 'showAdventureCards':
            this.cache.cards = data.cards || [];
            if (window.UI) window.UI.renderAdventureCards(data.cards || []);
            break;
          case 'syncIdeSummary':
            this.cache.ideSummary = data.summary || null;
            if (window.UI && window.UI.renderIdeSummary) window.UI.renderIdeSummary(data.summary || null);
            break;
          case 'removeAdventureCard':
            if (window.UI) window.UI.removeAdventureCard(data.cardId);
            break;
          case 'chatResponse':
            if (window.UI) window.UI.renderChatResponse(data);
            break;
          case 'appendChatUserMessage':
            if (window.UI) {
              window.UI.toggleChat(true);
              window.UI.appendChatMessage('user', data.text || '');
            }
            break;
          case 'chatActionState':
            if (window.UI) window.UI.setChatActionState(data.buttonId, data.state, data.label);
            break;
          case 'markChatSuggestionUsed':
            if (window.UI) window.UI.markChatSuggestionUsed(data.suggestionId);
            break;
          case 'showCommitModal':
            if (window.UI) window.UI.showCommitModal(data);
            break;
          case 'hideCommitModal':
            if (window.UI) window.UI.hideCommitModal();
            break;
          case 'hitlToast':
            if (window.UI) window.UI.showFloatingMessage(data.text || '', 2000, data.color || '#00d4ff');
            break;
          case 'hitlNudge':
          case 'focusAdventureCard':
            if (window.UI) window.UI.focusAdventureCard(data.cardId);
            break;
          case 'openSideTab':
            if (window.UI) window.UI.switchTab(data.tab || 'destiny');
            break;
          case 'speak':
            if (window.UI) window.UI.speak(data.text || '');
            break;
          case 'spawnMonster':
            if (window.PhaserBridge) window.PhaserBridge.spawnBug();
            if (window.UI) window.UI.speak('Monstruo detectado: ' + (((data.details || {}).message) || 'amenaza arcana'));
            break;
          case 'victory':
            if (window.PhaserBridge) window.PhaserBridge.showVictory();
            if (data.state && window.UI) window.UI.renderInventory(data.state);
            break;
          case 'combatResult':
            if (data.state && window.UI) window.UI.renderInventory(data.state);
            if (data.narration && window.UI) window.UI.speak(data.narration);
            if (window.UI) window.UI.showFloatingMessage('+' + (((data.reward || {}).expGained) || 0) + ' EXP', 1500, '#00ff88');
            break;
          case 'purchaseResult':
          case 'equipResult':
          case 'potionResult':
          case 'questCompleted':
          case 'bossDefeated':
            if (data.state && window.UI) window.UI.renderInventory(data.state);
            if (data.narration && window.UI) window.UI.speak(data.narration);
            break;
          case 'updateLairStatus':
            if (window.UI) window.UI.updatePlantIndicator(data.health, data.emoji);
            break;
          case 'levelUpVisual':
            if (window.UI) window.UI.showLevelUp(data.level, data.rank);
            break;
          case 'updateVisualSkins':
            document.body.dataset.skin = data.skin || '';
            break;
          case 'spawnBossDragon':
            if (window.PhaserBridge) window.PhaserBridge.spawnBug();
            if (window.UI) window.UI.speak('Aparece un jefe: ' + (data.fileName || 'dragon del merge'));
            break;
          case 'damageBoss':
            if (window.UI) window.UI.showFloatingMessage('Jefe herido', 1200, '#ff8800');
            break;
          default:
            break;
        }
      }
    };

    window.RuntimeMirror = {
      lastEventId: 0,
      bootstrapApplied: false,
      timerId: null,
      inflight: false,
      fetchUrl() {
        if (!window.AppConfig.runtimeBridgeUri) return '';
        const separator = window.AppConfig.runtimeBridgeUri.indexOf('?') === -1 ? '?' : '&';
        return window.AppConfig.runtimeBridgeUri + separator + 'ts=' + Date.now();
      },
      applyBootstrap(bootstrap) {
        if (!bootstrap || this.bootstrapApplied) return;
        if (bootstrap.state) {
          window.PanelRuntime.handleMessage({ command: 'syncInventory', state: bootstrap.state });
        }
        if (bootstrap.ideSummary) {
          window.PanelRuntime.handleMessage({ command: 'syncIdeSummary', summary: bootstrap.ideSummary });
        }
        if (bootstrap.visualSkins) {
          window.PanelRuntime.handleMessage({
            command: 'updateVisualSkins',
            weapon: bootstrap.visualSkins.weapon || null,
            skin: bootstrap.visualSkins.skin || null
          });
        }
        window.PanelRuntime.handleMessage({ command: 'refreshQuestBoard', quests: bootstrap.quests || [] });
        window.PanelRuntime.handleMessage({ command: 'showAdventureCards', cards: bootstrap.cards || [] });
        if (bootstrap.speechText) {
          window.PanelRuntime.handleMessage({ command: 'speak', text: bootstrap.speechText });
        }
        this.bootstrapApplied = true;
        reportPanelDebug('E', 'panel.js:runtime-mirror', 'bootstrap applied from runtime mirror', {
          hasState: !!bootstrap.state,
          questCount: (bootstrap.quests || []).length,
          cardCount: (bootstrap.cards || []).length
        });
      },
      applyEvents(events) {
        (events || []).forEach((event) => {
          if (!event || !event.id || event.id <= this.lastEventId) return;
          this.lastEventId = event.id;
          window.PanelRuntime.handleMessage(event);
        });
      },
      poll() {
        if (this.inflight || !window.AppConfig.runtimeBridgeUri) return;
        this.inflight = true;
        fetch(this.fetchUrl(), { cache: 'no-store' })
          .then(function(response) {
            if (!response.ok) {
              throw new Error('runtime mirror status ' + response.status);
            }
            return response.json();
          })
          .then((payload) => {
            if (!payload || payload.buildStamp !== window.AppConfig.buildStamp) return;
            this.applyBootstrap(payload.bootstrap || null);
            this.applyEvents(payload.events || []);
          })
          .catch((error) => {
            reportPanelDebug('E', 'panel.js:runtime-mirror', 'runtime mirror poll failed', {
              message: error && error.message ? error.message : String(error)
            });
          })
          .finally(() => {
            this.inflight = false;
          });
      },
      start() {
        if (!window.AppConfig.runtimeBridgeUri || this.timerId) return;
        this.poll();
        this.timerId = window.setInterval(() => this.poll(), 700);
      }
    };

    window.MusicRuntime = {
      audio: null,
      ready: false,
      state: { muted: false, volume: 0.7, playing: false },
      hydrate() {
        if (!window.VSCodeBridge || !window.VSCodeBridge.vscode) return;
        const saved = window.VSCodeBridge.vscode.getState() || {};
        const muted = typeof saved.musicMuted === 'boolean' ? saved.musicMuted : this.state.muted;
        const volume = typeof saved.musicVolume === 'number' ? saved.musicVolume : this.state.volume;
        const playing = typeof saved.musicPlaying === 'boolean' ? saved.musicPlaying : this.state.playing;
        this.state = { muted, volume: Math.max(0, Math.min(1, volume)), playing };
      },
      persist() {
        if (!window.VSCodeBridge || !window.VSCodeBridge.vscode) return;
        window.VSCodeBridge.vscode.setState({
          ...(window.VSCodeBridge.vscode.getState() || {}),
          musicMuted: this.state.muted,
          musicVolume: this.state.volume,
          musicPlaying: this.state.playing
        });
      },
      init() {
        if (this.ready || !window.AppConfig.assets.music) return;
        this.hydrate();
        this.audio = new Audio(window.AppConfig.assets.music);
        this.audio.loop = true;
        this.audio.volume = this.state.volume;
        this.audio.muted = this.state.muted;
        this.ready = true;
        if (this.state.playing) {
          this.audio.play()
            .then(() => {
              this.state.playing = true;
              this.persist();
              this.updateUI();
            })
            .catch(() => {
              this.state.playing = false;
              this.persist();
              this.updateUI();
            });
        }
      },
      updateUI() {
        const status = document.getElementById('music-status');
        const muteBtn = document.getElementById('music-mute');
        const toggleBtn = document.getElementById('music-toggle');
        const vol = document.getElementById('music-volume');
        if (vol) vol.value = String(Math.round(this.state.volume * 100));
        if (muteBtn) muteBtn.textContent = this.state.muted ? '🔇' : '🔈';
        if (toggleBtn) toggleBtn.textContent = this.state.playing ? '⏸' : '▶';
        if (status) status.textContent = 'Música: ' + (this.state.playing ? 'ON' : 'OFF') + ' · Vol ' + Math.round(this.state.volume * 100) + '%';
      },
      setVolume(value01) {
        this.state.volume = Math.max(0, Math.min(1, value01));
        if (this.audio) this.audio.volume = this.state.volume;
        this.persist();
        this.updateUI();
      },
      toggleMute() {
        this.state.muted = !this.state.muted;
        if (this.audio) this.audio.muted = this.state.muted;
        this.persist();
        this.updateUI();
      },
      async togglePlay() {
        if (!this.audio) return;
        if (this.state.playing) {
          this.audio.pause();
          this.state.playing = false;
          this.persist();
          this.updateUI();
          return;
        }
        try {
          await this.audio.play();
          this.state.playing = true;
          this.persist();
          this.updateUI();
        } catch (err) {
          reportPanelDebug('E', 'panel.js:music', 'music play failed', { message: err && err.message ? err.message : String(err) });
        }
      },
      bindControls() {
        const toggleBtn = document.getElementById('music-toggle');
        const muteBtn = document.getElementById('music-mute');
        const vol = document.getElementById('music-volume');
        if (toggleBtn) toggleBtn.addEventListener('click', () => this.togglePlay());
        if (muteBtn) muteBtn.addEventListener('click', () => this.toggleMute());
        if (vol) vol.addEventListener('input', () => this.setVolume(Number(vol.value) / 100));
        this.updateUI();
      }
    };

    function routeHostMessage(event, channel) {
      const payload = (event && event.data) || (event && event.detail) || null;
      if (payload && payload.command) {
        reportPanelDebug('E', 'panel.js:host-message', 'host message received', {
          channel: channel,
          command: payload.command
        });
      }
      window.PanelRuntime.handleMessage(payload || {});
    }

    window.addEventListener('message', function(event) {
      routeHostMessage(event, 'window');
    });

    document.addEventListener('message', function(event) {
      routeHostMessage(event, 'document');
    });

    document.addEventListener('DOMContentLoaded', function() {
      if (window.Navigation) {
        window.Navigation.init({
          playerName: window.AppConfig.playerName,
          images: {
            flashscreen: window.AppConfig.assets.flashscreen,
            login: window.AppConfig.assets.login,
            dungeon: window.AppConfig.assets.dungeon
          }
        });
      }
      if (window.MusicRuntime) {
        window.MusicRuntime.init();
        window.MusicRuntime.bindControls();
      }
      if (window.RuntimeMirror) {
        window.RuntimeMirror.start();
      }
    });
  </script>
</body>
</html>`;
};
