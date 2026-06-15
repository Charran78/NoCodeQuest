/**
 * bossManager.js
 * El Dragón del Merge — Detecta conflictos de Git y gestiona la batalla final
 */

const vscode = require('vscode');

// Marcadores de conflicto de Git
const CONFLICT_START  = /^<{7} .+/gm;
const CONFLICT_MID    = /^={7}$/gm;
const CONFLICT_END    = /^>{7} .+/gm;

class BossManager {
    constructor() {
        this.isBossFightActive = false;
        this.bossHeadsLeft = 0;
        this.bossFileName = '';
    }

    /**
     * Cuenta los conflictos de merge en un documento (= cabezas del dragón)
     * @param {vscode.TextDocument} document
     * @returns {number} Número de conflictos encontrados
     */
    countMergeConflicts(document) {
        const text = document.getText();
        const starts = (text.match(CONFLICT_START) || []).length;
        return starts;
    }

    /**
     * Verifica si hay conflictos en el documento activo
     * @returns {{ hasConflicts: boolean, count: number, fileName: string }}
     */
    checkActiveDocument() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return { hasConflicts: false, count: 0, fileName: '' };

        const count = this.countMergeConflicts(editor.document);
        const fileName = editor.document.fileName.split(/[\\/]/).pop();
        return { hasConflicts: count > 0, count, fileName };
    }

    /**
     * Calcula el botín de guerra por derrotar al dragón
     * @param {number} headsDefeated - Número de conflictos resueltos
     * @returns {{ gold: number, exp: number, badge: string }}
     */
    getBossLoot(headsDefeated = 1) {
        return {
            gold: 150 * headsDefeated,
            exp:  300 * headsDefeated,
            badge: 'asesino_dragones'
        };
    }

    /**
     * Activa el modo boss fight
     */
    startBossFight(conflictCount, fileName) {
        this.isBossFightActive = true;
        this.bossHeadsLeft = conflictCount;
        this.bossFileName = fileName;
    }

    /**
     * Actualiza el número de cabezas restantes
     * @returns {boolean} true si el jefe fue derrotado
     */
    updateBossHeads(conflictCount) {
        if (!this.isBossFightActive) return false;

        if (conflictCount === 0) {
            this.isBossFightActive = false;
            this.bossHeadsLeft = 0;
            this.bossFileName = '';
            return true; // Boss derrotado
        }

        this.bossHeadsLeft = conflictCount;
        return false;
    }

    /**
     * Resetea el estado del boss
     */
    reset() {
        this.isBossFightActive = false;
        this.bossHeadsLeft = 0;
        this.bossFileName = '';
    }
}

module.exports = BossManager;
