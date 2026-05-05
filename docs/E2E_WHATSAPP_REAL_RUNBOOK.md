# Guia Operativa E2E - WhatsApp Real -> Webhook -> Respuesta -> Lead

Fecha: 2026-05-05
Objetivo de esta guia: dejar operativa la prueba real minima.
Fuera de alcance en esta fase: Google Calendar.

## 1) Cuentas necesarias (exactas)

1. Meta Developer account
- Uso: crear app de Meta y activar producto WhatsApp.
- URL: https://developers.facebook.com/

2. WhatsApp Business Platform (Cloud API)
- Uso: numero de prueba, token temporal, Phone Number ID, webhook events.
- Se configura dentro de la app de Meta, producto WhatsApp.

3. Webhook publico
- Opcion A (recomendada para esta prueba): servidor local + ngrok.
- Opcion B: endpoint publico en n8n (Webhook Trigger).

4. Google Sheets / Apps Script (opcional para esta fase)
- Uso: recibir y guardar lead en hoja.
- Si aun no esta listo, se prueba solo respuesta automatica dejando `LEADS_WEBHOOK_URL` vacio.

## 2) Variables de entorno requeridas en `backend/.env`

| Variable | Obligatoria | Donde se obtiene | Ejemplo de formato |
|---|---|---|---|
| `PORT` | Opcional | Definida por nosotros | `3001` |
| `BOT_TIMEZONE` | Opcional | Definida por nosotros | `America/La_Paz` |
| `WHATSAPP_VERIFY_TOKEN` | Si | Definida por nosotros y usada tambien en Meta webhook config | `dentalbot_verify_2026` |
| `WHATSAPP_APP_SECRET` | Si | Meta App -> Settings -> Basic -> App Secret | `a1b2c3d4...` |
| `WHATSAPP_ACCESS_TOKEN` | Si | Meta WhatsApp -> API Setup -> Temporary access token (o token permanente) | `EAA...` |
| `WHATSAPP_PHONE_NUMBER_ID` | Si | Meta WhatsApp -> API Setup -> Phone number ID | `123456789012345` |
| `LEADS_WEBHOOK_URL` | Opcional | URL publica de Apps Script Web App o n8n webhook para guardar lead | `https://script.google.com/macros/s/.../exec` |

Notas:
- Si `LEADS_WEBHOOK_URL` no esta configurado, el bot igual responde por WhatsApp.
- No commitear `.env` al repo.

## 3) Pasos exactos en Meta (Cloud API)

1. Crear app
- Ir a Meta for Developers -> `My Apps` -> `Create App`.
- Tipo recomendado: `Business`.
- Completar nombre app y correo.

2. Activar WhatsApp
- Dentro de la app: `Add product` -> `WhatsApp` -> `Set up`.

3. Obtener token
- Ir a `WhatsApp` -> `API Setup`.
- Copiar `Temporary access token` (para pruebas).

4. Obtener Phone Number ID
- En la misma pantalla `API Setup`, copiar `Phone number ID`.

5. Configurar webhook URL
- Ir a `WhatsApp` -> `Configuration` -> `Webhooks`.
- En `Callback URL` pegar: `https://<tu-url-publica>/webhook`.

6. Configurar verify token
- En `Verify token` pegar exactamente el mismo valor de `WHATSAPP_VERIFY_TOKEN`.

7. Suscribir eventos
- En `Webhooks fields`, suscribir al menos `messages`.
- Guardar cambios.

8. Confirmar numero de prueba
- En `API Setup`, agregar el telefono que enviara mensajes (recipient permitido en sandbox de prueba).

## 4) Exponer servidor local (ngrok)

## Prerrequisitos
- Backend escuchando en `PORT=3001`.
- ngrok instalado y autenticado.

## Comandos exactos

```powershell
# terminal 1: levantar backend
node backend/whatsapp-mvp-server.js
```

```powershell
# terminal 2: exponer puerto local
ngrok http 3001
```

Tomar URL HTTPS publica de ngrok, por ejemplo:
- `https://abc123.ngrok-free.app`

URL a pegar en Meta `Callback URL`:
- `https://abc123.ngrok-free.app/webhook`

`Verify token` en Meta debe ser exactamente el valor de `WHATSAPP_VERIFY_TOKEN`.

## 5) Ejecutar prueba real E2E

1. Crear `.env` desde ejemplo

```powershell
Copy-Item backend/.env.example backend/.env
```

2. Cargar variables (PowerShell, ejemplo minimo)

```powershell
$env:PORT='3001'
$env:BOT_TIMEZONE='America/La_Paz'
$env:WHATSAPP_VERIFY_TOKEN='dentalbot_verify_2026'
$env:WHATSAPP_APP_SECRET='TU_APP_SECRET'
$env:WHATSAPP_ACCESS_TOKEN='TU_ACCESS_TOKEN'
$env:WHATSAPP_PHONE_NUMBER_ID='TU_PHONE_NUMBER_ID'
# opcional:
# $env:LEADS_WEBHOOK_URL='https://script.google.com/macros/s/.../exec'
```

3. Iniciar backend

```powershell
node backend/whatsapp-mvp-server.js
```

4. Iniciar ngrok

```powershell
ngrok http 3001
```

5. Verificar healthcheck

```powershell
curl http://localhost:3001/health
```

Debe responder `{"ok":true,"service":"whatsapp-mvp-server"}`.

6. Enviar mensaje de prueba desde WhatsApp real
- Desde telefono habilitado, enviar al numero de prueba Meta:
  - `Hola, quiero agendar una limpieza dental`

7. Respuesta esperada
- Primer mensaje esperado del bot (intent + captura):
  - `Para ayudarte, indícame tu nombre completo.`

8. Verificar logs backend
- Debe aparecer algo como:
  - `inbound_received { from, messageId, text }`
  - `outbound_sent { to, messageId }`

9. Flujo de captura minimo
- Usuario responde nombre -> bot pide motivo.
- Usuario responde motivo -> bot pide horario.
- Usuario responde horario -> bot confirma registro.

## 6) Si Google Sheets no esta listo

- Dejar `LEADS_WEBHOOK_URL` vacio.
- La prueba E2E sigue siendo valida para prioridad actual:
  - WhatsApp real -> webhook -> respuesta automatica.
- En el mensaje final el bot notificara que falta configurar el sink de Sheets.
- Cuando Sheets este listo, solo agregar `LEADS_WEBHOOK_URL` y repetir prueba.

## Checklist de aprobado para esta fase
- [ ] Webhook verificado en Meta con URL publica.
- [ ] Evento `messages` suscrito.
- [ ] Mensaje real recibido y respondido automaticamente.
- [ ] Logs `inbound_received` y `outbound_sent` visibles.
- [ ] (Opcional) Lead enviado al endpoint de Sheets.
