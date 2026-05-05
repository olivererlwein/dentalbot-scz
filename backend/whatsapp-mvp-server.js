const http = require("http");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3001);
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const LEADS_WEBHOOK_URL = process.env.LEADS_WEBHOOK_URL || "";
const TIMEZONE = process.env.BOT_TIMEZONE || "America/La_Paz";

const sessions = new Map();

function parseJsonSafe(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sendJson(res, code, payload) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function verifyMetaSignature(signatureHeader, rawBody) {
  if (!APP_SECRET) return true;
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const received = signatureHeader.substring(7);
  const expected = crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  } catch {
    return false;
  }
}

function detectIntent(text) {
  const t = text.toLowerCase();
  if (t.includes("urgenc") || t.includes("dolor")) return "urgencia_dental";
  if (t.includes("reprogram") || t.includes("cambiar cita")) return "reprogramar_cita";
  if (t.includes("precio") || t.includes("costo") || t.includes("cuanto")) return "consultar_precios";
  if (t.includes("limpieza") || t.includes("agendar") || t.includes("cita")) return "agendar_limpieza";
  return "agendar_limpieza";
}

function getOrCreateSession(waId) {
  if (!sessions.has(waId)) {
    sessions.set(waId, {
      intent: null,
      fields: {
        nombre: null,
        motivo: null,
        horario_preferido: null,
        telefono: waId || null,
      },
      step: "intent",
      updatedAt: new Date().toISOString(),
    });
  }
  return sessions.get(waId);
}

function nextQuestion(session) {
  if (!session.fields.nombre) return "Para ayudarte, indícame tu nombre completo.";
  if (!session.fields.motivo) return "Gracias. ¿Cuál es el motivo de consulta?";
  if (!session.fields.horario_preferido) return "Perfecto. ¿Qué horario prefieres para tu cita?";
  return null;
}

function parseFieldUpdate(session, text) {
  if (!session.fields.nombre) {
    session.fields.nombre = text;
    return;
  }
  if (!session.fields.motivo) {
    session.fields.motivo = text;
    return;
  }
  if (!session.fields.horario_preferido) {
    session.fields.horario_preferido = text;
  }
}

async function appendLead(session) {
  if (!LEADS_WEBHOOK_URL) return { ok: false, skipped: true };
  const payload = {
    source: "whatsapp_mvp",
    timezone: TIMEZONE,
    intent: session.intent,
    nombre: session.fields.nombre,
    motivo: session.fields.motivo,
    horario_preferido: session.fields.horario_preferido,
    telefono: session.fields.telefono,
    created_at: new Date().toISOString(),
  };
  const r = await fetch(LEADS_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: r.ok, status: r.status };
}

async function sendWhatsAppText(to, text) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error("Missing WhatsApp credentials (ACCESS_TOKEN/PHONE_NUMBER_ID)");
  }
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(`WhatsApp API error ${r.status}: ${JSON.stringify(data)}`);
  }
  console.log("outbound_sent", { to, messageId: data?.messages?.[0]?.id || null });
  return data;
}

async function buildReply(waId, incomingText) {
  const session = getOrCreateSession(waId);
  session.updatedAt = new Date().toISOString();
  if (!session.intent) {
    session.intent = detectIntent(incomingText);
    if (session.intent === "consultar_precios") {
      return "Precios referenciales: consulta inicial desde Bs 100, limpieza desde Bs 150. Si quieres, también te ayudo a agendar ahora.";
    }
    if (session.intent === "urgencia_dental") {
      return "Voy a priorizar tu urgencia. Te ayudare a registrar tus datos para que recepción te contacte de inmediato. ¿Cuál es tu nombre completo?";
    }
  }

  parseFieldUpdate(session, incomingText);
  const question = nextQuestion(session);
  if (question) return question;

  const leadResult = await appendLead(session);
  const base = session.intent === "reprogramar_cita"
    ? "Solicitud de reprogramación registrada."
    : "Solicitud de cita registrada.";
  const sheets = leadResult.skipped
    ? "Nota: falta configurar LEADS_WEBHOOK_URL para guardar en Google Sheets."
    : "Tus datos ya quedaron registrados.";
  return `${base} ${sheets} En breve recibirás confirmación de horarios disponibles.`;
}

function extractInboundMessages(payload) {
  const out = [];
  const entries = payload?.entry || [];
  for (const entry of entries) {
    const changes = entry?.changes || [];
    for (const change of changes) {
      const value = change?.value || {};
      const messages = value?.messages || [];
      for (const message of messages) {
        if (message?.type === "text" && message?.text?.body && message?.from) {
          out.push({ from: message.from, text: message.text.body, id: message.id });
        }
      }
    }
  }
  return out;
}

const processed = new Set();

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && u.pathname === "/webhook") {
    const mode = u.searchParams.get("hub.mode");
    const token = u.searchParams.get("hub.verify_token");
    const challenge = u.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(challenge || "");
      return;
    }
    sendJson(res, 403, { ok: false, error: "Invalid verify token" });
    return;
  }

  if (req.method === "GET" && u.pathname === "/health") {
    sendJson(res, 200, { ok: true, service: "whatsapp-mvp-server" });
    return;
  }

  if (req.method === "POST" && u.pathname === "/webhook") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", async () => {
      if (!verifyMetaSignature(req.headers["x-hub-signature-256"], raw)) {
        sendJson(res, 401, { ok: false, error: "Invalid signature" });
        return;
      }
      const payload = parseJsonSafe(raw);
      if (!payload) {
        sendJson(res, 400, { ok: false, error: "Invalid JSON" });
        return;
      }
      const messages = extractInboundMessages(payload);
      for (const m of messages) {
        if (processed.has(m.id)) continue;
        processed.add(m.id);
        try {
          console.log("inbound_received", { from: m.from, messageId: m.id, text: m.text });
          const reply = await buildReply(m.from, m.text);
          await sendWhatsAppText(m.from, reply);
        } catch (err) {
          console.error("processing_error", { messageId: m.id, error: String(err) });
        }
      }
      sendJson(res, 200, { ok: true, received: messages.length });
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`whatsapp-mvp-server listening on :${PORT}`);
});
