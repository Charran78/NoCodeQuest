/**
 * questBoard.js
 * El Tablón de la Taberna — Convierte TODO/FIXME en misiones secundarias
 */

const vscode = require('vscode');

const QUEST_PATTERNS = [
    { regex: /\/\/\s*(TODO):\s*(.+)$/i,   type: 'TODO',  rewardExp: 30, rewardGold: 15 },
    { regex: /\/\/\s*(FIXME):\s*(.+)$/i,  type: 'FIXME', rewardExp: 45, rewardGold: 25 },
    { regex: /\/\/\s*(HACK):\s*(.+)$/i,   type: 'HACK',  rewardExp: 20, rewardGold: 10 },
    { regex: /\/\/\s*(NOTE):\s*(.+)$/i,   type: 'NOTE',  rewardExp: 10, rewardGold: 5  },
    // Soporte para Python y otros lenguajes con #
    { regex: /#\s*(TODO):\s*(.+)$/i,      type: 'TODO',  rewardExp: 30, rewardGold: 15 },
    { regex: /#\s*(FIXME):\s*(.+)$/i,     type: 'FIXME', rewardExp: 45, rewardGold: 25 }
];

const QUEST_TITLES = {
    TODO:  '📜 Encargo de Construcción',
    FIXME: '🛡️ Contrato de Saneamiento',
    HACK:  '⚠️ Misión de Chapuza Temporal',
    NOTE:  '📌 Nota del Escribano'
};

class QuestBoard {
    /**
     * Escanea el documento activo en busca de misiones (TODO/FIXME/HACK)
     * @param {vscode.TextDocument} [document] - Documento a escanear (usa el activo si no se pasa)
     * @returns {Array} Lista de misiones encontradas
     */
    scanForQuests(document = null) {
        const doc = document || vscode.window.activeTextEditor?.document;
        if (!doc) return [];

        const text = doc.getText();
        const lines = text.split(/\r?\n/);
        const quests = [];

        lines.forEach((lineText, index) => {
            for (const pattern of QUEST_PATTERNS) {
                const match = lineText.match(pattern.regex);
                if (match) {
                    const type = match[1].toUpperCase();
                    const description = match[2].trim();

                    quests.push({
                        id: `quest_${doc.fileName}_${index}_${type}`,
                        type,
                        title: QUEST_TITLES[type] || '📜 Encargo Desconocido',
                        description,
                        line: index,
                        fileName: doc.fileName.split(/[\\/]/).pop(),
                        rewardExp: pattern.rewardExp,
                        rewardGold: pattern.rewardGold
                    });
                    break; // Solo un patrón por línea
                }
            }
        });

        return quests;
    }

    /**
     * Detecta qué misiones han sido completadas comparando dos listas
     * @param {Array} oldQuests - Lista anterior de misiones
     * @param {Array} newQuests - Lista actualizada de misiones
     * @returns {Array} Misiones que ya no existen (completadas)
     */
    detectCompletedQuests(oldQuests, newQuests) {
        return oldQuests.filter(oldQ =>
            !newQuests.some(newQ => newQ.id === oldQ.id)
        );
    }
}

module.exports = QuestBoard;
