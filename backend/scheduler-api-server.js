require('dotenv').config();
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.SCHEDULER_PORT || 3002);
const TIMEZONE = process.env.BOT_TIMEZONE || "America/La_Paz";
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/oauth2callback`;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || "";
const GOOGLE_TOKEN_STORE_PATH = process.env.GOOGLE_TOKEN_STORE_PATH || path.join(process.cwd(), ".secrets", "google-oauth.json");
const INTERNAL_BEARER = process.env.SCHEDULER_INTERNAL_BEARER || "";

const idemStore = new Map();
const slotLocks = new Map();
let tokenCache = { token: "", expiresAt: 0 };
let refreshTokenCache = GOOGLE_REFRESH_TOKEN;
const TZ_OFFSET_MINUTES = -4 * 60;
const MAX_DAYS_AHEAD = 60;

function sendJson(res, code, payload) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  res.end(JSON.stringify(payload));
}

function normalizePrivateKey(value) {
  return value.replace(/\\n/g, "\n").trim();
}

function toLocalIso(date, hh, mm) {
  return `${date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00-04:00`;
}

function formatMsAtOffset(ms, offsetMinutes) {
  const shifted = new Date(ms + offsetMinutes * 60000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mm = String(shifted.getUTCMinutes()).padStart(2, "0");
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const offH = String(Math.floor(abs / 60)).padStart(2, "0");
  const offM = String(abs % 60).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}:00${sign}${offH}:${offM}`;
}

function nowInTimezoneDate() {
  const now = Date.now();
  const shifted = new Date(now + TZ_OFFSET_MINUTES * 60000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

function addDays(dateString, days) {
  const base = Date.parse(`${dateString}T00:00:00-04:00`);
  return formatMsAtOffset(base + days * 24 * 60 * 60 * 1000, TZ_OFFSET_MINUTES).slice(0, 10);
}

function validateDateWindow(dateString) {
  const minDate = nowInTimezoneDate();
  const maxDate = addDays(minDate, MAX_DAYS_AHEAD);
  if (dateString < minDate) return { ok: false, code: "DATE_IN_PAST", minDate, maxDate };
  if (dateString > maxDate) return { ok: false, code: "DATE_TOO_FAR", minDate, maxDate };
  return { ok: true, minDate, maxDate };
}

function readStoredRefreshToken() {
  try {
    if (!fs.existsSync(GOOGLE_TOKEN_STORE_PATH)) return "";
    const raw = fs.readFileSync(GOOGLE_TOKEN_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed.refresh_token || "";
  } catch {
    return "";
  }
}

function saveRefreshToken(token) {
  const dir = path.dirname(GOOGLE_TOKEN_STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(GOOGLE_TOKEN_STORE_PATH, JSON.stringify({ refresh_token: token }, null, 2), "utf8");
  refreshTokenCache = token;
}

async function googleAccessToken() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_OAUTH_CLIENT_MISSING");
  }
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.token && now < tokenCache.expiresAt - 60) return tokenCache.token;
  const refreshToken = refreshTokenCache || readStoredRefreshToken();
  if (!refreshToken) throw new Error("GOOGLE_REFRESH_TOKEN_MISSING");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken
    })
  });
const data = await response.json();

if (!response.ok) {
  console.log("GOOGLE TOKEN RESPONSE:", JSON.stringify(data, null, 2));
  throw new Error("GOOGLE_TOKEN_EXCHANGE_ERROR");
}
  tokenCache = { token: data.access_token, expiresAt: now + Number(data.expires_in || 3600) };
  return tokenCache.token;
}

async function googleFreeBusy(calendarId, timeMin, timeMax) {
  const token = await googleAccessToken();
  const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: TIMEZONE,
      items: [{ id: calendarId }]
    })
  });
 const data = await response.json();

if (!response.ok) {
  console.log("GOOGLE FREEBUSY RESPONSE:", JSON.stringify(data, null, 2));
  throw new Error("GOOGLE_FREEBUSY_ERROR");
}

  return data?.calendars?.[calendarId]?.busy || [];
}

async function googleInsertEvent(calendarId, payload) {
  const token = await googleAccessToken();
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      summary: `Cita Dental - ${payload.patientName}`,
      description: `telefono=${payload.patientPhone}\nmotivo=${payload.reason}\nsource=web_chat_mvp`,
      start: { dateTime: payload.startAt, timeZone: TIMEZONE },
      end: { dateTime: payload.endAt, timeZone: TIMEZONE }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error("GOOGLE_INSERT_ERROR");
  return data;
}

function overlap(aStart, aEnd, bStart, bEnd) {
  return Date.parse(aStart) < Date.parse(bEnd) && Date.parse(bStart) < Date.parse(aEnd);
}

function withLock(slotKey, fn) {
  if (slotLocks.has(slotKey)) throw new Error("SLOT_LOCKED");
  slotLocks.set(slotKey, true);
  return Promise.resolve(fn()).finally(() => slotLocks.delete(slotKey));
}

function payloadHash(body) {
  return crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

function requireAuth(req) {
  if (!INTERNAL_BEARER) return true;
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${INTERNAL_BEARER}`;
}

function parseBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve(null);
      }
    });
  });
}

function slotDurationMinutes(reason) {
  const map = {
    consulta_inicial: 30,
    limpieza_dental: 60,
    blanqueamiento: 90,
    ortodoncia_control: 30,
    urgencia_dental: 45
  };
  return map[reason] || 30;
}

function addMinutesIso(iso, minutes) {
  const startMs = Date.parse(iso);
  return formatMsAtOffset(startMs + minutes * 60 * 1000, TZ_OFFSET_MINUTES);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && u.pathname === "/health") {
    sendJson(res, 200, { ok: true, service: "scheduler-api-server" });
    return;
  }

  if (req.method === "GET" && u.pathname === "/auth/google") {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
      sendJson(res, 500, { error: { code: "GOOGLE_OAUTH_CLIENT_MISSING", message: "Missing GOOGLE_CLIENT_ID/GOOGLE_REDIRECT_URI", retryable: false } });
      return;
    }
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    res.writeHead(302, { Location: authUrl.toString() });
    res.end();
    return;
  }

  if (req.method === "GET" && u.pathname === "/oauth2callback") {
    const code = u.searchParams.get("code");
    if (!code) {
      sendJson(res, 400, { error: { code: "VALIDATION_ERROR", message: "Missing code query param", retryable: false } });
      return;
    }
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code"
        })
      });
     const data = await response.json();

if (!response.ok) {
  console.log("GOOGLE TOKEN RESPONSE:", JSON.stringify(data, null, 2));
  throw new Error("GOOGLE_TOKEN_EXCHANGE_ERROR");
}

if (data.refresh_token) saveRefreshToken(data.refresh_token);
      sendJson(res, 200, {
        ok: true,
        message: data.refresh_token
          ? "OAuth completado. Refresh token guardado en store local."
          : "OAuth completado, pero Google no devolvio refresh_token. Revoca acceso y reintenta con prompt=consent."
      });
   } catch (error) {
  console.error("TOKEN EXCHANGE ERROR:");
  console.error(error);

  sendJson(res, 502, {
    error: {
      code: "GOOGLE_TOKEN_EXCHANGE_ERROR",
      message: "Token exchange failed",
      retryable: true
    }
  });
}
    return;
  }

  if (!requireAuth(req)) {
    sendJson(res, 401, { error: { code: "UNAUTHORIZED", message: "Invalid token", retryable: false } });
    return;
  }

  if (req.method === "GET" && (u.pathname === "/api/v1/scheduler/availability" || u.pathname === "/api/availability")) {
    try {
      const date = u.searchParams.get("date");
      const reason = u.searchParams.get("reason") || "consulta_inicial";
      const durationMin = Number(u.searchParams.get("durationMin") || slotDurationMinutes(reason));
      const fromHour = u.searchParams.get("fromHour") || "08:00";
      const toHour = u.searchParams.get("toHour") || "19:00";
      const calendarId = u.searchParams.get("calendarId") || CALENDAR_ID;
      if (!date || !calendarId) {
        sendJson(res, 400, { error: { code: "VALIDATION_ERROR", message: "date and calendarId are required", retryable: false } });
        return;
      }
      const dateValidation = validateDateWindow(date);
      if (!dateValidation.ok) {
        sendJson(res, 400, {
          error: {
            code: dateValidation.code,
            message: dateValidation.code === "DATE_IN_PAST" ? "No se permiten fechas pasadas" : "Fecha fuera del rango permitido (maximo 60 dias)",
            retryable: false
          },
          constraints: { minDate: dateValidation.minDate, maxDate: dateValidation.maxDate }
        });
        return;
      }

      const [fromH, fromM] = fromHour.split(":").map(Number);
      const [toH, toM] = toHour.split(":").map(Number);
      const windowStart = toLocalIso(date, fromH, fromM);
      const windowEnd = toLocalIso(date, toH, toM);
      const busy = await googleFreeBusy(calendarId, windowStart, windowEnd);
      const slots = [];
      let cursor = fromH * 60 + fromM;
      const endBoundary = toH * 60 + toM;
      while (cursor + durationMin <= endBoundary) {
        const startH = Math.floor(cursor / 60);
        const startM = cursor % 60;
        const startAt = toLocalIso(date, startH, startM);
        const endAt = addMinutesIso(startAt, durationMin);
        const isBusy = busy.some((item) => overlap(startAt, endAt, item.start, item.end));
        if (!isBusy) slots.push({ startAt, endAt });
        cursor += durationMin;
      }
      sendJson(res, 200, { date, timezone: TIMEZONE, durationMin, slots });
    } catch {
      sendJson(res, 502, { error: { code: "GOOGLE_API_ERROR", message: "Availability lookup failed", retryable: true } });
    }
    return;
  }

  if (req.method === "POST" && (u.pathname === "/api/v1/scheduler/appointments" || u.pathname === "/api/bookings")) {
    const body = await parseBody(req);
    if (!body) {
      sendJson(res, 400, { error: { code: "VALIDATION_ERROR", message: "Invalid JSON", retryable: false } });
      return;
    }
    const idempotencyKey = req.headers["idempotency-key"];
    if (!idempotencyKey) {
      sendJson(res, 400, { error: { code: "VALIDATION_ERROR", message: "Idempotency-Key required", retryable: false } });
      return;
    }
    const hash = payloadHash(body);
    if (idemStore.has(idempotencyKey)) {
      const prev = idemStore.get(idempotencyKey);
      if (prev.hash !== hash) {
        sendJson(res, 409, { error: { code: "IDEMPOTENCY_CONFLICT", message: "Key reused with different payload", retryable: false } });
        return;
      }
      sendJson(res, 200, prev.response);
      return;
    }
    const calendarId = body.calendarId || CALENDAR_ID;
    if (!body.patientName || !body.patientPhone || !body.reason || !body.startAt || !calendarId) {
      sendJson(res, 400, { error: { code: "VALIDATION_ERROR", message: "Missing required fields", retryable: false } });
      return;
    }
    const startDate = String(body.startAt).slice(0, 10);
    const dateValidation = validateDateWindow(startDate);
    if (!dateValidation.ok) {
      sendJson(res, 400, {
        error: {
          code: dateValidation.code,
          message: dateValidation.code === "DATE_IN_PAST" ? "No se permiten fechas pasadas" : "Fecha fuera del rango permitido (maximo 60 dias)",
          retryable: false
        },
        constraints: { minDate: dateValidation.minDate, maxDate: dateValidation.maxDate }
      });
      return;
    }
    const durationMin = Number(body.durationMin || slotDurationMinutes(body.reason));
    const endAt = body.endAt || addMinutesIso(body.startAt, durationMin);
    const slotKey = `${calendarId}|${body.startAt}|${endAt}`;
    try {
      await withLock(slotKey, async () => {
        const busy = await googleFreeBusy(calendarId, body.startAt, endAt);
        if (busy.length) throw new Error("SLOT_NOT_AVAILABLE");
        const event = await googleInsertEvent(calendarId, { ...body, endAt });
        const response = {
          appointmentId: `apt_${event.id}`,
          externalEventId: event.id,
          patientName: body.patientName,
          patientPhone: body.patientPhone,
          reason: body.reasonLabel || body.reason,
          status: "confirmed",
          startAt: body.startAt,
          endAt,
          timezone: TIMEZONE,
          calendarId
        };
        idemStore.set(idempotencyKey, { hash, response });
        sendJson(res, 201, response);
      });
    } catch (error) {
      const code = error.message === "SLOT_NOT_AVAILABLE" || error.message === "SLOT_LOCKED" ? "SLOT_NOT_AVAILABLE" : "GOOGLE_API_ERROR";
      sendJson(res, code === "SLOT_NOT_AVAILABLE" ? 409 : 502, {
        error: {
          code,
          message: code === "SLOT_NOT_AVAILABLE" ? "Ese horario acaba de ocuparse. Elige otro horario disponible." : "Calendar create failed",
          retryable: code !== "SLOT_NOT_AVAILABLE"
        }
      });
    }
    return;
  }

  sendJson(res, 404, { error: { code: "NOT_FOUND", message: "Route not found", retryable: false } });
});

server.listen(PORT, () => {
  console.log(`scheduler-api-server listening on :${PORT}`);
});
