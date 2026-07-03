import { Router } from "express";
import { v4 as uuidv4 } from "uuid";

function badRequest(res, message) {
  return res.status(400).json({ error: { code: "VALIDATION_ERROR", message, retryable: false } });
}

export function buildSchedulerRouter({ store, calendarAdapter }) {
  const router = Router();

  router.get("/availability", async (req, res) => {
    const { date, durationMin, calendarId } = req.query;
    if (!date || !durationMin) {
      return badRequest(res, "date y durationMin son requeridos");
    }

    const slots = await calendarAdapter.getAvailability({
      date,
      durationMin: Number(durationMin),
      calendarId: calendarId || "primary",
      timezone: "America/La_Paz"
    });

    return res.status(200).json({
      date,
      timezone: "America/La_Paz",
      durationMin: Number(durationMin),
      slots
    });
  });

  router.post("/appointments", async (req, res) => {
    const idempotencyKey = req.header("Idempotency-Key");
    if (!idempotencyKey) {
      return badRequest(res, "Idempotency-Key es requerido");
    }

    const payload = req.body || {};
    const hash = JSON.stringify(payload);
    const previous = store.getIdempotent(idempotencyKey);

    if (previous) {
      if (previous.hash !== hash) {
        return res.status(409).json({ error: { code: "IDEMPOTENCY_CONFLICT", message: "Misma key con payload diferente", retryable: false } });
      }
      return res.status(200).json(previous.response);
    }

    const required = ["patientName", "patientPhone", "reason", "startAt", "endAt"];
    for (const field of required) {
      if (!payload[field]) {
        return badRequest(res, `${field} es requerido`);
      }
    }

    const externalEventId = await calendarAdapter.createEvent(payload);
    const appointment = {
      appointmentId: `apt_${uuidv4()}`,
      externalEventId,
      status: "confirmed",
      timezone: "America/La_Paz",
      ...payload
    };

    store.saveAppointment(appointment);
    store.saveIdempotent(idempotencyKey, hash, appointment);

    return res.status(201).json(appointment);
  });

  router.patch("/appointments/:id/reschedule", async (req, res) => {
    const idempotencyKey = req.header("Idempotency-Key");
    if (!idempotencyKey) {
      return badRequest(res, "Idempotency-Key es requerido");
    }

    const appointment = store.getAppointment(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: { code: "APPOINTMENT_NOT_FOUND", message: "Cita no encontrada", retryable: false } });
    }

    const { newStartAt, newEndAt } = req.body || {};
    if (!newStartAt || !newEndAt) {
      return badRequest(res, "newStartAt y newEndAt son requeridos");
    }

    await calendarAdapter.rescheduleEvent(appointment.externalEventId, newStartAt, newEndAt);

    const updated = {
      ...appointment,
      startAt: newStartAt,
      endAt: newEndAt,
      status: "rescheduled"
    };

    store.saveAppointment(updated);
    store.saveIdempotent(idempotencyKey, JSON.stringify(req.body || {}), updated);

    return res.status(200).json(updated);
  });

  router.post("/appointments/:id/cancel", async (req, res) => {
    const idempotencyKey = req.header("Idempotency-Key");
    if (!idempotencyKey) {
      return badRequest(res, "Idempotency-Key es requerido");
    }

    const appointment = store.getAppointment(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: { code: "APPOINTMENT_NOT_FOUND", message: "Cita no encontrada", retryable: false } });
    }

    await calendarAdapter.cancelEvent(appointment.externalEventId);

    const updated = { ...appointment, status: "cancelled" };
    store.saveAppointment(updated);
    store.saveIdempotent(idempotencyKey, JSON.stringify(req.body || {}), updated);

    return res.status(200).json({ appointmentId: updated.appointmentId, status: updated.status });
  });

  router.get("/appointments/:id", async (req, res) => {
    const appointment = store.getAppointment(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: { code: "APPOINTMENT_NOT_FOUND", message: "Cita no encontrada", retryable: false } });
    }

    return res.status(200).json(appointment);
  });

  return router;
}
