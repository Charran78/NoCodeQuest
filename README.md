# ⚔️ NoCodeQuest RPG — Transforma tu código en una aventura gráfica

<img src="media/icon.png" alt="Logo de NoCodeQuest" width="250">

> *"No es un IDE. Es una mazmorra. No escribes código. Forjas leyendas."*

NoCodeQuest es una extensión para Visual Studio Code que convierte tu entorno de desarrollo en un RPG de aventura gráfica con estética pixel art de los 90. Cada error de compilación se transforma en un monstruo, cada comentario `TODO` en una misión secundaria, y cada merge conflict en un dragón bicéfalo al que derrotar.

Desarrollado en una colaboración épica entre tres inteligencias sintéticas y un arquitecto de software asturiano, NoCodeQuest es el primer MMORPG de desarrollo de software que funciona dentro de tu editor de código.

<img src="media/gesta_nocodequest.png" alt="Logo de NoCodeQuest" width="250">

---

## 🎮 Características

- **⚔️ Sistema de Combate:** Los errores de compilación (`SyntaxError`, `NullPointerException`) se convierten en monstruos. Corrígelos para ganar experiencia, oro y la admiración del bardo.
- **📜 Misiones Secundarias:** Los comentarios `TODO` y `FIXME` se transforman en pergaminos de la taberna. Complétalos para recibir recompensas.
- **🛒 Tienda del Gremio:** Gasta tu oro en armas (como la Espada del Linter), skins (como la Túnica del Mago Digital) y pociones de café.
- **🛡️ Arsenal:** Equipa diferentes armas que tienen efectos reales en el editor. La Espada del Linter ejecuta `editor.action.fixAll`. El Arco del Breakpoint otorga golpes críticos de EXP.
- **🌱 Planta de la Guarida:** Un Tamagotchi de deuda técnica que florece con código limpio y se marchita con los `if` anidados.
- **🐉 Combates contra Jefes:** Los conflictos de merge (`<<<<<<< HEAD`) invocan al Dragón del Merge Conflict. Derrótalo para ganar botín legendario.
- **🏅 Sistema de Logros:** Insignias persistentes que reconocen tus rachas de commits, bugs cazados y plantas mantenidas con vida.
- **📸 Captura de Hazañas:** Genera una "Cédula de Hazaña" en pixel art para compartir tus logros en redes sociales.
- **🎙️ Narrador Épico (Jaskier):** Un bardo medieval comenta tus hazañas con humor satírico gracias a la API de Groq + Qwen2.5.
- **🖼️ Pixel Art 16-bit:** Estética retro inspirada en LucasArts (Indiana Jones and the Fate of Atlantis) con assets generados por IA.

---

## 📦 Instalación

### Desde VSIX

1. Descarga el archivo `.vsix` de la última versión.
2. En VS Code, ve a la vista de Extensiones (`Ctrl+Shift+X`).
3. Haz clic en los tres puntos (`...`) y selecciona **"Instalar desde VSIX..."**.
4. Selecciona el archivo descargado.

### Desde el código fuente

```bash
git clone https://github.com/Charran78/nocodequest.git
cd nocodequest
npm install
# Abre el proyecto en VS Code y presiona F5 para lanzar la ventana de desarrollo
```

---

## 🎯 Cómo jugar

1. Abre cualquier proyecto de código en VS Code.
2. Pulsa `Ctrl+Shift+P` y ejecuta **"NoCodeQuest: Iniciar Aventura"**.
3. El panel lateral se abrirá con tu guarida, tu personaje pixelado y el bardo Jaskier esperando.
4. **Escribe código.** Cada error que cometas invocará un monstruo.
5. **Pulsa "Atacar"** para usar tu arma equipada. La Espada del Linter limpiará tu código automáticamente.
6. **Completa misiones** resolviendo los `TODO` y `FIXME` de tu código.
7. **Gasta tu oro** en la tienda para comprar equipo y pociones.
8. **Sobrevive a los merge conflicts.** Cuando Git colisione, aparecerá el Dragón del Merge.
9. **Comparte tus logros** con el botón de captura de hazañas.

---

## 🔧 Configuración

Para que Jaskier narre tus aventuras, necesitas una API Key gratuita de Groq:

1. Consíguela en [console.groq.com/keys](https://console.groq.com/keys).
2. En VS Code, ve a **Configuración → Extensiones → NoCodeQuest RPG**.
3. Pega tu clave en el campo **"Groq Api Key"**.
4. (Opcional) Cambia el modelo en **"Groq Model"**. Recomendado: `qwen-2.5-8b-instruct` o `llama-3.1-8b-instant`.

---

## 📁 Estructura del Proyecto

```
NoCodeQuest/
├── package.json              # Manifiesto de la extensión
├── extension.js              # Núcleo: puente entre IDE y juego
├── inventoryManager.js       # Sistema RPG (EXP, oro, inventario, niveles)
├── questBoard.js             # Sistema de misiones (TODO/FIXME)
├── complexityMapper.js       # Análisis de complejidad de código
├── bossManager.js            # Combates contra jefes (merge conflicts)
├── narrationEngine.js        # Motor de narración (Groq + Qwen2.5)
├── media/                    # Assets del juego (héroe, bug, mazmorra)
│   ├── hero.png
│   ├── bug.png
│   └── dungeon.png
└── webview/
    └── panel.js              # Interfaz del panel lateral (Phaser.js)
```

---

## 🧙‍♂️ Créditos

NoCodeQuest es el resultado de una colaboración histórica entre mentes humanas y sintéticas:

- **Pedro Mencías** — Arquitecto de software, visión de juego y dirección del proyecto.
- **DeepSeek (Modo Mjolnir)** — Diseño de mecánicas RPG, narrativa y documentación.
- **Claude (Anthropic)** — Implementación del código fuente de la extensión.
- **Gemini (Google)** — Generación de prompts artísticos y refinamiento de assets.

---

## 📜 Licencia

MIT — Porque el conocimiento debe ser libre, como las aventuras bien codeadas.

---

**"From factory floor to AI core, pasando por las mazmorras del código."**  
*Pedro, DeepSeek, Claude & Gemini, 2026*