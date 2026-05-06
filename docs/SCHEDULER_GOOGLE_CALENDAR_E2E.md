# Scheduler Google Calendar Real (OAuth 2.0) - ERL-18

Fecha: 2026-05-06
Objetivo: disponibilidad y reservas reales con Google Calendar como fuente de verdad.

## Endpoints implementados

1. `GET /auth/google`
2. `GET /oauth2callback`
3. `GET /api/availability?date=YYYY-MM-DD&reason=...`
4. `POST /api/bookings`

Compatibilidad mantenida:
- `GET /api/v1/scheduler/availability`
- `POST /api/v1/scheduler/appointments`

## Variables `.env` del scheduler

| Variable | Obligatoria | Descripcion |
|---|---|---|
| `SCHEDULER_PORT` | Opcional | Puerto del scheduler API (`3002` por defecto). |
| `SCHEDULER_INTERNAL_BEARER` | Opcional (recomendada) | Bearer interno para proteger endpoints de scheduler. |
| `BOT_TIMEZONE` | Opcional | Timezone de negocio (`America/La_Paz`). |
| `GOOGLE_CLIENT_ID` | Si | OAuth Client ID de Google Cloud. |
| `GOOGLE_CLIENT_SECRET` | Si | OAuth Client Secret de Google Cloud. |
| `GOOGLE_REDIRECT_URI` | Si | URI de callback OAuth. Requerido por board: `http://localhost:3001/oauth2callback`. |
| `GOOGLE_CALENDAR_ID` | Si | Calendar ID dental real. |
| `GOOGLE_REFRESH_TOKEN` | Opcional | Si ya existe, se puede inyectar directo. |
| `GOOGLE_TOKEN_STORE_PATH` | Opcional | Ruta local para guardar `refresh_token` (default `.secrets/google-oauth.json`). |

## Flujo OAuth 2.0

1. Levantar scheduler API:

```powershell
node backend/scheduler-api-server.js
```

2. Abrir en navegador:

```text
http://localhost:3002/auth/google
```

3. Aceptar permisos Google (`https://www.googleapis.com/auth/calendar`).
4. Google redirige a `GOOGLE_REDIRECT_URI` con `code`.
5. Endpoint `/oauth2callback` hace exchange y guarda `refresh_token` en `GOOGLE_TOKEN_STORE_PATH`.

Nota:
- Si Google no devuelve `refresh_token`, revocar acceso de la app y repetir consentimiento.

## Reglas funcionales implementadas

- No fechas pasadas.
- No fechas mayores a 60 dias.
- Duracion por motivo:
  - consulta_inicial: 30
  - limpieza_dental: 60
  - blanqueamiento: 90
  - ortodoncia_control: 30
  - urgencia_dental: 45
- Disponibilidad via FreeBusy real.
- Revalidacion FreeBusy antes de crear evento.
- Concurrencia: lock por slot + segunda validacion.
- Si colisiona slot:
  - `Ese horario acaba de ocuparse. Elige otro horario disponible.`

## Prueba E2E real

1. Consultar disponibilidad:

```powershell
curl "http://localhost:3002/api/availability?date=2026-05-10&reason=limpieza_dental" -H "Authorization: Bearer YOUR_INTERNAL_TOKEN"
```

2. Crear cita real:

```powershell
curl -X POST "http://localhost:3002/api/bookings" \
  -H "Authorization: Bearer YOUR_INTERNAL_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: e2e-booking-001" \
  -d '{"patientName":"Camila Rojas","patientPhone":"+59170000000","reason":"limpieza_dental","startAt":"2026-05-10T10:00:00-04:00"}'
```

3. Consultar disponibilidad nuevamente:
- El slot reservado no debe aparecer.

4. Prueba de doble reserva:
- Lanzar dos POST simultaneos para el mismo slot.
- Resultado esperado: una reserva `201`, la otra `409 SLOT_NOT_AVAILABLE` con el mensaje oficial.

## Frontend wizard

- Valida rango de fecha (hoy a hoy+60 dias).
- Consulta API real para mostrar slots.
- Mock queda solo como fallback offline.
