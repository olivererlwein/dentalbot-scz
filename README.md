# DentalBot SCZ

Landing + skeleton tecnico inicial del Scheduler Adapter v1 para MVP.

## Scheduler Adapter v1 (MVP)

Endpoints disponibles:
- `GET /api/v1/scheduler/availability`
- `POST /api/v1/scheduler/appointments`
- `PATCH /api/v1/scheduler/appointments/{id}/reschedule`
- `POST /api/v1/scheduler/appointments/{id}/cancel`
- `GET /api/v1/scheduler/appointments/{id}`

Notas:
- Implementacion en memoria (no produccion).
- Adaptador de Google Calendar en modo mock (`src/calendar/mockCalendarAdapter.js`).
- Idempotencia basica por header `Idempotency-Key` para endpoints de escritura.

## Ejecutar localmente

1. Instalar dependencias:
```bash
npm install
```

2. Levantar API:
```bash
npm start
```

3. Ejecutar pruebas:
```bash
npm test
```

Servidor por defecto: `http://localhost:3001`.
