/**
 * webview/panel.js
 * Generador del WebView completo de NoCodeQuest
 * Phaser.js (escena de combate) + HTML (paneles de UI)
 * Carga de assets 100% manual para evitar problemas de crossOrigin en WebView.
 */

module.exports = function generatePanel(nonce, csp, heroUri, bugUri, dungeonUri, phaserUri) {
    const heroUriSafe    = JSON.stringify(heroUri);
    const bugUriSafe     = JSON.stringify(bugUri);
    const dungeonUriSafe = JSON.stringify(dungeonUri);
    const phaserUriSafe  = JSON.stringify(phaserUri);

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>⚔️ NoCodeQuest</title>
  <script nonce="${nonce}" src=${phaserUriSafe}></script>
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
      width: 30px;
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
      font-size: 12px;
      line-height: 1;
    }
    .view-btn:hover { background: rgba(0, 212, 255, 0.22); }
    .view-btn.active {
      background: rgba(255, 215, 0, 0.12);
      border-color: rgba(255, 215, 0, 0.45);
      color: var(--gold);
    }
    body.layout-theater #side-panel { display: none; }
    body.layout-zen #hud-top,
    body.layout-zen #boss-bar,
    body.layout-zen #speech-area,
    body.layout-zen #action-bar { display: none; }
    body.layout-zen #center-layout { height: 100vh; }

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
    .side-tab.hitl-ping {
      animation: hitlTabPing 0.9s ease;
    }

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
    .quest-item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 4px;
    }
    .quest-type { font-weight: bold; font-size: 9px; }
    .quest-type.TODO  { color: var(--cyan); }
    .quest-type.FIXME { color: var(--red); }
    .quest-type.HACK  { color: var(--orange); }
    .quest-desc { color: var(--text); font-size: 9px; margin: 2px 0; word-break: break-word; }
    .quest-reward { color: var(--green); font-size: 8px; }
    .quest-status { color: var(--gold); font-size: 8px; }
    .btn-quest-accept {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid var(--cyan);
      color: var(--cyan);
      font-size: 8px;
      padding: 2px 4px;
      border-radius: 3px;
      cursor: pointer;
      font-family: var(--font);
      white-space: nowrap;
    }
    .btn-quest-accept:hover { background: rgba(0, 212, 255, 0.24); }
    .btn-quest-accept:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .no-quests { color: var(--text-dim); font-size: 9px; text-align: center; padding: 10px; font-style: italic; }

    /* ── Cartas de Destino ────────────────────────── */
    .adventure-card {
      background: linear-gradient(180deg, rgba(255, 215, 0, 0.08), rgba(30, 58, 95, 0.22));
      border: 1px solid rgba(255, 215, 0, 0.28);
      border-radius: 6px;
      padding: 7px;
      margin-bottom: 7px;
      cursor: pointer;
      transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
    }
    .adventure-card:hover {
      transform: translateY(-1px);
      border-color: var(--gold);
      background: linear-gradient(180deg, rgba(255, 215, 0, 0.14), rgba(30, 58, 95, 0.32));
    }
    .adventure-card.selected {
      border-color: var(--cyan);
      box-shadow: 0 0 0 1px rgba(0, 212, 255, 0.35);
    }
    .adventure-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 6px;
      margin-bottom: 4px;
    }
    .adventure-card-title {
      color: var(--gold);
      font-size: 10px;
      font-weight: bold;
      line-height: 1.35;
    }
    .adventure-card-priority {
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      white-space: nowrap;
    }
    .priority-critical { color: var(--red); }
    .priority-high { color: var(--orange); }
    .priority-medium { color: var(--cyan); }
    .priority-low, .priority-optional { color: var(--text-dim); }
    .adventure-card-desc {
      color: var(--text);
      font-size: 9px;
      line-height: 1.4;
      margin-bottom: 5px;
    }
    .adventure-card-meta {
      color: var(--text-dim);
      font-size: 8px;
      line-height: 1.4;
      margin-bottom: 6px;
    }
    .btn-card-action {
      width: 100%;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid var(--cyan);
      color: var(--cyan);
      font-size: 8px;
      padding: 4px 6px;
      cursor: pointer;
      border-radius: 4px;
      font-family: var(--font);
      transition: all 0.2s;
    }
    .btn-card-action:hover { background: rgba(0, 212, 255, 0.24); }
    .no-cards {
      color: var(--text-dim);
      font-size: 9px;
      text-align: center;
      padding: 12px 8px;
      font-style: italic;
      line-height: 1.5;
    }

    /* ── Crónica ──────────────────────────────────── */
    .chronicle-entry {
      background: linear-gradient(180deg, rgba(255, 248, 220, 0.08), rgba(80, 60, 25, 0.16));
      border: 1px solid rgba(255, 215, 0, 0.22);
      border-radius: 6px;
      padding: 7px;
      margin-bottom: 7px;
      cursor: pointer;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .chronicle-entry:hover {
      transform: translateY(-1px);
      border-color: var(--gold);
    }
    .chronicle-entry-title {
      color: var(--gold);
      font-size: 10px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .chronicle-entry-date {
      color: var(--text-dim);
      font-size: 8px;
      margin-bottom: 4px;
    }
    .chronicle-entry-text {
      color: var(--text);
      font-size: 9px;
      line-height: 1.45;
    }
    .no-chronicle {
      color: var(--text-dim);
      font-size: 9px;
      text-align: center;
      padding: 12px 8px;
      font-style: italic;
      line-height: 1.5;
    }
    #chronicle-modal {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 50;
      padding: 18px;
    }
    #chronicle-modal.active { display: flex; }
    #chronicle-modal-card {
      width: min(520px, 100%);
      max-height: 80vh;
      overflow-y: auto;
      background: linear-gradient(180deg, rgba(20, 17, 10, 0.98), rgba(35, 24, 14, 0.98));
      border: 1px solid rgba(255, 215, 0, 0.3);
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }
    #chronicle-modal-title {
      color: var(--gold);
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 6px;
    }
    #chronicle-modal-date {
      color: var(--text-dim);
      font-size: 9px;
      margin-bottom: 8px;
    }
    #chronicle-modal-text {
      color: var(--text);
      font-size: 10px;
      line-height: 1.55;
      white-space: pre-wrap;
      margin-bottom: 10px;
    }
    #chronicle-modal-meta {
      color: var(--text-dim);
      font-size: 9px;
      line-height: 1.5;
      margin-bottom: 10px;
    }
    #chronicle-modal-close {
      width: 100%;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid var(--cyan);
      color: var(--cyan);
      font-size: 9px;
      padding: 6px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-family: var(--font);
    }
    #chronicle-export-btn {
      width: 100%;
      background: rgba(155,89,182,0.15);
      border: 1px solid var(--purple);
      color: var(--purple);
      font-size: 9px;
      padding: 6px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-family: var(--font);
      margin-bottom: 8px;
    }
    #chronicle-export-btn[hidden] { display: none; }

    /* ── Modal de Commit ──────────────────────────── */
    #commit-modal {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 60;
      padding: 18px;
    }
    #commit-modal.active { display: flex; }
    #commit-modal-card {
      width: min(520px, 100%);
      background: linear-gradient(180deg, rgba(20, 17, 10, 0.98), rgba(35, 24, 14, 0.98));
      border: 1px solid rgba(255, 215, 0, 0.3);
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }
    #commit-modal-title {
      color: var(--gold);
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 6px;
    }
    #commit-modal-subtitle {
      color: var(--text-dim);
      font-size: 9px;
      line-height: 1.45;
      margin-bottom: 8px;
    }
    #commit-changed-files {
      color: var(--cyan);
      font-size: 8px;
      line-height: 1.45;
      margin-bottom: 8px;
      min-height: 16px;
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
    #commit-modal-actions {
      display: flex;
      gap: 8px;
    }
    .modal-btn {
      flex: 1;
      padding: 7px 8px;
      border-radius: 4px;
      font-family: var(--font);
      font-size: 9px;
      cursor: pointer;
      border: 1px solid;
    }
    #commit-confirm-btn {
      background: rgba(255,215,0,0.12);
      border-color: var(--gold);
      color: var(--gold);
    }
    #commit-cancel-btn {
      background: rgba(0,212,255,0.1);
      border-color: var(--cyan);
      color: var(--cyan);
    }

    /* ── Chat Overlay ─────────────────────────────── */
    #chat-overlay {
      position: absolute;
      left: 10px;
      bottom: 10px;
      width: 320px;
      max-width: calc(100% - 20px);
      background: rgba(13, 22, 38, 0.94);
      border: 1px solid var(--border2);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      z-index: 25;
      display: none;
      overflow: hidden;
    }
    #chat-overlay.hitl-glow {
      border-color: rgba(0, 212, 255, 0.75);
      box-shadow: 0 0 0 1px rgba(0, 212, 255, 0.22), 0 10px 28px rgba(0,0,0,0.3);
      animation: hitlGlowPulse 0.9s ease;
    }
    #chat-overlay.active { display: block; }
    #chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 8px;
      border-bottom: 1px solid var(--border);
      background: rgba(255,255,255,0.03);
    }
    #chat-title {
      color: var(--gold);
      font-size: 10px;
      font-weight: bold;
    }
    #chat-close {
      background: transparent;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      font-family: var(--font);
      font-size: 10px;
    }
    #chat-export {
      background: transparent;
      border: none;
      color: var(--cyan);
      cursor: pointer;
      font-family: var(--font);
      font-size: 10px;
      margin-left: auto;
      margin-right: 6px;
    }
    #chat-history {
      max-height: 220px;
      overflow-y: auto;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .chat-bubble {
      padding: 7px 8px;
      border-radius: 6px;
      font-size: 9px;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .chat-bubble.user {
      background: rgba(0, 212, 255, 0.10);
      border: 1px solid rgba(0, 212, 255, 0.30);
      color: var(--cyan);
      align-self: flex-end;
    }
    .chat-bubble.bard {
      background: rgba(255, 215, 0, 0.08);
      border: 1px solid rgba(255, 215, 0, 0.22);
      color: var(--text);
      align-self: stretch;
    }
    .chat-suggestion {
      background: rgba(0, 212, 255, 0.07);
      border: 1px solid rgba(0, 212, 255, 0.22);
      border-radius: 6px;
      padding: 7px 8px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .chat-suggestion.used {
      opacity: 0.72;
    }
    .chat-suggestion-title {
      color: var(--cyan);
      font-size: 9px;
      font-weight: bold;
    }
    .chat-suggestion-reason {
      color: var(--text);
      font-size: 9px;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .chat-suggestion-meta {
      color: var(--text-dim);
      font-size: 8px;
      line-height: 1.35;
    }
    .chat-suggestion-btn {
      background: rgba(0,212,255,0.10);
      border: 1px solid var(--cyan);
      color: var(--cyan);
      border-radius: 4px;
      padding: 5px 7px;
      font-family: var(--font);
      font-size: 8px;
      cursor: pointer;
      align-self: flex-start;
    }
    .chat-suggestion-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    #chat-input-row {
      display: flex;
      gap: 6px;
      padding: 8px;
      border-top: 1px solid var(--border);
      background: rgba(255,255,255,0.02);
    }
    #chat-input {
      flex: 1;
      background: rgba(13,17,23,0.85);
      border: 1px solid var(--border2);
      color: var(--text);
      border-radius: 4px;
      padding: 6px 7px;
      font-family: var(--font);
      font-size: 9px;
    }
    #chat-send {
      background: rgba(0,212,255,0.10);
      border: 1px solid var(--cyan);
      color: var(--cyan);
      border-radius: 4px;
      padding: 6px 8px;
      font-family: var(--font);
      font-size: 9px;
      cursor: pointer;
    }

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
    #btn-commit  { background: rgba(255,215,0,0.12); border-color: var(--gold); color: var(--gold); }
    #btn-chat    { background: rgba(0,212,255,0.10); border-color: var(--cyan); color: var(--cyan); }
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
    @keyframes hitlTabPing {
      0%   { filter: brightness(1); }
      35%  { filter: brightness(1.8); }
      100% { filter: brightness(1); }
    }
    @keyframes hitlGlowPulse {
      0%   { box-shadow: 0 0 0 1px rgba(0, 212, 255, 0.10), 0 8px 24px rgba(0,0,0,0.3); }
      45%  { box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.35), 0 8px 24px rgba(0,0,0,0.3); }
      100% { box-shadow: 0 0 0 1px rgba(0, 212, 255, 0.18), 0 8px 24px rgba(0,0,0,0.3); }
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
    <div id="view-controls">
      <button id="btn-move-main" class="view-btn" title="Mover a columna principal">↖</button>
      <button id="btn-max-group" class="view-btn" title="Maximizar grupo del editor">⛶</button>
      <button id="btn-theater" class="view-btn" title="Modo teatro (oculta panel lateral)">▭</button>
      <button id="btn-zen" class="view-btn" title="Modo zen (solo escena)">◐</button>
    </div>
    <div id="chat-overlay">
      <div id="chat-header">
        <div id="chat-title">💬 Consejo de Jasper</div>
        <button id="chat-export" title="Exportar chat">⤓</button>
        <button id="chat-close" title="Cerrar chat">✕</button>
      </div>
      <div id="chat-history">
        <div class="chat-bubble bard">🎵 Estoy listo para murmurar estrategias desde la sombra del calabozo.</div>
      </div>
      <div id="chat-input-row">
        <input id="chat-input" type="text" maxlength="280" placeholder="Pregunta al bardo..." />
        <button id="chat-send">Enviar</button>
      </div>
    </div>
  </div>

  <!-- Panel lateral derecho -->
  <div id="side-panel">
    <div id="side-tabs">
      <button class="side-tab active" data-tab="destiny">🪞 Destino</button>
      <button class="side-tab" data-tab="quests">📌 Quests</button>
      <button class="side-tab" data-tab="chronicle">📜 Crónica</button>
      <button class="side-tab" data-tab="shop">🛒 Mercado</button>
      <button class="side-tab" data-tab="arsenal">🛡️ Arsenal</button>
    </div>

    <div id="tab-destiny" class="tab-content active">
      <div class="section-title">🪞 Cartas de Destino</div>
      <div id="adventure-cards-list">
        <p class="no-cards">El Oráculo aún guarda silencio.<br>Espera a que el IDE revele una nueva decisión.</p>
      </div>
    </div>

    <!-- Tab: Tablón de Misiones -->
    <div id="tab-quests" class="tab-content">
      <div class="section-title">📌 Tablón de Anuncios</div>
      <div id="quests-list"><p class="no-quests">No hay misiones activas.<br>Añade un // TODO: en tu código.</p></div>
    </div>

    <div id="tab-chronicle" class="tab-content">
      <div class="section-title">📜 Crónica del Reino</div>
      <div id="chronicle-list"><p class="no-chronicle">Todavía no hay hazañas inscritas.<br>Sal a buscar gloria en el IDE.</p></div>
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

<div id="chronicle-modal">
  <div id="chronicle-modal-card">
    <div id="chronicle-modal-title">📜 Hazaña</div>
    <div id="chronicle-modal-date"></div>
    <div id="chronicle-modal-text"></div>
    <div id="chronicle-modal-meta"></div>
    <button id="chronicle-export-btn" hidden>🖼️ Exportar Crónica</button>
    <button id="chronicle-modal-close">Cerrar pergamino</button>
  </div>
</div>

<div id="commit-modal">
  <div id="commit-modal-card">
    <div id="commit-modal-title">🔒 Sello Real</div>
    <div id="commit-modal-subtitle">Jasper propone un mensaje para las crónicas. Puedes pulirlo antes de sellar la partida.</div>
    <div id="commit-changed-files"></div>
    <textarea id="commit-message-input" spellcheck="false"></textarea>
    <div id="commit-modal-actions">
      <button id="commit-confirm-btn" class="modal-btn">Sellar Commit</button>
      <button id="commit-cancel-btn" class="modal-btn">Cancelar</button>
    </div>
  </div>
</div>

<!-- ╔═ SPEECH BUBBLE (JASKIER) ══════════════════════╗ -->
<div id="speech-area">
  <div id="speech-label">🎵 Jasper el Bardo dice:</div>
  <div id="speech-text">⚔️ Explorando las catacumbas del directorio raíz... El camino está despejado, Aventurero.</div>
</div>

<!-- ╔═ BARRA DE ACCIONES ════════════════════════════╗ -->
<div id="action-bar">
  <button id="btn-attack"   class="action-btn">⚔️ Atacar</button>
  <button id="btn-coffee"   class="action-btn">☕ Café</button>
  <button id="btn-scroll"   class="action-btn">📜 Pergamino</button>
  <button id="btn-commit"   class="action-btn">🔒 Commit</button>
  <button id="btn-chat"     class="action-btn">💬 Chat</button>
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
let currentAdventureCards = [];
let currentChronicleEntries = [];
let selectedChronicleEntry = null;
let pendingCommitCardId = null;
const currentChatSuggestions = new Map();
let lastAiModel = null;
// #region debug-point A:webview-bootstrap
const DEBUG_WEBVIEW = false;
const __dbg = DEBUG_WEBVIEW
    ? (h, l, m, d) => fetch("http://127.0.0.1:7777/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sessionId: "webview-black-screen",
            runId: "pre-fix",
            hypothesisId: h,
            location: l,
            msg: "[DEBUG] " + m,
            data: d || {},
            ts: Date.now()
        })
    }).catch(() => { })
    : () => { };
if (DEBUG_WEBVIEW) {
    window.addEventListener('error', (e) => __dbg('A', 'panel.js:bootstrap', 'window-error', { message: e.message, source: e.filename, line: e.lineno, column: e.colno, stack: e.error?.stack || null }));
    window.addEventListener('unhandledrejection', (e) => __dbg('A', 'panel.js:bootstrap', 'unhandled-rejection', { reason: String(e.reason), stack: e.reason?.stack || null }));
    __dbg('A', 'panel.js:bootstrap', 'script-evaluated', { hasChatInput: !!document.getElementById('chat-input'), hasPhaserContainer: !!document.getElementById('phaser-container') });
}
// #endregion

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
    // #region debug-point B:startGame
    __dbg('B','panel.js:startGame','start-game-enter',{hasLoadedDungeon:!!loadedDungeon,hasLoadedHero:!!loadedHero,hasLoadedBug:!!loadedBug,containerExists:!!document.getElementById('phaser-container')});
    // #endregion
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
    // #region debug-point B:startGame
    __dbg('B','panel.js:startGame','phaser-game-created',{gameCreated:!!game});
    // #endregion
}

function createScene() {
    // #region debug-point C:createScene
    __dbg('C','panel.js:createScene','create-scene-enter',{});
    // #endregion
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
        bugPawn = this.add.sprite(bugX, bugY, 'bug').setScale(1.5).setVisible(false).setFlipX(true);
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
        // #region debug-point C:createScene
        __dbg('C','panel.js:createScene','create-scene-catch',{message:err.message,stack:err.stack||null});
        // #endregion
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

        // #region debug-point C:createScene
        __dbg('C','panel.js:createScene','create-scene-complete',{heroVisible:!!heroPawn,bugVisible:!!bugPawn,assetsLoaded});
        // #endregion

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
    renderChronicle(state.adventureLog || []);
}
function renderQuestBoard(quests) {
    const list = document.getElementById('quests-list');
    if (!quests || quests.length === 0) {
        list.innerHTML = '<p class="no-quests">No hay misiones activas.<br>Añade un // TODO: en tu código.</p>';
        return;
    }
    const acceptedIds = new Set((gameState?.acceptedQuests || []).map(q => q.id));
    list.innerHTML = quests.map(q =>
      '<div class="quest-item">' +
        '<div class="quest-item-header">' +
          '<div class="quest-type ' + q.type + '">' + q.title + '</div>' +
          (acceptedIds.has(q.id)
            ? '<span class="quest-status">Juramentada</span>'
            : '<button class="btn-quest-accept" data-quest-id="' + escHtml(q.id) + '">Aceptar</button>') +
        '</div>' +
        '<div class="quest-desc">' + escHtml(q.description) + '</div>' +
        '<div class="quest-reward">💎 +' + q.rewardExp + ' EXP | 🪙 +' + q.rewardGold + ' G</div>' +
      '</div>'
    ).join('');
}
function renderAdventureCards(cards) {
    currentAdventureCards = Array.isArray(cards) ? cards : [];
    const list = document.getElementById('adventure-cards-list');
    if (!currentAdventureCards.length) {
        list.innerHTML = '<p class="no-cards">El Oráculo no detecta decisiones urgentes.<br>El reino está en relativa calma.</p>';
        return;
    }

    list.innerHTML = currentAdventureCards.map(card =>
      '<div class="adventure-card" data-card-id="' + escHtml(card.id) + '">' +
        '<div class="adventure-card-header">' +
          '<div class="adventure-card-title">' + escHtml(card.title || 'Carta sin título') + '</div>' +
          '<div class="adventure-card-priority priority-' + escHtml(card.priority || 'optional') + '">' + escHtml(card.priority || 'optional') + '</div>' +
        '</div>' +
        '<div class="adventure-card-desc">' + escHtml(card.description || '') + '</div>' +
        '<div class="adventure-card-meta">🎁 ' + escHtml(card.reward || 'Sin recompensa definida') + '<br>⚠️ ' + escHtml(card.risk || 'Sin riesgo aparente') + '</div>' +
        '<button class="btn-card-action" data-card-id="' + escHtml(card.id) + '">Elegir este destino</button>' +
      '</div>'
    ).join('');
}
function removeAdventureCard(cardId) {
    currentAdventureCards = currentAdventureCards.filter(card => card.id !== cardId);
    renderAdventureCards(currentAdventureCards);
}
function renderChronicle(entries) {
    currentChronicleEntries = Array.isArray(entries) ? entries : [];
    const list = document.getElementById('chronicle-list');
    if (!currentChronicleEntries.length) {
        list.innerHTML = '<p class="no-chronicle">Todavía no hay hazañas inscritas.<br>Sal a buscar gloria en el IDE.</p>';
        return;
    }

    list.innerHTML = currentChronicleEntries.map((entry, index) =>
      '<div class="chronicle-entry" data-chronicle-index="' + index + '">' +
        '<div class="chronicle-entry-title">' + escHtml(entry.title || 'Hazaña del Reino') + '</div>' +
        '<div class="chronicle-entry-date">' + escHtml(formatChronicleDate(entry.recordedAt)) + '</div>' +
        '<div class="chronicle-entry-text">' + escHtml(entry.chronicleText || entry.description || '') + '</div>' +
      '</div>'
    ).join('');
}
function openChronicleEntry(index) {
    const entry = currentChronicleEntries[index];
    if (!entry) return;
    selectedChronicleEntry = entry;

    document.getElementById('chronicle-modal-title').textContent = entry.title || 'Hazaña del Reino';
    document.getElementById('chronicle-modal-date').textContent = formatChronicleDate(entry.recordedAt);
    document.getElementById('chronicle-modal-text').textContent = entry.chronicleText || entry.description || 'Sin relato inscrito.';
    document.getElementById('chronicle-modal-meta').innerHTML =
      'Archivo: ' + escHtml(entry.targetFile || 'No especificado') + '<br>' +
      'Línea: ' + escHtml(entry.targetLine != null ? String(entry.targetLine) : 'No especificada') + '<br>' +
      'EXP: ' + escHtml(entry.rewardExp != null ? String(entry.rewardExp) : '0') + ' | Oro: ' + escHtml(entry.rewardGold != null ? String(entry.rewardGold) : '0');
    document.getElementById('chronicle-export-btn').hidden = !canExportChronicle(entry);
    document.getElementById('chronicle-modal').classList.add('active');
}
function closeChronicleModal() {
    selectedChronicleEntry = null;
    document.getElementById('chronicle-modal').classList.remove('active');
}
function formatChronicleDate(isoDate) {
    if (!isoDate) return 'Fecha desconocida';
    try {
        return new Date(isoDate).toLocaleString('es-ES');
    } catch (_) {
        return isoDate;
    }
}
function canExportChronicle(entry) {
    if (!entry) return false;
    return ['quest-completed', 'boss-defeated', 'commit'].includes(entry.type);
}
function exportSelectedChronicle() {
    if (!selectedChronicleEntry || !canExportChronicle(selectedChronicleEntry)) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');

    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, '#120b06');
    bgGrad.addColorStop(1, '#24170e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const panelGrad = ctx.createLinearGradient(0, 80, 0, canvas.height - 80);
    panelGrad.addColorStop(0, '#2d2012');
    panelGrad.addColorStop(1, '#1a130d');
    ctx.fillStyle = panelGrad;
    roundRect(ctx, 60, 60, canvas.width - 120, canvas.height - 120, 18, true, false);

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 5;
    roundRect(ctx, 60, 60, canvas.width - 120, canvas.height - 120, 18, false, true);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 48px Courier New';
    ctx.fillText('NoCodeQuest - Badge Final de Campana', 110, 135);

    ctx.strokeStyle = '#9b59b6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(1020, 155, 62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#9b59b6';
    ctx.font = 'bold 28px Courier New';
    ctx.fillText('JQ', 995, 166);

    ctx.fillStyle = '#c9d1d9';
    ctx.font = 'bold 38px Courier New';
    wrapCanvasText(ctx, selectedChronicleEntry.title || 'Hazaña del Reino', 110, 235, 960, 46);

    ctx.fillStyle = '#6e7681';
    ctx.font = '26px Courier New';
    ctx.fillText(formatChronicleDate(selectedChronicleEntry.recordedAt), 110, 320);

    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 24px Courier New';
    ctx.fillText('Hazana consagrada para compartir en las plazas del reino', 110, 380);

    ctx.fillStyle = '#c9d1d9';
    ctx.font = '30px Courier New';
    wrapCanvasText(ctx, selectedChronicleEntry.chronicleText || selectedChronicleEntry.description || '', 110, 470, 960, 44);

    ctx.fillStyle = '#00d4ff';
    ctx.font = '24px Courier New';
    wrapCanvasText(
      ctx,
      'Archivo: ' + (selectedChronicleEntry.targetFile || 'No especificado') +
      ' | EXP: ' + (selectedChronicleEntry.rewardExp || 0) +
      ' | Oro: ' + (selectedChronicleEntry.rewardGold || 0),
      110, 1290, 960, 36
    );

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 28px Courier New';
    wrapCanvasText(ctx, 'Recompensa de Campana: La historia ha sido digna del laúd de Jasper.', 110, 1380, 960, 38);

    ctx.fillStyle = '#9b59b6';
    ctx.font = 'italic 24px Courier New';
    wrapCanvasText(ctx, 'Jasper firma esta gesta para las plazas del reino.', 110, 1470, 960, 34);

    vscode.postMessage({
      command: 'saveAchievementImage',
      base64Data: canvas.toDataURL('image/png'),
      fileName: buildChronicleFileName(selectedChronicleEntry)
    });
}
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text || '').split(/\s+/);
    let line = '';
    let currentY = y;

    words.forEach((word) => {
        const testLine = line ? line + ' ' + word : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
            ctx.fillText(line, x, currentY);
            line = word;
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    });

    if (line) {
        ctx.fillText(line, x, currentY);
    }
}
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}
function buildChronicleFileName(entry) {
    const title = String(entry?.title || 'cronica')
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñ]+/gi, '_')
      .replace(/^_+|_+$/g, '');
    return 'badge_final_' + (title || 'cronica') + '.png';
}
function renderChatMessage(role, text) {
    const history = document.getElementById('chat-history');
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + (role === 'user' ? 'user' : 'bard');
    bubble.textContent = text;
    history.appendChild(bubble);
    history.scrollTop = history.scrollHeight;
}
function renderChatSuggestion(suggestion) {
    if (!suggestion?.id) return;

    currentChatSuggestions.set(suggestion.id, suggestion);

    const history = document.getElementById('chat-history');
    const wrapper = document.createElement('div');
    wrapper.className = 'chat-suggestion';
    wrapper.setAttribute('data-chat-suggestion-id', suggestion.id);

    const title = document.createElement('div');
    title.className = 'chat-suggestion-title';
    title.textContent = 'HITL de Jasper: ' + (suggestion.title || 'Siguiente paso recomendado');

    const reason = document.createElement('div');
    reason.className = 'chat-suggestion-reason';
    reason.textContent = suggestion.reason || 'Jasper sugiere actuar según el estado actual del IDE.';

    const meta = document.createElement('div');
    meta.className = 'chat-suggestion-meta';
    meta.textContent = 'Acción: ' + (suggestion.recommended_action || 'sin definir')
      + (suggestion.requires_confirmation ? ' | Requiere confirmación' : ' | Ejecutable desde el chat')
      + (lastAiModel ? ' | Modelo: ' + lastAiModel : '');

    const button = document.createElement('button');
    button.className = 'chat-suggestion-btn';
    button.setAttribute('data-chat-suggestion-btn', suggestion.id);
    button.textContent = suggestion.cta_label || 'Ejecutar sugerencia';

    wrapper.appendChild(title);
    wrapper.appendChild(reason);
    wrapper.appendChild(meta);
    wrapper.appendChild(button);
    history.appendChild(wrapper);
    history.scrollTop = history.scrollHeight;
}
function updateChatTitleModel() {
    const titleEl = document.getElementById('chat-title');
    if (!titleEl) return;
    titleEl.textContent = lastAiModel
        ? '💬 Consejo de Jasper · ' + lastAiModel
        : '💬 Consejo de Jasper';
}
function pulseChatOverlay() {
    const overlay = document.getElementById('chat-overlay');
    if (!overlay) return;
    overlay.classList.remove('hitl-glow');
    overlay.offsetHeight;
    overlay.classList.add('hitl-glow');
    setTimeout(() => overlay.classList.remove('hitl-glow'), 950);
}
function markChatSuggestionUsed(suggestionId) {
    const wrapper = document.querySelector('[data-chat-suggestion-id="' + suggestionId + '"]');
    if (!wrapper) return;
    wrapper.classList.add('used');
    const button = wrapper.querySelector('[data-chat-suggestion-btn]');
    if (button) {
        button.disabled = true;
        button.textContent = 'Ritual enviado';
    }
}
function hitlToast(text, color = '#00d4ff') {
    pulseChatOverlay();
    showFloatingMessage(text, 2000, color);
}
function toggleChat(forceOpen) {
    const overlay = document.getElementById('chat-overlay');
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !overlay.classList.contains('active');
    overlay.classList.toggle('active', shouldOpen);
    if (shouldOpen) {
        document.getElementById('chat-input').focus();
    }
}
function setViewButtonActive(btnId, active) {
    const el = document.getElementById(btnId);
    if (!el) return;
    el.classList.toggle('active', !!active);
}
function toggleTheaterMode() {
    document.body.classList.toggle('layout-theater');
    setViewButtonActive('btn-theater', document.body.classList.contains('layout-theater'));
}
function toggleZenLayout() {
    document.body.classList.toggle('layout-zen');
    setViewButtonActive('btn-zen', document.body.classList.contains('layout-zen'));
}
function requestMoveToMainColumn() {
    vscode.postMessage({ command: 'moveToColumnOne' });
}
function toggleMaximizeEditorGroup() {
    vscode.postMessage({ command: 'toggleMaximizeEditorGroup' });
}
function toggleZenMode() {
    vscode.postMessage({ command: 'toggleZenMode' });
}
function showCommitModal(payload) {
    pendingCommitCardId = payload?.cardId || null;
    document.getElementById('commit-message-input').value = payload?.suggestedMessage || '';
    document.getElementById('commit-changed-files').textContent = payload?.changedFiles?.length
      ? 'Pergaminos tocados: ' + payload.changedFiles.join(', ')
      : '';
    document.getElementById('commit-modal').classList.add('active');
    document.getElementById('commit-message-input').focus();
    document.getElementById('commit-message-input').select();
}
function hideCommitModal() {
    pendingCommitCardId = null;
    document.getElementById('commit-modal').classList.remove('active');
}
function confirmCommit() {
    const commitMessage = document.getElementById('commit-message-input').value.trim();
    if (!commitMessage) return;
    vscode.postMessage({
      command: 'confirmCommitRequest',
      commitMessage,
      cardId: pendingCommitCardId
    });
}
function submitChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    renderChatMessage('user', text);
    input.value = '';
    vscode.postMessage({ command: 'chatMessage', text });
}
function exportChatTranscript() {
    vscode.postMessage({ command: 'exportChatTranscript' });
}
function executeChatSuggestion(suggestionId) {
    const suggestion = currentChatSuggestions.get(suggestionId);
    if (!suggestion) return;
    vscode.postMessage({
      command: 'executeStructuredSuggestion',
      suggestion
    });
}
function highlightAdventureCard(cardId) {
    switchTab('destiny');
    document.querySelectorAll('.adventure-card').forEach(card => {
      card.classList.toggle('selected', card.getAttribute('data-card-id') === cardId);
    });
}
function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
    document.querySelectorAll('.side-tab').forEach((t) => {
        t.classList.toggle('active', t.getAttribute('data-tab') === name);
    });
    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.toggle('active', c.id === 'tab-' + name);
    });
    if (name !== 'chronicle') {
        closeChronicleModal();
    }
}
function preselectAdventureCard(cardId) {
    if (!cardId) return;
    document.querySelectorAll('.adventure-card').forEach(card => {
        card.classList.toggle('selected', card.getAttribute('data-card-id') === cardId);
    });
}
function nudgeDestinyTab() {
    const tab = document.querySelector('.side-tab[data-tab="destiny"]');
    if (!tab) return;
    tab.classList.remove('hitl-ping');
    tab.offsetHeight;
    tab.classList.add('hitl-ping');
    setTimeout(() => tab.classList.remove('hitl-ping'), 950);
}

// ── DELEGACIÓN DE EVENTOS ──────────────────────────────────────────────
document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-move-main')) {
        requestMoveToMainColumn();
        return;
    }
    if (e.target.closest('#btn-max-group')) {
        toggleMaximizeEditorGroup();
        return;
    }
    if (e.target.closest('#btn-theater')) {
        toggleTheaterMode();
        return;
    }
    if (e.target.closest('#btn-zen')) {
        toggleZenLayout();
        toggleZenMode();
        return;
    }
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
    if (e.target.closest('#btn-commit')) {
        doCommit();
        return;
    }
    if (e.target.closest('#btn-chat')) {
        toggleChat();
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
    const chronicleEntry = e.target.closest('.chronicle-entry');
    if (chronicleEntry) {
        const index = parseInt(chronicleEntry.getAttribute('data-chronicle-index'), 10);
        if (!isNaN(index)) openChronicleEntry(index);
        return;
    }
    if (e.target.closest('#chronicle-modal-close') || e.target.id === 'chronicle-modal') {
        closeChronicleModal();
        return;
    }
    if (e.target.closest('#commit-cancel-btn') || e.target.id === 'commit-modal') {
        hideCommitModal();
        return;
    }
    if (e.target.closest('#commit-confirm-btn')) {
        confirmCommit();
        return;
    }
    if (e.target.closest('#chronicle-export-btn')) {
        exportSelectedChronicle();
        return;
    }
    if (e.target.closest('#chat-send')) {
        submitChatMessage();
        return;
    }
    if (e.target.closest('#chat-close')) {
        toggleChat(false);
        return;
    }
    if (e.target.closest('#chat-export')) {
        exportChatTranscript();
        return;
    }
    const chatSuggestionBtn = e.target.closest('.chat-suggestion-btn');
    if (chatSuggestionBtn) {
        const suggestionId = chatSuggestionBtn.getAttribute('data-chat-suggestion-btn');
        if (suggestionId) executeChatSuggestion(suggestionId);
        return;
    }
    const cardBtn = e.target.closest('.btn-card-action, .adventure-card');
    if (cardBtn) {
        const cardId = cardBtn.getAttribute('data-card-id');
        const card = currentAdventureCards.find(entry => entry.id === cardId);
        if (card) chooseAdventureCard(card);
        return;
    }
    const acceptBtn = e.target.closest('.btn-quest-accept');
    if (acceptBtn) {
        const questId = acceptBtn.getAttribute('data-quest-id');
        if (questId) acceptQuest(questId);
        return;
    }
});
// #region debug-point D:bind-chat
(()=>{const __chatInput=document.getElementById('chat-input');__dbg('D','panel.js:chat-bind','chat-input-bind-attempt',{found:!!__chatInput});if(__chatInput){__chatInput.addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();submitChatMessage();}});}})();
// #endregion

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
function doCommit() {
    vscode.postMessage({ command: 'commitChangesRequest' });
}
function purchaseItem(itemId, price) {
    vscode.postMessage({ command: 'purchaseItem', itemId, price });
}
function doEquip(itemId, slotType) {
    vscode.postMessage({ command: 'equipItemRequest', itemId, slotType });
}
function acceptQuest(questId) {
    vscode.postMessage({ command: 'acceptQuestRequest', questId });
}
function takeSnapshot() {
    game.renderer.snapshot((image) => {
        vscode.postMessage({ command: 'saveAchievementImage', base64Data: image.src });
    });
}
function chooseAdventureCard(card) {
    highlightAdventureCard(card.id);
    vscode.postMessage({ command: 'cardSelected', card });
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
        case 'chatResponse':
            toggleChat(true);
            lastAiModel = data.aiModel || null;
            updateChatTitleModel();
            renderChatMessage('bard', data.text || '');
            if (data.suggestion) {
                renderChatSuggestion(data.suggestion);
                pulseChatOverlay();
            }
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
        case 'showAdventureCards':
            renderAdventureCards(data.cards || []);
            break;
        case 'removeAdventureCard':
            if (data.cardId) removeAdventureCard(data.cardId);
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
        case 'openSideTab':
            switchTab(data.tab || 'destiny');
            break;
        case 'focusAdventureCard':
            if (data.cardId) highlightAdventureCard(data.cardId);
            break;
        case 'showCommitModal':
            showCommitModal(data);
            break;
        case 'hideCommitModal':
            hideCommitModal();
            break;
        case 'markChatSuggestionUsed':
            if (data.suggestionId) markChatSuggestionUsed(data.suggestionId);
            break;
        case 'hitlToast':
            if (data.text) hitlToast(data.text, data.color || '#00d4ff');
            break;
        case 'hitlNudge':
            if (data.cardId) preselectAdventureCard(data.cardId);
            nudgeDestinyTab();
            break;
    }
});

// ── INICIO REAL: Cargar imágenes con fetch, luego arrancar Phaser ────────
console.log('[NoCodeQuest] Cargando imágenes con fetch...');
// #region debug-point E:asset-load
__dbg('E','panel.js:assets','promise-all-start',{hero:HERO_URI,bug:BUG_URI,dungeon:DUNGEON_URI});
// #endregion
Promise.all([
    loadImage(DUNGEON_URI),
    loadImage(HERO_URI),
    loadImage(BUG_URI)
]).then(([dungeonImg, heroImg, bugImg]) => {
    loadedDungeon = dungeonImg;
    loadedHero = heroImg;
    loadedBug = bugImg;
    console.log('[NoCodeQuest] Imágenes cargadas correctamente');
    // #region debug-point E:asset-load
    __dbg('E','panel.js:assets','promise-all-success',{dungeon:!!dungeonImg,hero:!!heroImg,bug:!!bugImg});
    // #endregion
    startGame();
}).catch(err => {
    // #region debug-point E:asset-load
    __dbg('E','panel.js:assets','promise-all-failed',{message:err.message,stack:err.stack||null});
    // #endregion
    console.error('[NoCodeQuest] Error fatal al cargar imágenes:', err);
    document.getElementById('phaser-container').innerHTML = '<div style="color:red;padding:20px;">Error al cargar los pergaminos visuales. Revisa la consola.</div>';
});
</script>
</body>
</html>`;
};
