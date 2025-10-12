# 📞 Call Manager API - Documentación para Simbiosia

## 🌐 URL del Servicio en Producción

```
https://call-manager-production.up.railway.app
```

**Base URL para API**: `https://call-manager-production.up.railway.app/api/batch-calling`

---

## 📡 Endpoints Disponibles

### 1. Disparar Batch de Llamadas

**POST** `/api/batch-calling/submit`

### 2. Cancelar Batch de Llamadas

**POST** `/api/batch-calling/:batchId/cancel`

### 3. Consultar Estado del Batch

**GET** `/api/batch-calling/:batchId`

### 4. Health Check

**GET** `/health`

---

## 🚀 1. Disparar Batch de Llamadas

### Endpoint

```
POST https://call-manager-production.up.railway.app/api/batch-calling/submit
```

### Headers

```
Content-Type: application/json
```

### Body (JSON)

```json
{
  "call_name": "Campaña Marketing Octubre 2025",
  "agent_id": "agent_2401k62pf0zdfbdbatjs81prh8ka",
  "agent_phone_number_id": "phnum_5501k6qntkmyfq69yfj3xs8rw4kh",
  "recipients": [
    {
      "phone_number": "+34631021622",
      "conversation_initiation_client_data": {
        "dynamic_variables": {
          "name": "Juan Pérez",
          "empresa": "Acme Corp",
          "producto": "Plan Premium"
        }
      }
    },
    {
      "phone_number": "+34612215815",
      "conversation_initiation_client_data": {
        "dynamic_variables": {
          "name": "María García",
          "empresa": "Tech Inc",
          "producto": "Plan Básico"
        }
      }
    }
  ],
  "phone_provider": "sip_trunk"
}
```

### Parámetros

| Campo                                                                | Tipo   | Requerido | Descripción                                        |
| -------------------------------------------------------------------- | ------ | --------- | -------------------------------------------------- |
| `call_name`                                                          | string | ✅        | Nombre descriptivo del batch                       |
| `agent_id`                                                           | string | ✅        | ID del agente de ElevenLabs                        |
| `agent_phone_number_id`                                              | string | ✅        | ID del número de teléfono                          |
| `recipients`                                                         | array  | ✅        | Lista de destinatarios (mínimo 1)                  |
| `recipients[].phone_number`                                          | string | ✅        | Número en formato E.164 (ej: +34631021622)         |
| `recipients[].conversation_initiation_client_data`                   | object | ❌        | Datos de la conversación                           |
| `recipients[].conversation_initiation_client_data.dynamic_variables` | object | ❌        | Variables personalizadas                           |
| `scheduled_time_unix`                                                | number | ❌        | Timestamp Unix para programar (omitir = inmediato) |
| `phone_provider`                                                     | string | ❌        | "twilio" o "sip_trunk"                             |

### Response Exitoso (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "btcal_7601k6qjf6dgecgbc9hkq9gtw977",
    "phone_number_id": "phnum_5501k6qntkmyfq69yfj3xs8rw4kh",
    "phone_provider": "sip_trunk",
    "name": "Campaña Marketing Octubre 2025",
    "agent_id": "agent_2401k62pf0zdfbdbatjs81prh8ka",
    "created_at_unix": 1759580232,
    "scheduled_time_unix": 1759580232,
    "total_calls_dispatched": 0,
    "total_calls_scheduled": 2,
    "last_updated_at_unix": 1759580232,
    "status": "pending",
    "agent_name": "Mi Agente"
  }
}
```

**⚠️ IMPORTANTE**: Guarda el `id` del batch para consultas posteriores.

### Ejemplo en TypeScript/JavaScript

```typescript
import axios from "axios";

const BASE_URL =
  "https://call-manager-production.up.railway.app/api/batch-calling";

async function dispararLlamadas(contactos) {
  try {
    const response = await axios.post(`${BASE_URL}/submit`, {
      call_name: `Campaña ${new Date().toLocaleDateString()}`,
      agent_id: "agent_2401k62pf0zdfbdbatjs81prh8ka",
      agent_phone_number_id: "phnum_5501k6qntkmyfq69yfj3xs8rw4kh",
      recipients: contactos.map((contacto) => ({
        phone_number: contacto.telefono,
        conversation_initiation_client_data: {
          dynamic_variables: {
            name: contacto.nombre,
            empresa: contacto.empresa,
            // Agregar más variables según necesites
          },
        },
      })),
      phone_provider: "sip_trunk",
    });

    // Guardar el batch ID en tu base de datos
    const batchId = response.data.data.id;
    console.log("Batch creado:", batchId);

    return {
      success: true,
      batchId: batchId,
      totalLlamadas: response.data.data.total_calls_scheduled,
    };
  } catch (error) {
    console.error(
      "Error al disparar llamadas:",
      error.response?.data || error.message
    );
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}
```

### Ejemplo en Python

```python
import requests

BASE_URL = "https://call-manager-production.up.railway.app/api/batch-calling"

def disparar_llamadas(contactos):
    payload = {
        "call_name": "Campaña desde Simbiosia",
        "agent_id": "agent_2401k62pf0zdfbdbatjs81prh8ka",
        "agent_phone_number_id": "phnum_5501k6qntkmyfq69yfj3xs8rw4kh",
        "recipients": [
            {
                "phone_number": contacto["telefono"],
                "conversation_initiation_client_data": {
                    "dynamic_variables": {
                        "name": contacto["nombre"],
                        "empresa": contacto["empresa"]
                    }
                }
            }
            for contacto in contactos
        ],
        "phone_provider": "sip_trunk"
    }

    response = requests.post(f"{BASE_URL}/submit", json=payload)

    if response.status_code == 200:
        data = response.json()
        return {
            "success": True,
            "batch_id": data["data"]["id"],
            "total_llamadas": data["data"]["total_calls_scheduled"]
        }
    else:
        return {
            "success": False,
            "error": response.json()
        }
```

---

## 🛑 2. Cancelar Batch de Llamadas

### Endpoint

```
POST https://call-manager-production.up.railway.app/api/batch-calling/:batchId/cancel
```

### Ejemplo

```bash
POST https://call-manager-production.up.railway.app/api/batch-calling/btcal_7601k6qjf6dgecgbc9hkq9gtw977/cancel
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "btcal_7601k6qjf6dgecgbc9hkq9gtw977",
    "status": "cancelled",
    "total_calls_dispatched": 5,
    "total_calls_scheduled": 10,
    ...
  }
}
```

### Ejemplo en TypeScript

```typescript
async function cancelarBatch(batchId: string) {
  try {
    const response = await axios.post(`${BASE_URL}/${batchId}/cancel`);

    return {
      success: true,
      status: response.data.data.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}
```

---

## 📊 3. Consultar Estado del Batch

### Endpoint

```
GET https://call-manager-production.up.railway.app/api/batch-calling/:batchId
```

### Ejemplo

```bash
GET https://call-manager-production.up.railway.app/api/batch-calling/btcal_7601k6qjf6dgecgbc9hkq9gtw977
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "btcal_7601k6qjf6dgecgbc9hkq9gtw977",
    "phone_number_id": "phnum_5501k6qntkmyfq69yfj3xs8rw4kh",
    "name": "Campaña Marketing",
    "agent_id": "agent_2401k62pf0zdfbdbatjs81prh8ka",
    "status": "in_progress",
    "total_calls_dispatched": 2,
    "total_calls_scheduled": 2,
    "recipients": [
      {
        "id": "recipient_1",
        "phone_number": "+34631021622",
        "status": "completed",
        "conversation_id": "conv_abc123"
      },
      {
        "id": "recipient_2",
        "phone_number": "+34612215815",
        "status": "in_progress",
        "conversation_id": "conv_def456"
      }
    ]
  }
}
```

### Estados del Batch

| Estado        | Descripción                    |
| ------------- | ------------------------------ |
| `pending`     | Programado, no iniciado        |
| `in_progress` | En ejecución                   |
| `completed`   | Todas las llamadas completadas |
| `failed`      | El batch falló                 |
| `cancelled`   | Cancelado manualmente          |

### Estados de cada Recipient

| Estado        | Descripción                |
| ------------- | -------------------------- |
| `pending`     | No iniciado                |
| `in_progress` | Llamando o en conversación |
| `completed`   | Llamada completada         |
| `failed`      | Llamada falló              |
| `cancelled`   | Llamada cancelada          |

### Ejemplo en TypeScript

```typescript
async function consultarBatch(batchId: string) {
  try {
    const response = await axios.get(`${BASE_URL}/${batchId}`);

    const batch = response.data.data;

    return {
      success: true,
      status: batch.status,
      totalLlamadas: batch.total_calls_scheduled,
      llamadasCompletadas: batch.recipients.filter(
        (r) => r.status === "completed"
      ).length,
      llamadasEnProgreso: batch.recipients.filter(
        (r) => r.status === "in_progress"
      ).length,
      recipients: batch.recipients,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}
```

---

## ❌ Manejo de Errores

### Error de Validación (400)

```json
{
  "success": false,
  "errors": [
    {
      "type": "field",
      "msg": "call_name es requerido",
      "path": "call_name",
      "location": "body"
    }
  ]
}
```

### Error del Servidor (500)

```json
{
  "success": false,
  "error": "Error al disparar batch de llamadas: Invalid API key"
}
```

### Ejemplo de Manejo en TypeScript

```typescript
async function dispararLlamadasConManejo(contactos) {
  try {
    const response = await axios.post(`${BASE_URL}/submit`, { ... });
    return response.data;

  } catch (error) {
    if (error.response) {
      // Error de la API
      if (error.response.status === 400) {
        console.error('Error de validación:', error.response.data.errors);
      } else if (error.response.status === 500) {
        console.error('Error del servidor:', error.response.data.error);
      }
    } else if (error.request) {
      // No hubo respuesta
      console.error('No se recibió respuesta del servidor');
    } else {
      // Error al configurar el request
      console.error('Error:', error.message);
    }

    throw error;
  }
}
```

---

## 🔄 Flujo Completo de Uso

### Caso de Uso: Campaña de Llamadas

```typescript
import axios from "axios";

const BASE_URL =
  "https://call-manager-production.up.railway.app/api/batch-calling";

class CallManagerService {
  // 1. Disparar campaña
  async iniciarCampana(contactos) {
    const response = await axios.post(`${BASE_URL}/submit`, {
      call_name: "Campaña Q4 2025",
      agent_id: "agent_2401k62pf0zdfbdbatjs81prh8ka",
      agent_phone_number_id: "phnum_5501k6qntkmyfq69yfj3xs8rw4kh",
      recipients: contactos.map((c) => ({
        phone_number: c.telefono,
        conversation_initiation_client_data: {
          dynamic_variables: {
            name: c.nombre,
            empresa: c.empresa,
          },
        },
      })),
      phone_provider: "sip_trunk",
    });

    // Guardar en tu base de datos
    const batchId = response.data.data.id;
    await this.guardarBatchEnDB(batchId, response.data.data);

    return batchId;
  }

  // 2. Monitorear progreso
  async monitorearBatch(batchId) {
    const response = await axios.get(`${BASE_URL}/${batchId}`);
    const batch = response.data.data;

    // Actualizar en tu base de datos
    await this.actualizarBatchEnDB(batchId, batch);

    return {
      status: batch.status,
      progreso: {
        total: batch.total_calls_scheduled,
        completadas: batch.recipients.filter((r) => r.status === "completed")
          .length,
        enProgreso: batch.recipients.filter((r) => r.status === "in_progress")
          .length,
        fallidas: batch.recipients.filter((r) => r.status === "failed").length,
      },
    };
  }

  // 3. Cancelar si es necesario
  async cancelarCampana(batchId) {
    const response = await axios.post(`${BASE_URL}/${batchId}/cancel`);
    await this.actualizarBatchEnDB(batchId, { status: "cancelled" });
    return response.data.data;
  }

  // Helpers para tu base de datos
  async guardarBatchEnDB(batchId, data) {
    // Tu lógica para guardar en Simbiosia
  }

  async actualizarBatchEnDB(batchId, data) {
    // Tu lógica para actualizar en Simbiosia
  }
}
```

---

## 🧪 Testing

### Health Check

```bash
curl https://call-manager-production.up.railway.app/health
```

### Disparar llamada de prueba

```bash
curl -X POST https://call-manager-production.up.railway.app/api/batch-calling/submit \
  -H "Content-Type: application/json" \
  -d '{
    "call_name": "Prueba desde Simbiosia",
    "agent_id": "agent_2401k62pf0zdfbdbatjs81prh8ka",
    "agent_phone_number_id": "phnum_5501k6qntkmyfq69yfj3xs8rw4kh",
    "recipients": [
      {
        "phone_number": "+34631021622",
        "conversation_initiation_client_data": {
          "dynamic_variables": {
            "name": "Test"
          }
        }
      }
    ],
    "phone_provider": "sip_trunk"
  }'
```

---

## ⚙️ Configuración en Simbiosia

### Variables de Entorno Recomendadas

```bash
# En tu .env de Simbiosia
CALL_MANAGER_URL=https://call-manager-production.up.railway.app/api/batch-calling
ELEVENLABS_AGENT_ID=agent_2401k62pf0zdfbdbatjs81prh8ka
ELEVENLABS_PHONE_ID=phnum_5501k6qntkmyfq69yfj3xs8rw4kh
```

### Uso en Código

```typescript
const callManagerUrl = process.env.CALL_MANAGER_URL;
const agentId = process.env.ELEVENLABS_AGENT_ID;
const phoneId = process.env.ELEVENLABS_PHONE_ID;
```

---

## 📝 Notas Importantes

### ✅ Dynamic Variables

- Las variables dinámicas **deben ir dentro** de `conversation_initiation_client_data`
- Son **opcionales** - puedes hacer llamadas sin ellas
- Si las usas, asegúrate de que tu agente en ElevenLabs esté configurado para recibirlas

### ✅ Formato de Números

- Siempre en formato E.164: `+34631021622` (con `+` y código de país)
- Sin espacios, guiones ni paréntesis

### ✅ Provider

- `sip_trunk`: Recomendado para producción
- `twilio`: Alternativa si prefieres

### ✅ Límites y Rendimiento

- El servicio puede manejar cientos de llamadas simultáneas
- No hay límite de recipients por batch
- Railway escala automáticamente según demanda

---

## 🆘 Soporte

**Servicio funcionando 24/7 en Railway**

Si tienes problemas:

1. Verifica el health check: `https://call-manager-production.up.railway.app/health`
2. Revisa los logs en Railway dashboard
3. Verifica que tus agent_id y phone_number_id sean correctos

---

## 📚 Recursos Adicionales

- **Repositorio**: https://github.com/Andr3sV/call-manager
- **Railway Dashboard**: https://railway.app (para ver logs y métricas)
- **Documentación ElevenLabs**: https://elevenlabs.io/docs

---

**✅ El servicio está listo para producción y completamente funcional.**

Integra estos endpoints en Simbiosia y podrás disparar, cancelar y monitorear llamadas con ElevenLabs. 🚀