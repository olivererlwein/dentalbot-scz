# dentalbot-scz
Landing page y demo visual para DentalBot SCZ, un agente de IA para clinicas dentales que responde consultas, capta pacientes y agenda citas por WhatsApp.

## MVP real WhatsApp (bootstrap tecnico)

Documento de alcance y ejecucion:
- `docs/REAL_WHATSAPP_MVP_2D3D.md`
- `docs/E2E_WHATSAPP_REAL_RUNBOOK.md`

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
