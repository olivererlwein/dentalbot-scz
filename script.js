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

class SchedulerAdapterMock {
  constructor() {
    this.timezone = "America/La_Paz";
    this.calendarId = "dentalbot.scz@gmail.com";
    this.slotsTaken = new Map();
    this.appointments = new Map();
    this.seedBusySlots();
  }

  seedBusySlots() {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    this.slotsTaken.set(`${tomorrow}|10:00`, "busy");
    this.slotsTaken.set(`${tomorrow}|15:30`, "busy");
  }

  getAvailability({ date, durationMin, fromHour = "08:00", toHour = "19:00" }) {
    const slots = [];
    const step = Number(durationMin);
    const toMinutes = (value) => {
      const [h, m] = value.split(":").map(Number);
      return h * 60 + m;
    };
    const from = toMinutes(fromHour);
    const to = toMinutes(toHour);
    for (let cursor = from; cursor + step <= to; cursor += step) {
      const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
      const mm = String(cursor % 60).padStart(2, "0");
      const key = `${date}|${hh}:${mm}`;
      if (this.slotsTaken.has(key)) continue;
      const end = cursor + step;
      const ehh = String(Math.floor(end / 60)).padStart(2, "0");
      const emm = String(end % 60).padStart(2, "0");
      slots.push({
        startAt: `${date}T${hh}:${mm}:00-04:00`,
        endAt: `${date}T${ehh}:${emm}:00-04:00`
      });
    }
    return { date, timezone: this.timezone, durationMin: step, slots };
  }

  createAppointment(payload, idempotencyKey) {
    if (!idempotencyKey) throw new Error("IDEMPOTENCY_KEY_REQUIRED");
    const slotKey = `${payload.startAt.slice(0, 10)}|${payload.startAt.slice(11, 16)}`;
    if (this.slotsTaken.has(slotKey)) throw new Error("SLOT_NOT_AVAILABLE");
    const appointmentId = `apt_${Math.random().toString(36).slice(2, 10)}`;
    const externalEventId = `${Math.random().toString(36).slice(2, 10)}@google.com`;
    const response = {
      appointmentId,
      externalEventId,
      patientName: payload.patientName,
      patientPhone: payload.patientPhone,
      reason: payload.reason,
      status: "confirmed",
      startAt: payload.startAt,
      endAt: payload.endAt,
      timezone: this.timezone,
      calendarId: this.calendarId,
      idempotencyKey
    };
    this.slotsTaken.set(slotKey, appointmentId);
    this.appointments.set(appointmentId, response);
    return response;
  }

  rescheduleAppointment(appointmentId, { newStartAt, newEndAt }) {
    const current = this.appointments.get(appointmentId);
    if (!current) throw new Error("APPOINTMENT_NOT_FOUND");
    const oldSlot = `${current.startAt.slice(0, 10)}|${current.startAt.slice(11, 16)}`;
    const newSlot = `${newStartAt.slice(0, 10)}|${newStartAt.slice(11, 16)}`;
    if (oldSlot !== newSlot && this.slotsTaken.has(newSlot)) throw new Error("SLOT_NOT_AVAILABLE");
    this.slotsTaken.delete(oldSlot);
    this.slotsTaken.set(newSlot, appointmentId);
    current.startAt = newStartAt;
    current.endAt = newEndAt;
    current.status = "rescheduled";
    this.appointments.set(appointmentId, current);
    return current;
  }

  cancelAppointment(appointmentId) {
    const current = this.appointments.get(appointmentId);
    if (!current) throw new Error("APPOINTMENT_NOT_FOUND");
    const slotKey = `${current.startAt.slice(0, 10)}|${current.startAt.slice(11, 16)}`;
    this.slotsTaken.delete(slotKey);
    current.status = "cancelled";
    this.appointments.set(appointmentId, current);
    return { appointmentId, status: "cancelled" };
  }
}

class SchedulerApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async getAvailability({ date, reason }) {
    const query = new URLSearchParams({ date, reason });
    const response = await fetch(`${this.baseUrl}/api/v1/scheduler/availability?${query.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.code || "AVAILABILITY_ERROR");
    return data;
  }

  async createAppointment(payload, idempotencyKey) {
    const response = await fetch(`${this.baseUrl}/api/v1/scheduler/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.code || "CREATE_ERROR");
    return data;
  }
}

const schedulerForm = document.getElementById("schedulerWizardForm");
if (schedulerForm) {
  const mockAdapter = new SchedulerAdapterMock();
  const apiBaseUrl = window.SCHEDULER_API_BASE
    || localStorage.getItem("SCHEDULER_API_BASE")
    || document.documentElement.dataset.schedulerApiBase
    || "http://localhost:3002";
  const apiClient = new SchedulerApiClient(apiBaseUrl);
  const dateInput = document.getElementById("wizDate");
  const durationInput = { value: "30" };
  const appointmentState = document.getElementById("appointmentState");
  const backBtn = document.getElementById("wizardBackBtn");
  const nextBtn = document.getElementById("wizardNextBtn");
  const stepDots = Array.from(document.querySelectorAll("[data-step-dot]"));
  const panels = Array.from(document.querySelectorAll(".wizard-panel"));
  const slotButtons = document.getElementById("slotButtons");
  const slotHint = document.getElementById("slotHint");
  const confirmSummary = document.getElementById("confirmSummary");
  const confirmMessage = document.getElementById("confirmMessage");
  const today = new Date();
  const toDateInputValue = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const minDate = toDateInputValue(today);
  const maxDateObj = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  const maxDate = toDateInputValue(maxDateObj);

  let step = 1;
  let selectedSlot = null;
  let currentAppointment = null;

  const setState = (value) => {
    appointmentState.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  };

  const wizardData = () => ({
    patientName: document.getElementById("wizPatientName").value.trim(),
    reason: document.getElementById("wizReason").value.trim(),
    patientPhone: document.getElementById("wizPhone").value.trim()
  });

  const reasonLabel = (reason) => ({
    consulta_inicial: "Consulta inicial / evaluacion",
    limpieza_dental: "Limpieza dental",
    blanqueamiento: "Blanqueamiento",
    ortodoncia_control: "Ortodoncia / control",
    urgencia_dental: "Urgencia dental"
  }[reason] || reason);

  const renderStep = () => {
    panels.forEach((panel) => panel.classList.toggle("active", Number(panel.dataset.step) === step));
    stepDots.forEach((dot) => dot.classList.toggle("active", Number(dot.dataset.stepDot) === step));
    backBtn.disabled = step === 1;
    nextBtn.textContent = step === 4 ? "Nueva cita" : "Siguiente";
  };

  const requireStepData = () => {
    if (step === 1 && !wizardData().patientName) return "Completa tu nombre.";
    if (step === 2 && (!wizardData().reason || !wizardData().patientPhone)) return "Completa motivo y telefono.";
    if (step === 3 && !selectedSlot) return "Selecciona un horario disponible.";
    return "";
  };

  const loadAvailability = async () => {
    const date = dateInput.value;
    const reason = wizardData().reason;
    const durationMin = Number(durationInput.value);
    if (!date || !durationMin || !reason) return;
    if (date < minDate || date > maxDate) {
      slotButtons.innerHTML = "";
      selectedSlot = null;
      slotHint.textContent = `Fecha invalida. Elige entre ${minDate} y ${maxDate}.`;
      return;
    }
    slotButtons.innerHTML = "";
    selectedSlot = null;
    try {
      const availability = await apiClient.getAvailability({ date, reason });
      if (!availability.slots.length) {
        slotHint.textContent = "No hay horarios para esta fecha. Elige otra.";
        setState({ availability });
        return;
      }
      slotHint.textContent = "Selecciona el horario que mejor te convenga.";
      availability.slots.forEach((slot) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "slot-btn";
        button.dataset.value = `${slot.startAt}|${slot.endAt}`;
        button.textContent = `${slot.startAt.slice(11, 16)} - ${slot.endAt.slice(11, 16)}`;
        button.addEventListener("click", () => {
          selectedSlot = button.dataset.value;
          slotButtons.querySelectorAll(".slot-btn").forEach((el) => el.classList.remove("active"));
          button.classList.add("active");
        });
        slotButtons.appendChild(button);
      });
      setState({ availability, source: "google_calendar" });
    } catch (error) {
      if (error.message === "GOOGLE_API_ERROR" || error.message === "AVAILABILITY_ERROR") {
        const availability = mockAdapter.getAvailability({ date, durationMin });
        slotHint.textContent = "API no disponible. Mostrando disponibilidad local de respaldo.";
        availability.slots.forEach((slot) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "slot-btn";
          button.dataset.value = `${slot.startAt}|${slot.endAt}`;
          button.textContent = `${slot.startAt.slice(11, 16)} - ${slot.endAt.slice(11, 16)}`;
          button.addEventListener("click", () => {
            selectedSlot = button.dataset.value;
            slotButtons.querySelectorAll(".slot-btn").forEach((el) => el.classList.remove("active"));
            button.classList.add("active");
          });
          slotButtons.appendChild(button);
        });
        setState({ availability, source: "mock_fallback" });
        return;
      }
      slotHint.textContent = `No se pudo consultar disponibilidad (${error.message}).`;
      setState(`Error: ${error.message}`);
    }
  };

  const createAppointmentFromWizard = async () => {
    if (!selectedSlot) return;
    const [startAt, endAt] = selectedSlot.split("|");
    try {
      currentAppointment = await apiClient.createAppointment({
        ...wizardData(),
        reasonLabel: reasonLabel(wizardData().reason),
        startAt,
        endAt
      }, `create-${Date.now()}`);
      confirmSummary.textContent = `Paciente: ${currentAppointment.patientName} · Motivo: ${currentAppointment.reason} · Horario: ${currentAppointment.startAt.slice(0, 16).replace("T", " ")}`;
      confirmMessage.textContent = "Cita confirmada. Te enviaremos recordatorio previo automaticamente.";
      setState(currentAppointment);
    } catch (error) {
      if (error.message === "SLOT_NOT_AVAILABLE") {
        confirmMessage.textContent = "Ese horario acaba de ocuparse. Elige otro horario disponible.";
        await loadAvailability();
      } else {
        confirmMessage.textContent = `No se pudo confirmar: ${error.message}`;
      }
      setState(`Error: ${error.message}`);
    }
  };

  backBtn.addEventListener("click", () => {
    if (step > 1) {
      step -= 1;
      renderStep();
    }
  });

  nextBtn.addEventListener("click", async () => {
    if (step === 4) {
      schedulerForm.reset();
      selectedSlot = null;
      currentAppointment = null;
      slotButtons.innerHTML = "";
      slotHint.textContent = "Selecciona una fecha para ver horarios disponibles.";
      confirmSummary.textContent = "";
      confirmMessage.textContent = "";
      step = 1;
      renderStep();
      return;
    }

    const validationMessage = requireStepData();
    if (validationMessage) {
      slotHint.textContent = validationMessage;
      return;
    }

    if (step === 3) await createAppointmentFromWizard();
    if (step < 4) step += 1;
    renderStep();
  });

  dateInput.addEventListener("change", loadAvailability);
  document.getElementById("wizReason").addEventListener("change", () => {
    if (step >= 3) loadAvailability();
  });

  dateInput.min = minDate;
  dateInput.max = maxDate;
  dateInput.value = minDate;
  loadAvailability();
  renderStep();
}
