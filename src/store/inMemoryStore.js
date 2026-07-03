export class InMemoryStore {
  constructor() {
    this.appointments = new Map();
    this.idempotency = new Map();
  }

  saveAppointment(appointment) {
    this.appointments.set(appointment.appointmentId, appointment);
  }

  getAppointment(appointmentId) {
    return this.appointments.get(appointmentId) || null;
  }

  saveIdempotent(key, hash, response) {
    this.idempotency.set(key, { hash, response });
  }

  getIdempotent(key) {
    return this.idempotency.get(key) || null;
  }
}
