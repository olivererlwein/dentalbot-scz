# Demo Real WhatsApp MVP (2-3 dias) - DentalBot SCZ

Fecha: 2026-05-05
Scope: demo funcional real sobre numero de prueba (sin pagos, sin automatizacion compleja, sin tocar landing)

## 1) Recomendacion tecnica: Cloud API vs Twilio vs n8n/provider

### Recomendacion final
Usar **WhatsApp Business Cloud API (Meta) + n8n + OpenAI + Google Sheets** en esta fase.

### Razon
- Ya existe stack objetivo definido (Calendar/Sheets + scheduler skeleton).
- Menor lock-in que Twilio para evolucionar a producto real.
- n8n acelera entrega en 2-3 dias para webhook, enrutamiento y respuestas.
- Permite migrar de horarios mock a Calendar sin redisenar todo el flujo.

### Comparativo rapido
| Opcion | Velocidad demo | Costo inicial | Riesgo tecnico | Riesgo operativo | Nota |
|---|---|---:|---|---|---|
| Cloud API + n8n (recomendada) | Alta | Bajo-Medio | Medio | Medio (setup Meta) | Mejor balance para MVP real |
| Twilio WhatsApp + n8n | Alta | Medio | Bajo-Medio | Bajo | Mas facil onboarding, mas costo y dependencia |
| Provider n8n no-oficial | Muy alta | Bajo | Alto | Alto (cumplimiento/estabilidad) | No recomendado para demo de negocio serio |
| Build custom sin n8n | Media-Baja | Bajo | Alto | Medio | No cumple velocidad 2-3 dias |

Decision: **Cloud API + n8n**.
Fallback si bloqueo de Meta >24h: **Twilio sandbox** para no perder demo.

## 2) Arquitectura E2E del MVP funcional

Paciente WhatsApp
-> Meta Cloud API Webhook
-> n8n Webhook Trigger (valida firma + dedupe por wamid)
-> Intent Router (OpenAI)
-> Acciones:
- precios: responder plantilla corta
- agendar limpieza: capturar datos y proponer horarios (mock o Calendar)
- reprogramar: buscar cita por telefono y ofrecer nuevo horario
- urgencia: respuesta prioritaria + derivacion humana
-> Persistencia lead en Google Sheets
-> Respuesta outbound por Cloud API

### Modo agenda
- Fase demo minima: `slots_mock.json` (horarios de ejemplo)
- Si Calendar entra en tiempo: usar Scheduler Adapter skeleton -> Google Calendar

## 3) Cuentas y credenciales necesarias (exacto)

### Meta / WhatsApp
- Meta Developer account
- App en Meta for Developers
- WhatsApp Business Account (WABA)
- Phone Number ID (numero de prueba)
- Business Account ID
- Temporary token (dev) / System User token (recomendado)
- Webhook verify token (definido por nosotros)
- App secret (para validar firma)

### n8n
- Instancia n8n (cloud o self-host)
- URL publica HTTPS del webhook
- Credencial HTTP para Meta Graph API
- Variables de entorno seguras (no hardcode)

### OpenAI
- API key
- Modelo para clasificacion/respuesta corta (costo bajo)

### Google
- Proyecto GCP
- Service account con:
  - Google Sheets API habilitada
  - Google Calendar API habilitada (si se usa en fase)
- Sheet ID del lead tracker
- Calendar ID (si aplica)

### Operacion
- Canal de alertas (Slack/WhatsApp interno/email)
- Persona de fallback humano para urgencias

## 4) Plan tecnico 2-3 dias

### Dia 1 - Canal real operativo
- Configurar WABA Cloud API + numero prueba.
- Exponer webhook n8n publico y validar firma.
- Flujo inbound/outbound minimo funcionando.
- Dedupe por `wamid` y logging basico.

Criterio dia 1:
- Mensaje real recibido en WhatsApp genera respuesta automatica simple.

### Dia 2 - Intenciones + captura + Sheets
- Implementar intent router para 4 intenciones:
  - consultar precios
  - agendar limpieza
  - reprogramar cita
  - urgencia dental
- Capturar `nombre`, `motivo`, `horario preferido`, `telefono`.
- Guardar lead en Google Sheets (upsert por telefono + fecha).

Criterio dia 2:
- Conversacion completa con captura de datos queda registrada en Sheets.

### Dia 3 - Agenda viable + hardening demo
- Opcion A (preferida): conectar Scheduler Adapter a Calendar.
- Opcion B (fallback): mantener horarios mock robustos.
- Reintentos basicos, mensajes de error amigables, runbook corto.

Criterio dia 3:
- Flujo agendar/reprogramar demo estable end-to-end con evidencia.

## 5) Costos aproximados y riesgos

## Costos (rango MVP)
- Meta WhatsApp Cloud API: variable por conversaciones y categoria.
- n8n: USD 0-25/mes segun cloud/self-host.
- OpenAI API: USD 5-40/mes para volumen demo bajo.
- Google Sheets/Calendar: usualmente sin costo en volumen bajo (sujeto a cuota).
- Twilio fallback (si se usa): costo por mensaje/conversacion mayor que Cloud API.

Nota: validar pricing vigente en consolas de Meta/Twilio/OpenAI antes de activar produccion.

## Riesgos y bloqueos esperados
- Aprobacion/estado de numero y configuracion Meta puede retrasar demo.
- Error de firma webhook o token expirado.
- Extraccion incompleta de datos por mensajes ambiguos.
- Reprogramacion sin identificador de cita claro.
- Limites de cuota o latencia de APIs.

Mitigaciones:
- Fallback a Twilio sandbox si Meta bloquea tiempo.
- Fallback humano en urgencia o baja confianza.
- Mensajes guiados para forzar captura estructurada.

## 6) Primer backlog tecnico (construccion)

1. `MVP-01` Configurar Meta Cloud API + numero prueba + webhook verificado.
2. `MVP-02` Implementar workflow n8n inbound/outbound con dedupe por `wamid`.
3. `MVP-03` Implementar intent router (4 intenciones) con OpenAI y prompts MVP.
4. `MVP-04` Implementar captura de datos obligatorios y validaciones minimas.
5. `MVP-05` Integrar persistencia en Google Sheets (upsert + estado lead).
6. `MVP-06` Integrar agenda:
   - A: Scheduler Adapter + Calendar (si entra en ventana)
   - B: slots mock (fallback)
7. `MVP-07` Pruebas E2E con numero real y evidencia (capturas + logs).
8. `MVP-08` Runbook corto de operacion y checklist demo.

## Definicion de terminado (MVP demo)
- Una persona escribe por WhatsApp al numero de prueba.
- DentalBot responde automaticamente.
- Clasifica en una de 4 intenciones MVP.
- Captura 4 campos clave y guarda lead en Sheets.
- Puede proponer/agendar en mock o Calendar.
- Flujo de urgencia deriva correctamente.
