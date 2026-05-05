// script.js
const chat = document.getElementById("chat");
const timeline = document.getElementById("timeline");
const startBtn = document.getElementById("startDemo");
const resetBtn = document.getElementById("resetDemo");

const flow = [
  {
    actor: "user",
    text: "Hola, quiero una limpieza dental para esta semana.",
    step: "Paciente inicia contacto por WhatsApp."
  },
  {
    actor: "bot",
    text: "¡Hola! Soy DentalBot SCZ. ¿Me compartes tu nombre completo y turno preferido (mañana/tarde)?",
    step: "DentalBot solicita datos base para registro."
  },
  {
    actor: "user",
    text: "Soy Camila Rojas, prefiero tarde.",
    step: "Paciente entrega datos estructurados."
  },
  {
    actor: "bot",
    text: "Gracias, Camila. Tengo disponibles: Miércoles 16:30 o Jueves 18:00. ¿Cuál eliges?",
    step: "DentalBot consulta disponibilidad y propone agenda."
  },
  {
    actor: "user",
    text: "Jueves 18:00, por favor.",
    step: "Paciente selecciona horario."
  },
  {
    actor: "bot",
    text: "Perfecto. Cita confirmada para Jueves 18:00 en Clínica Dental SCZ. Te enviaré recordatorio 24h antes.",
    step: "Confirmación automática de cita."
  },
  {
    actor: "bot",
    text: "Recordatorio: mañana tienes limpieza dental a las 18:00. Responde 1 para confirmar o 2 para reagendar.",
    step: "Recordatorio preventivo para reducir ausencias."
  }
];

let cursor = 0;
let timer = null;

function bubbleClass(actor) {
  return actor === "bot" ? "bubble bot" : "bubble user";
}

function appendMessage({ actor, text, step }) {
  const msg = document.createElement("div");
  msg.className = bubbleClass(actor);
  msg.textContent = text;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;

  const li = document.createElement("li");
  li.textContent = step;
  timeline.appendChild(li);
}

function playDemo() {
  if (cursor >= flow.length) {
    startBtn.disabled = false;
    startBtn.textContent = "Reproducir demo";
    return;
  }

  appendMessage(flow[cursor]);
  cursor += 1;
  timer = setTimeout(playDemo, 1200);
}

function startDemo() {
  if (timer) return;
  startBtn.disabled = true;
  startBtn.textContent = "Demo en curso...";
  playDemo();
}

function resetDemo() {
  clearTimeout(timer);
  timer = null;
  cursor = 0;
  chat.innerHTML = "";
  timeline.innerHTML = "";
  startBtn.disabled = false;
  startBtn.textContent = "Iniciar demo";
}

startBtn.addEventListener("click", startDemo);
resetBtn.addEventListener("click", resetDemo);

// Estado inicial con un saludo breve
appendMessage({
  actor: "bot",
  text: "Hola, soy DentalBot SCZ. Presiona “Iniciar demo” para ver el flujo completo.",
  step: "Pantalla inicial lista para demostración."
});