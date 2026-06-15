/**
 * narrationEngine.js
 * El Oráculo de Groq — Motor narrativo del bardo Jaskier
 * Conecta con Groq API (llama-3.1-8b-instant) para generar diálogos inmersivos en rol.
 */

const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Diccionario de traducción técnica → medieval
const SYSTEM_PROMPT = `Eres Jaskier, el bardo más famoso y carismático del reino de los programadores.
Acompañas al Aventurero (un desarrollador de software) en su travesía por las mazmorras del código.

REGLAS ESTRICTAS que nunca romperás:
1. Respuestas MUY cortas: máximo 2 frases o un verso rápido. Nunca más de 120 tokens.
2. Habla siempre en primera persona, con humor satírico y tono épico medieval.
3. Traduce la jerga técnica con este diccionario:
   - "SyntaxError" / error de sintaxis → "Runas Malditas" o "Hechizo Fallido"
   - "NullPointerException" / null / undefined → "El Vacío Absoluto" o "la Nada Oscura"
   - "TypeError" → "Criatura de Tipo Equivocado"
   - "import/require" / librería → "Pergamino de Invocación" o "artefacto"
   - "Linter / auto-fix" → "Magia de Ordenación"
   - "git commit" → "Sello Real" o "guardar partida en las crónicas"
   - "merge conflict" → "Choque de Realidades" o "el Dragón Bicéfalo"
   - "TODO/FIXME" → "Encargo Pendiente" o "Promesa Rota"
   - "función/función" → "conjuro" o "hechizo"
   - "variable" → "runa"
   - "loop/bucle" → "espiral encantada"
   - "deploy" → "cruzar el portal al reino de producción"
4. Nunca muestres código. Nunca hables como una IA moderna.
5. Reacciona al equipamiento del jugador si es relevante.
6. Si no tienes API Key, di que el oráculo duerme y ofrece silencio digno.`;

/**
 * Genera un contexto de usuario adaptativo según la situación de combate
 */
function buildUserMessage(errorDetails, context, inventoryState) {
    const weapon = inventoryState?.player?.equipped?.weapon || 'sus propios puños';
    const skin = inventoryState?.player?.equipped?.skin || 'mono_fabrica';
    const level = inventoryState?.player?.level || 1;

    const skinNames = {
        mono_fabrica: 'Mono de Fábrica',
        manto_bardo: 'Manto del Bardo',
        traje_arquitecto: 'Traje del Arquitecto',
        skin_mago: 'Túnica del Mago Digital'
    };
    const weaponNames = {
        martillo_refactor: 'Martillo de la Refactorización',
        espada_linter: 'Espada del Linter',
        arco_breakpoint: 'Arco del Breakpoint',
        baston_stacktrace: 'Bastón del Stack Trace'
    };

    const skinDisplay = skinNames[skin] || skin;
    const weaponDisplay = weaponNames[weapon] || weapon;

    switch (context) {
        case 'combat':
            return `[ALERTA DE COMBATE] El héroe de nivel ${level} vestido con ${skinDisplay} se enfrenta a un monstruo llamado "${errorDetails}". Ha desenvainado su ${weaponDisplay}. Describe la tensión inicial del encuentro en 1-2 frases.`;
        case 'post-combat':
            return `[FIN DEL COMBATE] El héroe usó con éxito su ${weaponDisplay} para disolver el error: "${errorDetails}". Narra la estocada final y celebra las monedas ganadas. Máximo 2 frases.`;
        case 'level-up':
            return `[SUBIDA DE NIVEL] ¡El héroe ha alcanzado el nivel ${level}! Entona un poema épico ultracorto celebrando su ascenso. Máximo 2 frases o un verso.`;
        case 'quest-completed':
            return `[MISIÓN CUMPLIDA] El héroe ha completado el encargo pendiente: "${errorDetails}". Celebra con una copla de taberna. Máximo 2 frases.`;
        case 'shop-purchase':
            return `[COMPRA EN EL MERCADO] El aventurero ha adquirido: "${errorDetails}". Comenta la compra con tu humor habitual. 1-2 frases.`;
        case 'equip-item':
            return `[CAMBIO DE EQUIPO] El héroe se ha equipado: "${errorDetails}". Juzga el nuevo look del programador con sarcasmo afectuoso. 1-2 frases.`;
        case 'use-potion':
            return `[ALQUIMIA] El programador ha consumido una Poción de Café. El caos del código bajó. La planta de la guarida respira. 1-2 frases épicas sobre la cafeína mágica.`;
        case 'boss-spawn':
            return `[¡JEFE FINAL!] Un Dragón de Merge Conflict ha bloqueado el archivo. Entra en pánico épico medieval. 2 frases dramáticas.`;
        case 'boss-victory':
            return `[INCURSIÓN COMPLETADA] El aventurero purificó todos los conflictos de merge. ¡El dragón ha muerto! Canta la victoria legendaria. 2 frases gloriosas.`;
        case 'clean-code':
            return `[CÓDIGO LIMPIO] El archivo "${errorDetails}" está impecable y ordenado. Celebra la pureza del código con admiración sincera. 1-2 frases.`;
        case 'share-achievement':
            return `[PREGÓN] El héroe ha pintado un retrato de sus hazañas para mostrarlo en las plazas del reino. Proclama con voz de pregonero. 2 frases pomposas.`;
        default:
            return `[EVENTO: ${context}] ${errorDetails}`;
    }
}

/**
 * Función principal: llama al Oráculo de Groq y retorna la narración de Jaskier
 * @param {string} errorDetails - Descripción del evento
 * @param {string} context - Tipo de evento ('combat', 'post-combat', 'level-up', etc.)
 * @param {object|null} inventoryState - Estado actual del inventario del jugador
 * @param {string} apiKey - API Key de Groq
 * @param {string} model - Modelo de Groq a usar
 * @returns {Promise<string>} Narración de Jaskier
 */
async function fetchNarration(errorDetails, context = 'combat', inventoryState = null, apiKey = '', model = 'llama-3.1-8b-instant') {
    if (!apiKey || apiKey.trim() === '') {
        return silentBard();
    }

    try {
        const userMessage = buildUserMessage(errorDetails, context, inventoryState);

        const response = await axios.post(GROQ_API_URL, {
            model: model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.88,
            max_tokens: 120,
            stream: false
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 8000  // 8s timeout para no bloquear el flujo del IDE
        });

        const narration = response.data?.choices?.[0]?.message?.content;
        if (!narration) throw new Error('Respuesta vacía del oráculo');

        return narration.trim();

    } catch (err) {
        console.error('[NoCodeQuest] Error en el Oráculo de Groq:', err.message);

        // Respuestas de fallback épicas sin consumir tokens
        return fallbackNarration(context);
    }
}

/**
 * Narración de fallback cuando no hay API Key configurada
 */
function silentBard() {
    const silences = [
        '🎵 *El bardo afina su laúd en silencio...* _(Configura tu Groq API Key en los ajustes de NoCodeQuest para despertar al oráculo)_',
        '🎵 *Jaskier entreabre los labios, pero el hechizo del silencio lo encadena...* _(Necesitas una API Key de Groq)_'
    ];
    return silences[Math.floor(Math.random() * silences.length)];
}

/**
 * Narración de fallback cuando Groq falla (sin consumir tokens)
 */
function fallbackNarration(context) {
    const fallbacks = {
        combat: '⚔️ *¡Por los bigotes de Yen! Una distorsión en el tejido arcano silencia mi inspiración... ¡Pero el monstruo está ahí, aventurero!*',
        'post-combat': '🎵 *La victoria es tuya aunque el bardo permanezca mudo. ¡Las monedas tintinean sin necesidad de coplas!*',
        'level-up': '👑 *¡El reino tiembla ante tu ascenso! El bardo lo proclamaría si el oráculo no durmiera.*',
        'quest-completed': '📜 *Misión cumplida en silencio digno. Jaskier lo cantaría si pudiera conectar con el oráculo.*',
        'boss-victory': '🐉 *¡El dragón cae! La leyenda se escribe sola aunque el bardo calle hoy.*',
        default: '🎵 *Un muro de estática mágica silencia al bardo por hoy.*'
    };
    return fallbacks[context] || fallbacks.default;
}

module.exports = { fetchNarration };