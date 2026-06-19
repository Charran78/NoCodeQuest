/**
 * game-state.js
 * Módulo de estado del juego
 */

const GameState = {
    player: null,
    inventory: null,
    stats: null,
    lair: null,
    badges: [],
    quests: [],
    adventureLog: [],
    adventureCards: [],
    
    init(initialState) {
        this.update(initialState);
    },
    
    update(newState) {
        if (!newState) return;
        
        if (newState.player) this.player = newState.player;
        if (newState.inventory) this.inventory = newState.inventory;
        if (newState.stats) this.stats = newState.stats;
        if (newState.lair) this.lair = newState.lair;
        if (Array.isArray(newState.badges)) this.badges = newState.badges;
        if (newState.acceptedQuests) this.quests = newState.acceptedQuests;
        if (Array.isArray(newState.adventureLog)) this.adventureLog = newState.adventureLog;
    },
    
    getPlayerLevel() {
        return this.player?.level || 1;
    },
    
    getPlayerRank() {
        return this.player?.rank || 'Novicio';
    },
    
    getEquippedWeapon() {
        return this.player?.equipped?.weapon || 'martillo_refactor';
    },
    
    getEquippedSkin() {
        return this.player?.equipped?.skin || 'mono_fabrica';
    },
    
    hasItem(itemId) {
        if (!this.inventory) return false;
        // Check weapons
        if (this.inventory.weapons?.some(w => w.id === itemId)) return true;
        // Check skins
        if (this.inventory.skins?.some(s => s.id === itemId)) return true;
        // Check scrolls
        if (this.inventory.scrolls?.[itemId] > 0) return true;
        // Check potions
        if (this.inventory.potions?.[itemId] > 0) return true;
        return false;
    },
    
    getGold() {
        return this.player?.gold || 0;
    },
    
    getExp() {
        return this.player?.exp || 0;
    },
    
    getLairChaos() {
        return this.lair?.technical_debt_level || 0;
    },
    
    getLairHealth() {
        return this.lair?.plant_health || 'saludable';
    },

    getAdventureLog() {
        return this.adventureLog || [];
    },

    getBadges() {
        return this.badges || [];
    }
};

// Exportar para uso global
window.GameState = GameState;
