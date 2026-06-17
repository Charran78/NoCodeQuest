# ⚔️ NoCodeQuest RPG

<img src="media/icon.png" alt="Logo de NoCodeQuest" width="220">

> *"Tu IDE ya no es solo un editor. Es una mazmorra, un tablero de decisiones y una crónica viva."*

NoCodeQuest es una extensión para VS Code que convierte el desarrollo en una aventura RPG pixel art conectada al estado real del IDE. Errores, `TODO`, commits, tienda, inventario, planta, crónica y decisiones del jugador conviven en un único WebView jugable.

Hoy NoCodeQuest ya no es solo un juego que reacciona a bugs. Está evolucionando hacia **"El Espejo del IDE"**: una capa HITL donde el juego, el editor y la IA conversan entre sí, pero el control final siempre lo conserva la persona que desarrolla.

<img src="media/gesta_nocodequest.png" alt="Hazaña de NoCodeQuest" width="260">

---

## **Estado Actual**
- **WebView jugable** con escena retro, HUD, panel lateral y acciones directas desde la interfaz.
- **Combate contra bugs** con recompensas de EXP y oro.
- **Misiones** a partir de `TODO` y `FIXME`, con aceptación y seguimiento.
- **Mercado, inventario y equipo** con efectos reales sobre la partida.
- **Planta de la Guarida** como indicador simbólico de deuda técnica.
- **Crónica de Aventuras** con entradas persistentes y exportación visual tipo insignia final.
- **Cartas de Destino** generadas por reglas fijas a partir del estado real del IDE.
- **Narración de Jasper** usando Groq cuando hay API key configurada.

---

## **Qué Hace Hoy**
- **⚔️ Combate**: los diagnósticos del editor pueden convertirse en amenazas y el jugador puede atacarlas desde el propio panel.
- **📜 Misiones**: los comentarios `TODO` y `FIXME` aparecen como encargos aceptables desde el WebView.
- **🛒 Mercado**: comprar, equipar y consumir recursos ya se puede hacer sin salir del juego.
- **🔒 Commit ritualizado**: el panel puede preparar y confirmar commits con mensaje propuesto por Jasper.
- **📜 Crónica**: cada acción importante deja huella narrativa en el `adventureLog`.
- **🪞 Estado del IDE**: existe un oráculo local que recopila archivo activo, diagnósticos, estado Git, quests y estado del jugador.

---

## **El Nuevo Rumbo**
NoCodeQuest avanza hacia una versión 2.0 centrada en cuatro ideas:

- **El Espejo del IDE**: el juego refleja no solo bugs, sino también commits, quests, cambios de archivo y contexto de trabajo.
- **Cartas de Destino**: el sistema propone acciones estratégicas basadas en datos reales del proyecto.
- **HITL real**: la IA sugiere, pero no ejecuta nada sin aprobación humana.
- **Jasper como mediador**: el bardo deja de ser solo narrador y pasa a convertirse en copiloto táctico.

La visión es simple: el juego no sustituye al IDE, sino que lo convierte en una interfaz simbólica y accionable para tomar mejores decisiones.

---

## **Arquitectura**
```text
[IDE] -> [Estado JSON] -> [Adventure Oracle] -> [Cartas de Destino]
   -> [WebView Phaser + Panel HITL] -> [Decision del jugador] -> [IDE]
```

### **Piezas Principales**
- `extension.js`: orquestador principal entre VS Code, WebView, Git, Groq y acciones del juego.
- `adventureOracle.js`: recopila el `ide_state` y genera cartas con reglas fijas.
- `inventoryManager.js`: mantiene progreso, recursos, crónica y estado del jugador.
- `questBoard.js`: convierte `TODO` y `FIXME` en misiones.
- `narrationEngine.js`: conecta con Groq y genera la voz de Jasper.
- `webview/panel.js`: renderiza el juego, la UI lateral, el chat, la crónica y las cartas.

---

## **Cómo Probarlo**

### **Instalar desde VSIX**
1. Abre VS Code.
2. Ve a `Extensiones`.
3. Pulsa `...`.
4. Elige `Instalar desde VSIX...`.
5. Selecciona el archivo `.vsix` generado.

### **Ejecutar desde el código**
```bash
git clone https://github.com/Charran78/NoCodeQuest.git
cd NoCodeQuest
npm install
```

Después abre el proyecto en VS Code y pulsa `F5` para lanzar la ventana de desarrollo de la extensión.

---

## **Cómo Jugar**
1. Abre un proyecto en VS Code.
2. Ejecuta `NoCodeQuest: ⚔️ Iniciar Aventura`.
3. Usa el panel del juego para atacar, comprar, equipar, beber pociones, aceptar misiones y sellar commits.
4. Consulta `📜 Crónica` para revisar tus hazañas.
5. Usa `🪞 Destino` para elegir Cartas de Destino sugeridas por el estado del IDE.
6. Si configuras Groq, Jasper comentará la aventura y propondrá narrativas más ricas.

---

## **Configuración**
Para despertar a Jasper con Groq:

1. Consigue una API key en [console.groq.com/keys](https://console.groq.com/keys).
2. Ve a `Configuración -> Extensiones -> NoCodeQuest RPG`.
3. Rellena `Groq Api Key`.
4. Si quieres, cambia `Groq Model`.

Modelos útiles:
- `llama-3.1-8b-instant`
- `qwen-2.5-8b-instruct`
- `llama-3.3-70b-versatile`

---

## **Roadmap**

### **Fase Actual**
- Consolidar la ejecución real de las Cartas de Destino.
- Mantener WebView, estado del juego e IDE sincronizados.
- Refinar Crónica, commit modal y acciones directas desde el panel.

### **Siguiente Fase**
- Dar al chat de Jasper una salida estructurada en JSON.
- Convertir sus respuestas en sugerencias accionables del tipo:
```json
{
  "intent": "suggest_next_action",
  "recommended_action": "open_shop",
  "reason": "La planta esta marchita y hay oro suficiente",
  "payload": {
    "card_id": "save-plant-at-market"
  },
  "requires_confirmation": true
}
```

### **Después**
- Conectar el Oráculo a Groq para generar Cartas de Destino por IA.
- Mejorar la sincronización entre chat, IDE y escena del juego.
- Explorar un puente HITL más sólido entre Jasper, el jugador y el asistente del IDE.

---

## **Notas de Diseño**
- NoCodeQuest no busca automatizarlo todo.
- La intención es **mantener al desarrollador dentro del flujo**, no sustituir su criterio.
- Por eso la dirección elegida es HITL: la IA propone, el juego dramatiza y la persona decide.

---

## **Créditos**
- **Pedro Mencías**: visión del producto, dirección y arquitectura.
- **DeepSeek**: diseño narrativo, sistema y documentación conceptual.
- **Claude**: implementación y evolución técnica del código.
- **Gemini**: apoyo creativo y refinamiento visual.

---

## **Licencia**
MIT.

---

**"From factory floor to AI core, pasando por las mazmorras del código."**
