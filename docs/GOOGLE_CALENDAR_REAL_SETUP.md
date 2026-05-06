# Google Calendar Real Setup (Scheduler MVP)

Objetivo: habilitar pruebas reales del flujo:
`availability -> seleccionar slot -> create event -> reconsultar disponibilidad`

## 1) Google Cloud: pasos exactos

1. Ir a `https://console.cloud.google.com/`.
2. Crear proyecto:
   - Click en selector de proyecto (barra superior) -> `New Project`.
   - Nombre sugerido: `dentalbot-scheduler-mvp`.
   - Crear y seleccionar el proyecto.
3. Habilitar Google Calendar API:
   - `APIs & Services` -> `Library`.
   - Buscar `Google Calendar API`.
   - Click `Enable`.
4. Crear Service Account:
   - `IAM & Admin` -> `Service Accounts` -> `Create Service Account`.
   - Nombre: `dentalbot-scheduler-sa`.
   - Crear y finalizar (no requiere rol de proyecto para este caso).
5. Generar key JSON:
   - Entrar a la service account creada.
   - Pestaña `Keys` -> `Add Key` -> `Create new key` -> tipo `JSON`.
   - Descargar archivo `.json` (guardarlo fuera del repo).
6. Obtener credenciales del JSON:
   - `client_email` -> `GOOGLE_CLIENT_EMAIL`
   - `private_key` -> `GOOGLE_PRIVATE_KEY`

## 2) Google Calendar: pasos exactos

1. Abrir Google Calendar web.
2. Crear calendario dedicado (recomendado):
   - `Other calendars` -> `Create new calendar`.
   - Nombre sugerido: `DentalBot SCZ - Agenda MVP`.
3. Obtener `GOOGLE_CALENDAR_ID`:
   - En calendario creado -> `Settings and sharing`.
   - Sección `Integrate calendar`.
   - Copiar `Calendar ID`.
4. Compartir con la Service Account:
   - En `Settings and sharing` -> `Share with specific people or groups` -> `Add people and groups`.
   - Pegar `GOOGLE_CLIENT_EMAIL`.
   - Permiso requerido: **Make changes to events**.
   - Guardar.

## 3) Variables de entorno requeridas

En `backend/.env`:

```env
BOT_TIMEZONE=America/La_Paz
SCHEDULER_PORT=3002
SCHEDULER_INTERNAL_BEARER=
GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nLINEA_1\nLINEA_2\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=your_calendar_id@group.calendar.google.com
```

Notas:
- `SCHEDULER_PORT` es el puerto real usado por `scheduler-api-server.js`.
- `SCHEDULER_INTERNAL_BEARER` puede quedar vacío para pruebas locales.
- `GOOGLE_PRIVATE_KEY` debe mantener `\\n` literales.

## 4) Comandos para correr backend

Desde `C:\Users\HP\Projects\dentalbot-scz`:

1. Crear `.env` desde ejemplo:

```powershell
Copy-Item .\backend\.env.example .\backend\.env
```

2. Cargar variables de `.env` en la sesión PowerShell:

```powershell
Get-Content .\backend\.env | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $name, $value = $_ -split '=', 2
  [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), 'Process')
}
```

3. Iniciar servidor scheduler:

```powershell
node .\backend\scheduler-api-server.js
```

4. Healthcheck:

```powershell
curl http://localhost:3002/health
```

Respuesta esperada:
`{"ok":true,"service":"scheduler-api-server"}`

## 5) Prueba E2E (real)

Usar una fecha de prueba (ejemplo `2026-05-06`).

### 5.1 Consultar disponibilidad

```powershell
curl "http://localhost:3002/api/v1/scheduler/availability?date=2026-05-06&reason=limpieza_dental"
```

Validar:
- responde `200`
- trae `slots` no vacíos

### 5.2 Crear cita real

Tomar un `startAt` y `endAt` de la respuesta anterior y ejecutar:

```powershell
curl -X POST "http://localhost:3002/api/v1/scheduler/appointments" `
  -H "Content-Type: application/json" `
  -H "Idempotency-Key: test-apt-001" `
  -d "{\"patientName\":\"Camila Rojas\",\"patientPhone\":\"+59170000000\",\"reason\":\"limpieza_dental\",\"reasonLabel\":\"Limpieza dental\",\"startAt\":\"2026-05-06T10:00:00-04:00\",\"endAt\":\"2026-05-06T11:00:00-04:00\"}"
```

Validar:
- responde `201`
- retorna `externalEventId`

### 5.3 Reconsultar disponibilidad

```powershell
curl "http://localhost:3002/api/v1/scheduler/availability?date=2026-05-06&reason=limpieza_dental"
```

Validar:
- el slot reservado ya no aparece en `slots`

### 5.4 Verificar evento en Google Calendar

En Google Calendar:
- abrir calendario `DentalBot SCZ - Agenda MVP`
- confirmar que existe evento en el horario creado
- verificar título `Cita Dental - <patientName>`

## 6) Errores comunes y resolución

1. `GOOGLE_CREDENTIALS_MISSING`
- Causa: faltan `GOOGLE_CLIENT_EMAIL` o `GOOGLE_PRIVATE_KEY`.
- Acción: revisar `.env` y recargar variables en terminal.

2. `GOOGLE_TOKEN_ERROR`
- Causa: private key mal formateada o service account inválida.
- Acción: usar key JSON nueva; asegurar `\\n` en `GOOGLE_PRIVATE_KEY`.

3. `GOOGLE_FREEBUSY_ERROR` o `GOOGLE_INSERT_ERROR`
- Causa: API no habilitada o permisos de calendario insuficientes.
- Acción:
  - confirmar `Google Calendar API` habilitada en GCP.
  - confirmar calendar compartido con service account como `Make changes to events`.

4. `SLOT_NOT_AVAILABLE` al crear cita
- Causa: horario tomado entre consulta y creación (esperado en concurrencia).
- Acción: reconsultar `availability` y seleccionar alternativa.

5. `404 Route not found`
- Causa: endpoint o método incorrecto.
- Acción: usar exactamente:
  - `GET /api/v1/scheduler/availability`
  - `POST /api/v1/scheduler/appointments`

6. `401 UNAUTHORIZED`
- Causa: se configuró `SCHEDULER_INTERNAL_BEARER` y no se envía token.
- Acción: enviar header `Authorization: Bearer <token>` o dejar variable vacía en local.

## Alcance de esta guía

- Incluye solo Google Calendar real para Scheduler MVP.
- No cubre WhatsApp ni Supabase.
