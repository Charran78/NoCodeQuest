/**
 * phaser-scene.js
 * Escena de Phaser para NoCodeQuest
 */

// #region debug-point A:report-helper
// #region debug-point B-D:phaser-runtime
function reportPhaserDebug(hypothesisId, location, msg, data) {
    fetch('http://127.0.0.1:7777/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId: 'webview-black-screen',
            runId: 'pre-fix',
            hypothesisId,
            location,
            msg: '[DEBUG] ' + msg,
            data: data || {},
            ts: Date.now()
        })
    }).catch(() => {});
}
// #endregion debug-point B-D:phaser-runtime
// #endregion

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.hero = null;
        this.bug = null;
        this.isAttacking = false;
        this.weaponKey = 'hero_attack';
        this.background = null;
    }

    preload() {
        // #region debug-point A:preload-entry
        reportPhaserDebug('A', 'phaser-scene.js:preload', 'preload() entry', {
            hasAssetURIs: !!window.assetURIs,
            assetURIs: window.assetURIs || null,
            hasPreloadedAssets: !!(window.PreloadedAssets && window.PreloadedAssets.images)
        });
        // #endregion

        const preloaded = window.PreloadedAssets && window.PreloadedAssets.images;
        if (preloaded && preloaded.hero && preloaded.bug && preloaded.dungeon) {
            // #region debug-point B:preloaded-assets
            reportPhaserDebug('B', 'phaser-scene.js:preloaded-assets', 'using browser-preloaded assets', {
                keys: Object.keys(preloaded)
            });
            // #endregion
            return;
        }

        // #region debug-point B:loader-hooks
        this.load.on('filecomplete', (key, type) => {
            reportPhaserDebug('B', 'phaser-scene.js:filecomplete', 'file loaded', { key, type });
        });
        this.load.on('loaderror', (fileObj) => {
            reportPhaserDebug('B', 'phaser-scene.js:loaderror', 'file load error', {
                key: fileObj && fileObj.key,
                src: fileObj && fileObj.src,
                type: fileObj && fileObj.type
            });
        });
        this.load.on('complete', () => {
            reportPhaserDebug('C', 'phaser-scene.js:loadcomplete', 'loader complete', {
                textures: ['hero', 'bug', 'dungeon', 'hero_attack'].map((key) => ({
                    key,
                    exists: this.textures.exists(key)
                }))
            });
        });
        // #endregion

        // Las texturas se cargan desde el HTML base
        // Usamos las URIs pasadas desde el panel principal
        if (window.assetURIs) {
            // #region debug-point A:queue-assets
            reportPhaserDebug('A', 'phaser-scene.js:queue', 'queue asset load', {
                hero: window.assetURIs.hero || null,
                bug: window.assetURIs.bug || null,
                dungeon: window.assetURIs.dungeon || null,
                heroAttack: window.assetURIs.heroAttack || window.assetURIs.hero || null
            });
            // #endregion
            this.load.spritesheet('hero', window.assetURIs.hero, { frameWidth: 64, frameHeight: 64 });
            this.load.spritesheet('bug', window.assetURIs.bug, { frameWidth: 64, frameHeight: 64 });
            this.load.image('dungeon', window.assetURIs.dungeon);
            this.load.spritesheet('hero_attack', window.assetURIs.heroAttack || window.assetURIs.hero, { frameWidth: 64, frameHeight: 64 });
        } else {
            // #region debug-point A:no-assets
            reportPhaserDebug('A', 'phaser-scene.js:no-assets', 'window.assetURIs missing');
            // #endregion
        }
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        const preloaded = window.PreloadedAssets && window.PreloadedAssets.images;
        if (preloaded) {
            try {
                if (preloaded.dungeon && !this.textures.exists('dungeon')) this.textures.addImage('dungeon', preloaded.dungeon);
                if (preloaded.hero && !this.textures.exists('hero')) this.textures.addSpriteSheet('hero', preloaded.hero, { frameWidth: 64, frameHeight: 64 });
                if (preloaded.bug && !this.textures.exists('bug')) this.textures.addSpriteSheet('bug', preloaded.bug, { frameWidth: 64, frameHeight: 64 });
                if ((preloaded.heroAttack || preloaded.hero) && !this.textures.exists('hero_attack')) {
                    this.textures.addSpriteSheet('hero_attack', preloaded.heroAttack || preloaded.hero, { frameWidth: 64, frameHeight: 64 });
                }
                reportPhaserDebug('C', 'phaser-scene.js:inject-textures', 'manual textures injected', {
                    textures: ['hero', 'bug', 'dungeon', 'hero_attack'].map((key) => ({
                        key,
                        exists: this.textures.exists(key)
                    }))
                });
            } catch (error) {
                reportPhaserDebug('E', 'phaser-scene.js:inject-textures', 'manual texture injection failed', {
                    message: error && error.message ? error.message : String(error)
                });
            }
        }

        // #region debug-point C:create-entry
        reportPhaserDebug('C', 'phaser-scene.js:create', 'create() entry', {
            width,
            height,
            textures: ['hero', 'bug', 'dungeon', 'hero_attack'].map((key) => ({
                key,
                exists: this.textures.exists(key)
            }))
        });
        // #endregion

        // Fondo
        this.background = this.add.image(width / 2, height / 2, 'dungeon')
            .setDisplaySize(width, height);

        // Hero
        this.hero = this.add.sprite(150, height - 100, 'hero', 0)
            .setScale(1.5)
            .setInteractive();

        // Bug (enemigo)
        this.bug = this.add.sprite(width - 150, height - 100, 'bug', 0)
            .setScale(1.5)
            .setInteractive()
            .setFlipX(true)
            .setVisible(false);

        if (!this.anims.exists('hero_attack_anim') && this.textures.exists('hero_attack')) {
            const attackTexture = this.textures.get('hero_attack');
            const totalFrames = typeof attackTexture?.frameTotal === 'number' ? attackTexture.frameTotal : 1;
            const endFrame = Math.max(0, Math.min(totalFrames - 1, 7));
            this.anims.create({
                key: 'hero_attack_anim',
                frames: this.anims.generateFrameNumbers('hero_attack', { start: 0, end: endFrame }),
                frameRate: 18,
                repeat: 0
            });
        }

        // Animación idle del hero
        this.tweens.add({
            targets: this.hero,
            y: this.hero.y + 5,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Input handlers
        this.input.on('pointerdown', () => {
            if (!this.isAttacking && window.EventHandlers) {
                window.EventHandlers.handleAttack();
            }
        });

        // #region debug-point D:create-objects
        reportPhaserDebug('D', 'phaser-scene.js:create-objects', 'scene objects created', {
            heroTexture: this.hero && this.hero.texture && this.hero.texture.key,
            bugTexture: this.bug && this.bug.texture && this.bug.texture.key,
            heroVisible: this.hero && this.hero.visible,
            bugVisible: this.bug && this.bug.visible,
            heroAlpha: this.hero && this.hero.alpha,
            bugAlpha: this.bug && this.bug.alpha
        });
        // #endregion

        // Exponer escena globalmente
        window.gameScene = this;
    }

    update() {
        // Lógica de update si es necesaria
    }

    // Métodos públicos
    spawnBug() {
        if (!this.bug) return;
        
        this.bug.setVisible(true);
        this.bug.setAlpha(0);
        
        this.tweens.add({
            targets: this.bug,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });
    }

    performAttack(weaponKey) {
        if (this.isAttacking) return;
        
        this.isAttacking = true;
        this.weaponKey = 'hero_attack';
        
        // Cambiar textura temporalmente
        const originalTexture = this.hero.texture.key;
        let movementDone = false;
        let animationDone = false;

        const finish = () => {
            if (!movementDone || !animationDone) return;
            this.hero.setTexture(originalTexture, 0);
            this.isAttacking = false;
            if (this.bug && this.bug.visible) {
                this.showImpactEffect();
            }
            if (window.EventHandlers) {
                window.EventHandlers.handlePhaserAttack();
            }
        };

        this.hero.setTexture(this.weaponKey, 0);
        if (this.anims.exists('hero_attack_anim')) {
            this.hero.play('hero_attack_anim');
            this.hero.once('animationcomplete-hero_attack_anim', () => {
                animationDone = true;
                finish();
            });
        } else {
            animationDone = true;
        }
        
        // Animación de ataque
        this.tweens.add({
            targets: this.hero,
            x: this.bug && this.bug.visible ? this.bug.x - 50 : this.hero.x + 50,
            duration: 150,
            yoyo: true,
            onComplete: () => {
                movementDone = true;
                finish();
            }
        });
    }

    showImpactEffect() {
        if (!this.bug) return;
        
        // Flash blanco
        const flash = this.add.rectangle(
            this.bug.x, this.bug.y, 
            this.bug.width, this.bug.height, 
            0xFFFFFF
        );
        
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 200,
            onComplete: () => flash.destroy()
        });
        
        // Shake del bug
        this.tweens.add({
            targets: this.bug,
            x: this.bug.x + 5,
            duration: 50,
            yoyo: true,
            repeat: 3
        });
    }

    victoryEffect() {
        // Partículas de victoria
        const particles = this.add.particles(this.hero.x, this.hero.y - 50, 'hero', {
            speed: { min: 50, max: 150 },
            scale: { start: 0.1, end: 0 },
            lifespan: 1000,
            quantity: 20,
            emitting: false
        });
        
        particles.explode();
        
        // Escalar hero
        this.tweens.add({
            targets: this.hero,
            scaleX: 0.7,
            scaleY: 0.7,
            duration: 300,
            yoyo: true
        });
        
        if (window.EventHandlers) {
            window.EventHandlers.handlePhaserVictory();
        }
    }

    defeatEffect() {
        // Oscurecer hero
        this.tweens.add({
            targets: this.hero,
            alpha: 0.5,
            duration: 500
        });
    }

    resizeScene(width, height) {
        if (this.background) {
            this.background.setPosition(width / 2, height / 2);
            this.background.setDisplaySize(width, height);
        }
        if (this.hero) {
            this.hero.setPosition(150, height - 100);
        }
        if (this.bug) {
            this.bug.setPosition(width - 150, height - 100);
        }
    }
};

// Phaser Bridge para comunicación con el HTML
window.PhaserBridge = {
    scene: null,
    
    init(config) {
        const gameConfig = {
            type: Phaser.AUTO,
            parent: config.parentId || 'phaser-container',
            width: config.width || 800,
            height: config.height || 400,
            transparent: true,
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            scene: MainScene,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            }
        };
        
        window.game = new Phaser.Game(gameConfig);

        const resizeGame = () => {
            const container = document.getElementById(config.parentId || 'phaser-container');
            if (!container || !window.game) return;
            const width = Math.max(container.clientWidth, 640);
            const height = Math.max(container.clientHeight, 360);
            window.game.scale.resize(width, height);
            if (this.scene && typeof this.scene.resizeScene === 'function') {
                this.scene.resizeScene(width, height);
            }
        };

        window.addEventListener('resize', resizeGame);
        
        // Esperar a que la escena esté lista
        const checkScene = setInterval(() => {
            if (window.gameScene) {
                this.scene = window.gameScene;
                clearInterval(checkScene);
                resizeGame();
            }
        }, 100);
    },
    
    spawnBug() {
        if (this.scene) this.scene.spawnBug();
    },
    
    triggerAttack(weaponKey) {
        if (this.scene) this.scene.performAttack(weaponKey);
    },
    
    showVictory() {
        if (this.scene) this.scene.victoryEffect();
    }
};

// Exportar
window.MainScene = MainScene;
