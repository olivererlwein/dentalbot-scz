export class MockCalendarAdapter {
  constructor() {
    this.events = new Map();
  }

  async getAvailability({ date, durationMin }) {
    return [
      { startAt: `${date}T09:00:00-04:00`, endAt: `${date}T09:00:00-04:00` },
      { startAt: `${date}T10:00:00-04:00`, endAt: `${date}T10:00:00-04:00` }
    ].map((slot) => ({
      startAt: slot.startAt,
      endAt: new Date(new Date(slot.startAt).getTime() + durationMin * 60000).toISOString().replace(".000Z", "-04:00")
    }));
  }

  async createEvent(payload) {
    const eventId = `gcal_${Math.random().toString(36).slice(2, 10)}`;
    this.events.set(eventId, { ...payload, eventId, status: "confirmed" });
    return eventId;
  }

  async rescheduleEvent(eventId, startAt, endAt) {
    const existing = this.events.get(eventId) || { eventId };
    this.events.set(eventId, { ...existing, startAt, endAt, status: "rescheduled" });
  }

  async cancelEvent(eventId) {
    const existing = this.events.get(eventId) || { eventId };
    this.events.set(eventId, { ...existing, status: "cancelled" });
  }
}
