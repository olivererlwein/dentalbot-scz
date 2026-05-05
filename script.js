// script.js
const chat = document.getElementById("chat");
const timeline = document.getElementById("timeline");
const startBtn = document.getElementById("startDemo");
const resetBtn = document.getElementById("resetDemo");
const intentButtonsWrap = document.getElementById("intentButtons");

const FLOWS = {
  cleaning: {
    steps: [
      { actor: "user", text: "Hola, quiero agendar una limpieza dental." },
      { actor: "bot", text: "Perfecto. Te ayudo ahora mismo. ¿Cuál es tu nombre completo?" },
      { actor: "user", text: "Camila Rojas." },
      { actor: "bot", text: "Gracias. ¿Cuál es tu motivo de consulta?" },
      { actor: "user", text: "Limpieza preventiva." },
      { actor: "bot", text: "Excelente. ¿Qué horario prefieres?" },
      { actor: "user", text: "Jueves 18:00." },
      { actor: "bot", text: "Cita pre-confirmada para Jueves 18:00. Te enviaremos recordatorio 24h antes." }
    ],
    timeline: [
      "Intención detectada: limpieza dental.",
      "Captura de nombre.",
      "Captura de motivo de consulta.",
      "Captura de horario preferido.",
      "Confirmación automática de cita."
    ]
  },
  pricing: {
    steps: [
      { actor: "user", text: "Hola, quiero consultar precios." },
      { actor: "bot", text: "Claro, aquí tienes precios referenciales actuales de la clínica:" },
      { actor: "bot", text: "Consulta inicial: desde Bs 100. Limpieza dental: desde Bs 150. Blanqueamiento: desde Bs 700." },
      { actor: "bot", text: "Ortodoncia/brackets: requiere evaluación previa. Urgencias: evaluación según caso." },
      { actor: "bot", text: "Estos valores son referenciales y se pueden personalizar según cada clínica." },
      { actor: "bot", text: "Si deseas, ahora te registro para evaluación. ¿Cuál es tu nombre completo?" },
      { actor: "user", text: "Andrés Salvatierra." },
      { actor: "bot", text: "Gracias, Andrés. ¿Cuál es tu motivo de consulta?" },
      { actor: "user", text: "Quiero saber precio de brackets." },
      { actor: "bot", text: "Perfecto. ¿Qué horario prefieres para tu evaluación?" },
      { actor: "user", text: "Mañana 11:30." },
      { actor: "bot", text: "Listo. Solicitud registrada con precios referenciales enviados y evaluación pre-agendada." }
    ],
    timeline: [
      "Intención detectada: consulta de precios.",
      "Envío de precios referenciales.",
      "Aclaración de personalización por clínica.",
      "Captura de nombre, motivo y horario.",
      "Confirmación de solicitud de evaluación."
    ]
  },
  reschedule: {
    steps: [
      { actor: "user", text: "Necesito reprogramar mi cita." },
      { actor: "bot", text: "Te ayudo con la reprogramación. ¿Nombre completo del paciente?" },
      { actor: "user", text: "María Fernanda Peña." },
      { actor: "bot", text: "Gracias. ¿Cuál era el motivo de consulta de esa cita?" },
      { actor: "user", text: "Control de ortodoncia." },
      { actor: "bot", text: "Entendido. ¿Qué nuevo horario prefieres?" },
      { actor: "user", text: "Sábado 08:30." },
      { actor: "bot", text: "Reprogramación confirmada. Te enviaremos nueva confirmación y recordatorio." }
    ],
    timeline: [
      "Intención detectada: reprogramar cita.",
      "Captura de nombre.",
      "Captura de motivo de consulta.",
      "Captura de horario preferido.",
      "Confirmación de reprogramación."
    ]
  },
  emergency: {
    steps: [
      { actor: "user", text: "Tengo una urgencia dental." },
      { actor: "bot", text: "Vamos a priorizar tu caso. ¿Cuál es tu nombre completo?" },
      { actor: "user", text: "Luis Alberto Vargas." },
      { actor: "bot", text: "Gracias. ¿Cuál es el motivo de consulta urgente?" },
      { actor: "user", text: "Dolor intenso en muela." },
      { actor: "bot", text: "Entendido. ¿Qué horario puedes asistir hoy?" },
      { actor: "user", text: "En 1 hora." },
      { actor: "bot", text: "Caso derivado a atención prioritaria. Nuestro equipo te confirma cupo de urgencia." }
    ],
    timeline: [
      "Intención detectada: urgencia dental.",
      "Captura de nombre.",
      "Captura de motivo de consulta.",
      "Captura de horario preferido.",
      "Derivación a protocolo de urgencia."
    ]
  }
};

let selectedIntent = "cleaning";
let flowCursor = 0;
let timer = null;

function bubbleClass(actor) {
  return actor === "bot" ? "bubble bot" : "bubble user";
}

function appendMessage(item) {
  const msg = document.createElement("div");
  msg.className = bubbleClass(item.actor);
  msg.textContent = item.text;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function renderTimeline(items) {
  timeline.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    timeline.appendChild(li);
  });
}

function setActiveIntent(intentKey) {
  selectedIntent = intentKey;
  intentButtonsWrap.querySelectorAll(".intent-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.intent === intentKey);
  });
  renderTimeline(FLOWS[intentKey].timeline);
}

function playDemo() {
  const steps = FLOWS[selectedIntent].steps;
  if (flowCursor >= steps.length) {
    timer = null;
    startBtn.disabled = false;
    startBtn.textContent = "Reproducir demo";
    return;
  }

  appendMessage(steps[flowCursor]);
  flowCursor += 1;
  timer = setTimeout(playDemo, 1100);
}

function startDemo() {
  if (timer) return;
  chat.innerHTML = "";
  flowCursor = 0;
  startBtn.disabled = true;
  startBtn.textContent = "Demo en curso...";
  playDemo();
}

function resetDemo() {
  clearTimeout(timer);
  timer = null;
  flowCursor = 0;
  chat.innerHTML = "";
  startBtn.disabled = false;
  startBtn.textContent = "Iniciar demo";
  appendMessage({
    actor: "bot",
    text: "Intención activa cargada. Presiona Iniciar demo para reproducir el flujo."
  });
}

startBtn.addEventListener("click", startDemo);
resetBtn.addEventListener("click", resetDemo);

intentButtonsWrap.querySelectorAll(".intent-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (timer) return;
    setActiveIntent(btn.dataset.intent);
    resetDemo();
  });
});

setActiveIntent("cleaning");
resetDemo();