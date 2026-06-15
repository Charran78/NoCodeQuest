/**
 * complexityMapper.js
 * La Planta de la Guarida — Analiza la complejidad ciclomática del código
 * y la traduce en nivel de salud visual de la planta en Phaser
 */

const vscode = require('vscode');

// Patrones que suman Puntos de Caos al código
const CONDITIONAL_PATTERN = /\b(if|else\s+if|switch\s*\(|case\s+|catch\s*\()\b/g;
const LOOP_PATTERN        = /\b(for\s*\(|while\s*\(|do\s*\{|forEach\s*\(|map\s*\(|reduce\s*\(|filter\s*\()\b/g;
const NESTED_PATTERN      = /\{[^{}]*\{[^{}]*\{/g; // Triple anidamiento

class ComplexityMapper {
    /**
     * Analiza el documento activo y devuelve el nivel de caos del archivo
     * @returns {{ totalChaos: number, functionsAnalyzed: number, fileName: string }}
     */
    async analyzeActiveDocument() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return { totalChaos: 0, functionsAnalyzed: 0, fileName: '' };

        const document = editor.document;
        const text = document.getText();

        // Solo analizamos archivos de código, no JSON, Markdown, etc.
        const codeLanguages = ['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby'];
        if (!codeLanguages.includes(document.languageId)) {
            return { totalChaos: 0, functionsAnalyzed: 0, fileName: '' };
        }

        let totalChaos = 0;
        let functionCount = 0;

        // 1. Análisis léxico: condicionales y bucles
        const conditionals = (text.match(CONDITIONAL_PATTERN) || []).length;
        const loops        = (text.match(LOOP_PATTERN) || []).length;
        const nestedBlocks = (text.match(NESTED_PATTERN) || []).length;

        totalChaos += conditionals * 1;
        totalChaos += loops * 2;
        totalChaos += nestedBlocks * 3;  // Triple anidamiento = deuda grave

        // 2. Análisis estructural: funciones grandes
        try {
            const symbols = await vscode.commands.executeCommand(
                'vscode.executeDocumentSymbolProvider',
                document.uri
            );

            if (symbols && Array.isArray(symbols)) {
                const funcs = symbols.filter(s =>
                    s.kind === vscode.SymbolKind.Function ||
                    s.kind === vscode.SymbolKind.Method
                );
                functionCount = funcs.length;

                // Penaliza funciones gigantes (God Functions)
                funcs.forEach(fn => {
                    const lineCount = fn.range.end.line - fn.range.start.line;
                    if (lineCount > 60) totalChaos += 8;      // Monstruo épico
                    else if (lineCount > 40) totalChaos += 4; // Monstruo grande
                    else if (lineCount > 20) totalChaos += 1; // Advertencia
                });
            }
        } catch (_) {
            // El proveedor de símbolos puede no estar disponible para todos los lenguajes
        }

        const fileName = document.fileName.split(/[\\/]/).pop();
        return { totalChaos, functionsAnalyzed: functionCount, fileName };
    }

    /**
     * Traduce el nivel de caos numérico a un estado de salud de la planta
     * @param {number} chaos
     * @returns {{ health: 'saludable'|'pachucha'|'marchita', color: string, emoji: string }}
     */
    static getPlantHealth(chaos) {
        if (chaos <= 0)  return { health: 'pristina',   color: '#00ff88', emoji: '🌿' };
        if (chaos < 10)  return { health: 'saludable',  color: '#00ff00', emoji: '🌱' };
        if (chaos < 20)  return { health: 'pachucha',   color: '#ffaa00', emoji: '🍂' };
        return               { health: 'marchita',   color: '#ff3333', emoji: '🥀' };
    }
}

module.exports = ComplexityMapper;
