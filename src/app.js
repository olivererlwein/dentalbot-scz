import express from "express";
import { buildSchedulerRouter } from "./schedulerRouter.js";
import { InMemoryStore } from "./store/inMemoryStore.js";
import { MockCalendarAdapter } from "./calendar/mockCalendarAdapter.js";

export function createApp() {
  const app = express();
  app.use(express.json());

  const store = new InMemoryStore();
  const calendarAdapter = new MockCalendarAdapter();

  app.use("/api/v1/scheduler", buildSchedulerRouter({ store, calendarAdapter }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  return app;
}
