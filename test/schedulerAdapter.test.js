import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

test("GET /availability returns slots", async () => {
  const res = await request(app)
    .get("/api/v1/scheduler/availability")
    .query({ date: "2026-05-06", durationMin: 30 });

  assert.equal(res.status, 200);
  assert.equal(Array.isArray(res.body.slots), true);
  assert.equal(res.body.durationMin, 30);
});

test("POST /appointments supports idempotency", async () => {
  const payload = {
    patientName: "Ana Perez",
    patientPhone: "+59170000000",
    reason: "Control",
    startAt: "2026-05-06T10:00:00-04:00",
    endAt: "2026-05-06T10:30:00-04:00"
  };

  const first = await request(app)
    .post("/api/v1/scheduler/appointments")
    .set("Idempotency-Key", "idem-1")
    .send(payload);

  const second = await request(app)
    .post("/api/v1/scheduler/appointments")
    .set("Idempotency-Key", "idem-1")
    .send(payload);

  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(first.body.appointmentId, second.body.appointmentId);
});

test("PATCH reschedule, POST cancel, GET by id", async () => {
  const created = await request(app)
    .post("/api/v1/scheduler/appointments")
    .set("Idempotency-Key", "idem-2")
    .send({
      patientName: "Luis Roca",
      patientPhone: "+59171111111",
      reason: "Limpieza",
      startAt: "2026-05-06T11:00:00-04:00",
      endAt: "2026-05-06T11:30:00-04:00"
    });

  const id = created.body.appointmentId;

  const moved = await request(app)
    .patch(`/api/v1/scheduler/appointments/${id}/reschedule`)
    .set("Idempotency-Key", "idem-3")
    .send({
      newStartAt: "2026-05-07T16:00:00-04:00",
      newEndAt: "2026-05-07T16:30:00-04:00"
    });

  assert.equal(moved.status, 200);
  assert.equal(moved.body.status, "rescheduled");

  const fetched = await request(app).get(`/api/v1/scheduler/appointments/${id}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.startAt, "2026-05-07T16:00:00-04:00");

  const cancelled = await request(app)
    .post(`/api/v1/scheduler/appointments/${id}/cancel`)
    .set("Idempotency-Key", "idem-4")
    .send({ reason: "Paciente no puede asistir" });

  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.status, "cancelled");
});
