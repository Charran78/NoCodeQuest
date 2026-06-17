/**
 * inventoryManager.js
 * El Cofre de Runas — Gestiona el estado RPG del jugador
 * EXP, niveles, oro, equipamiento, skins, armas, consumibles
 */

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// Tabla de rangos del Gremio de Programadores
const GUILD_RANKS = [
    { level: 1, title: 'Picacódigo Junior',       expNeeded: 0   },
    { level: 2, title: 'Artesano de Funciones',    expNeeded: 200 },
    { level: 3, title: 'Caballero del Clean Code', expNeeded: 600 },
    { level: 4, title: 'Mago del Backend',         expNeeded: 1200 },
    { level: 5, title: 'Gran Maestro de Sistemas', expNeeded: 2000 },
    { level: 6, title: 'Leyenda del Repositorio',  expNeeded: 3000 }
];

// Estado inicial de una partida nueva
const NEW_GAME_STATE = {
    player: {
        name: 'Aventurero',
        level: 1,
        exp: 0,
        gold: 50,
        equipped: {
            skin: 'mono_fabrica',
            weapon: 'martillo_refactor'
        }
    },
    inventory: {
        weapons: ['martillo_refactor'],
        skins: ['mono_fabrica'],
        scrolls: { pergamino_estabilidad: 1 },
        potions: { pocion_cafe: 0 }
    },
    badges: [],
    lair: {
        decorations: ['planta_buen_codigo'],
        technical_debt_level: 0
    },
    acceptedQuests: [],
    adventureLog: [],
    stats: {
        bugsDefeated: 0,
        commitsTotal: 0,
        questsCompleted: 0,
        bossesDefeated: 0,
        linesAnalyzed: 0
    }
};

class InventoryManager {
    constructor(workspaceRoot) {
        this.savePath = workspaceRoot
            ? path.join(workspaceRoot, '.nocodequestrc.json')
            : null;
        this.gameState = this.loadGame();
    }

    // ─── Persistencia ─────────────────────────────────────────────────────────

    loadGame() {
        try {
            if (this.savePath && fs.existsSync(this.savePath)) {
                const raw = fs.readFileSync(this.savePath, 'utf8');
                const saved = JSON.parse(raw);
                // Merge con estado nuevo para añadir propiedades que falten en saves antiguos
                return this._deepMerge(JSON.parse(JSON.stringify(NEW_GAME_STATE)), saved);
            }
        } catch (err) {
            console.error('[NoCodeQuest] Error cargando partida:', err.message);
        }
        return JSON.parse(JSON.stringify(NEW_GAME_STATE));
    }

    saveGame() {
        if (!this.savePath) return;
        try {
            fs.writeFileSync(this.savePath, JSON.stringify(this.gameState, null, 2), 'utf8');
        } catch (err) {
            console.error('[NoCodeQuest] Error guardando partida:', err.message);
        }
    }

    _deepMerge(base, override) {
        const result = { ...base };
        for (const key of Object.keys(override)) {
            if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
                result[key] = this._deepMerge(base[key] || {}, override[key]);
            } else {
                result[key] = override[key];
            }
        }
        return result;
    }

    // ─── Sistema de Experiencia y Niveles ─────────────────────────────────────

    earnReward(expGain, goldGain, reason = '') {
        const player = this.gameState.player;
        player.exp += expGain;
        player.gold += goldGain;

        let leveledUp = false;
        let newLevel = player.level;

        // Calcula el EXP necesario para el siguiente nivel
        const getExpForLevel = (lvl) => {
            const rank = GUILD_RANKS.find(r => r.level === lvl + 1);
            return rank ? rank.expNeeded - (GUILD_RANKS.find(r => r.level === lvl)?.expNeeded || 0) : 500;
        };

        let expNeeded = getExpForLevel(player.level);
        while (player.exp >= expNeeded) {
            player.exp -= expNeeded;
            player.level++;
            leveledUp = true;
            newLevel = player.level;
            this._unlockLevelRewards(player.level);
            expNeeded = getExpForLevel(player.level);
        }

        this.saveGame();

        return {
            leveledUp,
            currentLevel: player.level,
            rankTitle: this.getCurrentRank(),
            expGained: expGain,
            goldGained: goldGain,
            currentExp: player.exp,
            expNeeded: getExpForLevel(player.level),
            reason
        };
    }

    getCurrentRank() {
        const level = this.gameState.player.level;
        const rank = [...GUILD_RANKS].reverse().find(r => level >= r.level);
        return rank ? rank.title : 'Picacódigo Junior';
    }

    _unlockLevelRewards(level) {
        const inv = this.gameState.inventory;
        if (level === 2 && !inv.weapons.includes('espada_linter')) {
            inv.weapons.push('espada_linter');
        }
        if (level === 3) {
            inv.scrolls.pergamino_sabiduria = (inv.scrolls.pergamino_sabiduria || 0) + 1;
        }
        if (level === 4 && !inv.weapons.includes('arco_breakpoint')) {
            inv.weapons.push('arco_breakpoint');
        }
        if (level === 5 && !inv.skins.includes('traje_arquitecto')) {
            inv.skins.push('traje_arquitecto');
        }
    }

    // ─── Estadísticas ─────────────────────────────────────────────────────────

    recordBugDefeated() {
        this.gameState.stats.bugsDefeated++;
        this._checkBadges();
        this.saveGame();
    }

    recordCommit() {
        this.gameState.stats.commitsTotal++;
        this._checkBadges();
        this.saveGame();
    }

    recordQuestCompleted() {
        this.gameState.stats.questsCompleted++;
        this._checkBadges();
        this.saveGame();
    }

    recordBossDefeated() {
        this.gameState.stats.bossesDefeated++;
        this._checkBadges();
        this.saveGame();
    }

    recordAdventureEvent(entry) {
        if (!entry) return;

        this.gameState.adventureLog.unshift({
            ...entry,
            chronicleText: entry.chronicleText || this._composeChronicleText(entry),
            recordedAt: new Date().toISOString()
        });
        this.gameState.adventureLog = this.gameState.adventureLog.slice(0, 50);
        this.saveGame();
    }

    _composeChronicleText(entry) {
        const weapon = this.gameState.player?.equipped?.weapon || 'arma desconocida';
        const weaponNames = {
            martillo_refactor: 'Martillo de la Refactorización',
            espada_linter: 'Espada del Linter',
            arco_breakpoint: 'Arco del Breakpoint'
        };
        const weaponLabel = weaponNames[weapon] || weapon;

        switch (entry.type) {
            case 'commit':
                return `En una hora propicia del reino, el Aventurero, blandiendo la ${weaponLabel}, selló una partida gloriosa. ${entry.description || 'Las crónicas de Git recibieron un nuevo juramento.'}`;
            case 'quest-accepted':
                return `Jasper alzó su laúd cuando el Aventurero juró la misión "${entry.title}". Desde ese instante, ${entry.description || 'un nuevo encargo'} quedó inscrito en la crónica del gremio.`;
            case 'quest-completed':
                return `La misión "${entry.title}" fue cumplida con pulso firme y runas obedientes. El reino premió la hazaña con ${entry.rewardExp || 0} EXP y ${entry.rewardGold || 0} monedas de oro.`;
            case 'bug-defeated':
                return `Un enemigo del código cayó bajo la ${weaponLabel}. ${entry.description || 'El monstruo se deshizo en polvo arcano'} y la mazmorra recuperó parte de su sosiego.`;
            case 'potion-used':
                return `El Aventurero bebió una Poción de Café y el brebaje recorrió la guarida como un conjuro de claridad. La planta resistió una noche más frente al caos técnico.`;
            case 'shop-purchase':
                return `En el Mercado del Gremio, el Aventurero adquirió ${entry.itemName || 'un artefacto'} por ${entry.price || 0} monedas. Jasper juró que toda gran campaña necesita provisiones dignas.`;
            case 'boss-defeated':
                return `El Dragón del Merge cayó al fin, y sus cabezas se rindieron ante la disciplina del Aventurero. Las crónicas registraron una victoria que los repositorios no olvidarán.`;
            default:
                return entry.description || entry.title || 'Una nueva hazaña ha sido inscrita en la crónica del reino.';
        }
    }

    acceptQuest(quest) {
        if (!quest?.id) {
            return { success: false, message: '❌ Esa misión carece de pergamino válido.' };
        }

        const alreadyAccepted = this.gameState.acceptedQuests.some(q => q.id === quest.id);
        if (alreadyAccepted) {
            return { success: false, message: '⚠️ Esa misión ya fue jurada ante el gremio.' };
        }

        const acceptedQuest = {
            id: quest.id,
            title: quest.title,
            description: quest.description,
            fileName: quest.fileName || null,
            filePath: quest.filePath || null,
            line: typeof quest.line === 'number' ? quest.line : null,
            rewardExp: quest.rewardExp || 0,
            rewardGold: quest.rewardGold || 0,
            acceptedAt: new Date().toISOString()
        };

        this.gameState.acceptedQuests.push(acceptedQuest);
        this.recordAdventureEvent({
            type: 'quest-accepted',
            title: acceptedQuest.title,
            description: acceptedQuest.description,
            targetFile: acceptedQuest.filePath || acceptedQuest.fileName || null,
            targetLine: acceptedQuest.line
        });
        this.saveGame();

        return {
            success: true,
            message: `📜 Misión aceptada: ${acceptedQuest.title}`,
            quest: acceptedQuest,
            newState: this.gameState
        };
    }

    _checkBadges() {
        const { stats, badges } = this.gameState;
        const addBadge = (id) => { if (!badges.includes(id)) badges.push(id); };

        if (stats.commitsTotal >= 1)  addBadge('primer_commit');
        if (stats.bugsDefeated >= 50) addBadge('cazador_nulls');
        if (stats.questsCompleted >= 1) addBadge('primer_encargo');
        if (stats.bossesDefeated >= 1) addBadge('asesino_dragones');
        if (stats.bugsDefeated >= 100) addBadge('exterminador');
    }

    // ─── Inventario y Comercio ────────────────────────────────────────────────

    buyItem(itemId, price) {
        const { player, inventory } = this.gameState;

        if (player.gold < price) {
            return { success: false, message: '❌ ¡No tienes suficientes monedas de oro en la bolsa!' };
        }

        if ((itemId.startsWith('espada_') || itemId.startsWith('arco_') || itemId.startsWith('martillo_'))
            && inventory.weapons.includes(itemId)) {
            return { success: false, message: '⚠️ Ya posees esa arma en tu arsenal, Aventurero.' };
        }

        if (itemId.startsWith('skin_') && inventory.skins.includes(itemId)) {
            return { success: false, message: '⚠️ Esa vestimenta ya cuelga en tu armario.' };
        }

        player.gold -= price;

        if (itemId.startsWith('espada_') || itemId.startsWith('arco_') || itemId.startsWith('martillo_')) {
            inventory.weapons.push(itemId);
        } else if (itemId.startsWith('skin_')) {
            inventory.skins.push(itemId);
        } else if (itemId === 'pocion_cafe') {
            inventory.potions.pocion_cafe = (inventory.potions.pocion_cafe || 0) + 1;
        } else {
            inventory.scrolls[itemId] = (inventory.scrolls[itemId] || 0) + 1;
        }

        this.saveGame();
        this.recordAdventureEvent({
            type: 'shop-purchase',
            title: 'Compra en el Mercado',
            description: `El aventurero obtuvo ${itemId}.`,
            itemId,
            itemName: itemId,
            price
        });
        return { success: true, message: `🛍️ ¡Adquirido: ${itemId}!`, newState: this.gameState };
    }

    equipItem(itemId, slotType) {
        const { player, inventory } = this.gameState;

        if (slotType === 'weapon' && !inventory.weapons.includes(itemId)) {
            return { success: false, message: '❌ ¡No posees esa arma en tu arsenal!' };
        }
        if (slotType === 'skin' && !inventory.skins.includes(itemId)) {
            return { success: false, message: '❌ Esa vestimenta no está en tu armario.' };
        }

        player.equipped[slotType] = itemId;
        this.saveGame();

        return { success: true, message: `🛡️ Equipado: ${itemId}`, newState: this.gameState };
    }

    useCoffeePotion() {
        const { inventory, lair } = this.gameState;

        if (!inventory.potions.pocion_cafe || inventory.potions.pocion_cafe <= 0) {
            return { success: false, message: '❌ No te quedan Pociones de Café. ¡Ve al mercado!' };
        }

        inventory.potions.pocion_cafe--;
        lair.technical_debt_level = Math.max(0, lair.technical_debt_level - 15);
        this.saveGame();
        this.recordAdventureEvent({
            type: 'potion-used',
            title: 'Poción de Café Bebida',
            description: `La deuda técnica descendió a ${lair.technical_debt_level}.`
        });

        let newHealth = 'saludable';
        if (lair.technical_debt_level > 25) newHealth = 'marchita';
        else if (lair.technical_debt_level > 12) newHealth = 'pachucha';

        return {
            success: true,
            newChaos: lair.technical_debt_level,
            newHealth,
            newState: this.gameState
        };
    }

    useScroll(scrollId) {
        const { inventory } = this.gameState;

        if (!inventory.scrolls[scrollId] || inventory.scrolls[scrollId] <= 0) {
            return { success: false, message: '❌ No te quedan pergaminos de ese tipo.' };
        }

        inventory.scrolls[scrollId]--;
        this.saveGame();
        return { success: true, scrollId };
    }

    // ─── Efectos de Armas en el IDE ───────────────────────────────────────────

    async useWeaponEffect() {
        const weapon = this.gameState.player.equipped.weapon;

        if (weapon === 'espada_linter') {
            await vscode.commands.executeCommand('editor.action.fixAll');
            return '✨ ¡La Espada del Linter destella! Auto-fix invocado en tu archivo.';
        }
        if (weapon === 'arco_breakpoint') {
            await vscode.commands.executeCommand('editor.debug.action.toggleBreakpoint');
            return '🏹 ¡El Arco del Breakpoint ha congelado un punto del combate!';
        }
        if (weapon === 'martillo_refactor') {
            return '💥 El Martillo de la Refactorización retumba. ¡Extrae lógica redundante a un nuevo conjuro!';
        }
        return '⚔️ Ataque básico ejecutado.';
    }

    getExpMultiplier() {
        const weapon = this.gameState.player.equipped.weapon;
        if (weapon === 'arco_breakpoint') {
            return Math.random() < 0.25 ? 2.0 : 1.15; // Golpe crítico 25%
        }
        return 1.0;
    }

    // ─── Git Integration ──────────────────────────────────────────────────────

    setupGitHooks(onCommit) {
        try {
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            if (!gitExtension) return;

            const gitApi = gitExtension.getAPI(1);
            if (!gitApi?.repositories?.length) return;

            // Escucha cambios de estado en los repositorios (incluye commits)
            const repo = gitApi.repositories[0];
            let lastSeenCommit = repo.state.HEAD?.commit || null;
            repo.state.onDidChange(() => {
                const currentCommit = repo.state.HEAD?.commit || null;
                if (currentCommit && currentCommit !== lastSeenCommit) {
                    lastSeenCommit = currentCommit;
                    onCommit(currentCommit);
                }
            });
        } catch (err) {
            console.error('[NoCodeQuest] Error configurando hooks de Git:', err.message);
        }
    }

    // ─── Getters de estado ────────────────────────────────────────────────────

    getState() { return this.gameState; }
    getPlayer() { return this.gameState.player; }
    getInventory() { return this.gameState.inventory; }
    getLair() { return this.gameState.lair; }
    getAdventureLog() { return this.gameState.adventureLog; }
    getAcceptedQuests() { return this.gameState.acceptedQuests; }
}

module.exports = InventoryManager;
