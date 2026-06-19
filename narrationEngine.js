/**
 * narrationEngine.js
 * El Oráculo de Groq — Motor narrativo del bardo Jasper
 * Conecta con Groq API (llama-3.1-8b-instant) para generar diálogos inmersivos en rol.
 */

const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const RATE_LIMIT_COOLDOWN_MS = 30000;
let groqCooldownUntil = 0;
let lastRateLimitLogAt = 0;

// Diccionario de traducción técnica → medieval
const SYSTEM_PROMPT = `Eres Jasper, el bardo más famoso y carismático del reino de los programadores.
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
6. Si el usuario pregunta por codigo, contexto, errores, archivo activo o siguiente paso, DEBES priorizar el estado del IDE y el campo ui_state.speech_text del /compact por encima de pociones, mercado o flavor.
7. Si el /compact trae diagnostics, active_file, modified_files o adventure_cards, debes mencionarlos de forma resumida y util.
8. Si no tienes API Key, di que el oráculo duerme y ofrece silencio digno.`;

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
        case 'commit-message':
            return `[SELLO REAL] Genera un mensaje de commit MUY corto, en una sola línea, sin comillas ni emojis, con tono medieval sobrio. Máximo 60 caracteres. Contexto: "${errorDetails}".`;
        case 'commit-celebration':
            return `[CRONICA DE COMMIT] El Aventurero ha sellado cambios reales en las crónicas: "${errorDetails}". Celebra el commit con tono épico medieval, sin hablar de combate. Máximo 2 frases.`;
        case 'chat':
            return `[CONSEJO DE TABERNA] El Aventurero te pregunta: "${errorDetails}". Responde como Jasper con consejo útil, tono épico y humor ligero. Máximo 2 frases.`;
        default:
            return `[EVENTO: ${context}] ${errorDetails}`;
    }
}

function clampString(value, maxLen = 5200) {
    const str = String(value || '');
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '\n...(truncado)';
}

function buildChatMessageWithCompact(userText, compact, inventoryState) {
    const weapon = inventoryState?.player?.equipped?.weapon || 'sus propios puños';
    const skin = inventoryState?.player?.equipped?.skin || 'mono_fabrica';
    const level = inventoryState?.player?.level || 1;

    const compactText = compact ? clampString(JSON.stringify(compact)) : '';
    const ide = compact?.ide_state || {};
    const diagnostics = ide?.diagnostics || {};
    const firstError = Array.isArray(diagnostics.errors) && diagnostics.errors.length ? diagnostics.errors[0] : null;
    const activeFile = ide?.active_file || null;
    const modifiedFiles = Array.isArray(ide?.modified_files) ? ide.modified_files : [];
    const cards = Array.isArray(ide?.adventure_cards) ? ide.adventure_cards : [];
    const speech = compact?.ui_state?.speech_text || null;
    const digestLines = [
        activeFile ? `Archivo activo: ${activeFile.name || 'desconocido'} (${activeFile.language || 'sin lenguaje'})` : 'Archivo activo: ninguno',
        `Errores activos: ${Array.isArray(diagnostics.errors) ? diagnostics.errors.length : 0}`,
        firstError ? `Error principal: ${firstError.file || 'archivo'}:${firstError.line || '?'} ${firstError.message || ''}` : 'Error principal: ninguno',
        `Modificados: ${modifiedFiles.length}`,
        cards[0] ? `Carta sugerida: ${cards[0].title || cards[0].action || 'ninguna'}` : 'Carta sugerida: ninguna',
        speech ? `Speech actual: ${speech}` : 'Speech actual: ninguno'
    ];
    const header = `[CONSEJO /compact] Héroe nivel ${level}, armado con ${weapon} y vestido con ${skin}. El Aventurero pregunta: "${userText}".`;
    const digest = `\n\nRESUMEN VIVO:\n- ${digestLines.join('\n- ')}`;
    const body = compactText ? `\n\n/compact:\n${compactText}` : '';
    return header + digest + body + `\n\nResponde con 1-2 frases, sin código, usando el /compact como fuente de verdad. Si la pregunta va sobre código o contexto, céntrate en Archivo activo, Error principal, Modificados y Speech actual. Si Archivo activo es ninguno, dilo claramente y pide abrir un pergamino concreto antes de sellar commit.`;
}

function buildOracleMeta(state, label, reason = '') {
    return {
        state,
        label,
        reason
    };
}

/**
 * Función principal: llama al Oráculo de Groq y retorna la narración de Jasper
 * @param {string} errorDetails - Descripción del evento
 * @param {string} context - Tipo de evento ('combat', 'post-combat', 'level-up', etc.)
 * @param {object|null} inventoryState - Estado actual del inventario del jugador
 * @param {string} apiKey - API Key de Groq
 * @param {string} model - Modelo de Groq a usar
 * @returns {Promise<string>} Narración de Jasper
 */
async function fetchNarrationDetailed(errorDetails, context = 'combat', inventoryState = null, apiKey = '', model = 'llama-3.1-8b-instant', extra = null) {
    if (!apiKey || apiKey.trim() === '') {
        return {
            text: silentBard(),
            oracle: buildOracleMeta('sleeping', 'Oráculo dormido', 'Falta API Key')
        };
    }

    const now = Date.now();
    if (groqCooldownUntil > now) {
        return {
            text: fallbackNarration(context),
            oracle: buildOracleMeta('cooldown', 'Oráculo en cooldown', 'Rate limit activo')
        };
    }

    try {
        const userMessage = context === 'chat' && extra && extra.compact
            ? buildChatMessageWithCompact(errorDetails, extra.compact, inventoryState)
            : buildUserMessage(errorDetails, context, inventoryState);

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

        return {
            text: narration.trim(),
            oracle: buildOracleMeta('live', 'Oráculo activo', 'Respuesta de Groq')
        };

    } catch (err) {
        const status = err?.response?.status || null;
        if (status === 429) {
            groqCooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
            if ((Date.now() - lastRateLimitLogAt) > RATE_LIMIT_COOLDOWN_MS) {
                lastRateLimitLogAt = Date.now();
                console.warn('[NoCodeQuest] Groq en cooldown temporal por rate limit (429).');
            }
            return {
                text: fallbackNarration(context),
                oracle: buildOracleMeta('cooldown', 'Oráculo en cooldown', 'Groq devolvió 429')
            };
        }

        console.error('[NoCodeQuest] Error en el Oráculo de Groq:', err.message);

        return {
            text: fallbackNarration(context),
            oracle: buildOracleMeta('fallback', 'Guía local', err?.message || 'Error del oráculo')
        };
    }
}

async function fetchNarration(errorDetails, context = 'combat', inventoryState = null, apiKey = '', model = 'llama-3.1-8b-instant', extra = null) {
    const result = await fetchNarrationDetailed(errorDetails, context, inventoryState, apiKey, model, extra);
    return result.text;
}

/**
 * Narración de fallback cuando no hay API Key configurada
 */
function silentBard() {
    const silences = [
        '🎵 *El bardo afina su laúd en silencio...* _(Configura tu Groq API Key en los ajustes de NoCodeQuest para despertar al oráculo)_',
        '🎵 *Jasper entreabre los labios, pero el hechizo del silencio lo encadena...* _(Necesitas una API Key de Groq)_'
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
        'quest-completed': '📜 *Misión cumplida en silencio digno. Jasper lo cantaría si pudiera conectar con el oráculo.*',
        'boss-victory': '🐉 *¡El dragón cae! La leyenda se escribe sola aunque el bardo calle hoy.*',
        'commit-message': 'sello real antes de nueva incursión',
        'commit-celebration': '🔒 *El sello real queda inscrito en las crónicas y Jasper brinda por tu disciplina versionadora.*',
        chat: '🎵 *Jasper te escucha desde la penumbra y recomienda avanzar con tino, aunque hoy el oráculo bostece.*',
        default: '🎵 *Un muro de estática mágica silencia al bardo por hoy.*'
    };
    return fallbacks[context] || fallbacks.default;
}

module.exports = { fetchNarration, fetchNarrationDetailed };
