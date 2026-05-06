# dentalbot-scz
Landing page y demo visual para DentalBot SCZ, un agente de IA para clinicas dentales que responde consultas, capta pacientes y agenda citas por WhatsApp.

## Demo web Scheduler Adapter v1

Se agrego un modulo funcional en la landing (sin backend) con capa comercial tipo wizard:
- paso 1: nombre
- paso 2: motivo + telefono
- paso 3: fecha + slots seleccionables
- paso 4: confirmacion clara de cita

Archivos:
- `index.html` (seccion `#scheduler`)
- `styles.css` (estilos `.scheduler-*`)
- `script.js` (clase `SchedulerAdapterMock` y flujo wizard)

## MVP real WhatsApp (bootstrap tecnico)

Documento de alcance y ejecucion:
- `docs/REAL_WHATSAPP_MVP_2D3D.md`
- `docs/E2E_WHATSAPP_REAL_RUNBOOK.md`
- `docs/SCHEDULER_GOOGLE_CALENDAR_E2E.md`
- `docs/ERL-18_E2E_REAL_SIGNOFF.md`
- `docs/SCHEDULER_PRODUCTION_DEPLOY.md`

Servidor webhook MVP:
- `backend/whatsapp-mvp-server.js`
- `backend/.env.example`

### Ejecutar servidor local
1. Copiar `backend/.env.example` a `.env` y completar credenciales.
2. Cargar variables de entorno en terminal.
3. Ejecutar:

```powershell
node backend/whatsapp-mvp-server.js
```

Healthcheck:

```powershell
curl http://localhost:3001/health
```

Webhook de verificacion Meta:
- `GET /webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`

Webhook de eventos:
- `POST /webhook`

## Scheduler API + Wizard automatizado (Google Calendar)

Servidor scheduler:
- `backend/scheduler-api-server.js`
- `GET /api/v1/scheduler/availability?date=YYYY-MM-DD&reason=limpieza_dental`
- `POST /api/v1/scheduler/appointments` (requiere `Idempotency-Key`)

Ejecucion local:
```powershell
node backend/scheduler-api-server.js
```

El wizard web usa `http://localhost:3002` por defecto para consultar disponibilidad real y crear citas.

Guia operativa paso a paso:
- `docs/GOOGLE_CALENDAR_REAL_SETUP.md`
