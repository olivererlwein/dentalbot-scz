# Scheduler Deploy Produccion (Paso Intermedio MVP Vendible)

Fecha: 2026-05-06
Objetivo: desplegar backend scheduler publico, validar E2E en produccion y conectar web demo.

## Orden recomendado (aprobado)

1. Deploy backend scheduler.
2. Configurar variables de entorno en produccion.
3. Actualizar Google OAuth redirect URI de produccion.
4. Probar E2E: availability -> booking -> availability.
5. Conectar landing/web chat al backend publico.
6. Integrar WhatsApp despues (cuando exista numero limpio).

## 1) Deploy backend scheduler

Se incluye imagen Docker lista:
- `backend/Dockerfile.scheduler`

Build local:

```powershell
docker build -f backend/Dockerfile.scheduler -t dentalbot-scheduler:prod .
```

Run local simulado prod:

```powershell
docker run --rm -p 3002:3002 --env-file backend/.env dentalbot-scheduler:prod
```

Para cloud (Render/Railway/Fly/Cloud Run), usar:
- Start command: `node scheduler-api-server.js`
- Port: `3002` (o el que inyecte la plataforma)

## 2) Variables de entorno en produccion

Minimas requeridas:
- `SCHEDULER_PORT`
- `BOT_TIMEZONE=America/La_Paz`
- `SCHEDULER_INTERNAL_BEARER`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_TOKEN_STORE_PATH` (persistente en disco/secret store)

Opcional si ya lo tienes:
- `GOOGLE_REFRESH_TOKEN`

## 3) Google OAuth redirect URI (produccion)

En Google Cloud Console -> OAuth Client:
- Agregar redirect de produccion, por ejemplo:
  - `https://scheduler.tudominio.com/oauth2callback`

Actualizar env en backend:
- `GOOGLE_REDIRECT_URI=https://scheduler.tudominio.com/oauth2callback`

Bootstrap OAuth:
1. Abrir `https://scheduler.tudominio.com/auth/google`
2. Aceptar scope calendar.
3. Confirmar callback exitoso y refresh token guardado.

## 4) Prueba E2E produccion

1. Availability inicial:

```powershell
curl "https://scheduler.tudominio.com/api/availability?date=2026-05-10&reason=limpieza_dental" -H "Authorization: Bearer TU_TOKEN_INTERNO"
```

2. Booking real:

```powershell
curl -X POST "https://scheduler.tudominio.com/api/bookings" \
  -H "Authorization: Bearer TU_TOKEN_INTERNO" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: prod-booking-001" \
  -d '{"patientName":"Paciente Demo","patientPhone":"+59170000000","reason":"limpieza_dental","startAt":"2026-05-10T09:00:00-04:00"}'
```

3. Availability final:
- El slot reservado no debe aparecer.

## 5) Conectar landing/web chat al backend publico

Opcion A (global JS, recomendada):

```html
<script>
  window.SCHEDULER_API_BASE = "https://scheduler.tudominio.com";
</script>
```

Opcion B (atributo HTML):
- En `<html ... data-scheduler-api-base="https://scheduler.tudominio.com">`

Opcion C (runtime localStorage para testing):

```js
localStorage.setItem("SCHEDULER_API_BASE", "https://scheduler.tudominio.com");
```

La web ya soporta las 3 opciones.

## 6) Criterio de cierre de este paso

- Backend scheduler accesible por URL publica.
- OAuth prod operativo.
- E2E prod validado (availability -> booking -> availability).
- Landing conectada al backend publico.

## Nota de alcance

No se toca WhatsApp en este paso. WhatsApp entra en la fase siguiente como canal adicional.
