# Gestión de Agentes de ElevenLabs

## 📋 Resumen

Se ha implementado la funcionalidad completa para gestionar los agentes de ElevenLabs directamente desde la plataforma. Los usuarios ahora pueden ver y actualizar los detalles de configuración de los agentes (first message y prompt) mediante un modal interactivo.

## 🎯 Características Implementadas

### Backend

1. **Servicio de ElevenLabs** (`backend/src/services/elevenlabs.ts`)

   - `getElevenLabsAgent(agentId)`: Obtiene los detalles de un agente desde la API de ElevenLabs
   - `updateElevenLabsAgent(agentId, updates)`: Actualiza el first message y prompt de un agente

2. **Endpoints REST** (`backend/src/routes/agents-workspace.ts`)
   - `GET /api/agents/:id/elevenlabs`: Obtiene los detalles del agente de ElevenLabs
   - `PATCH /api/agents/:id/elevenlabs`: Actualiza el agente de ElevenLabs

### Frontend

1. **AgentModal** (`frontend/src/components/agent-modal.tsx`)

   - Modal tipo Sheet (similar al de campaigns)
   - Muestra información del agente
   - Campos editables para first message y prompt
   - Botón X para cerrar en la esquina superior derecha
   - Alertas de éxito/error
   - Estados de carga y guardado

2. **Integración en Agents Page** (`frontend/src/app/calls/agents/page.tsx`)
   - Click en cualquier fila abre el modal
   - Cursor pointer para indicar interactividad

## 🔧 Configuración Requerida

### 1. Agregar la API Key de ElevenLabs

Necesitas agregar la clave de API de ElevenLabs en tu archivo de variables de entorno del backend:

#### Desarrollo Local

Crea o edita el archivo `backend/.env.local`:

```bash
ELEVENLABS_API_KEY=tu_api_key_de_elevenlabs
```

#### Producción (Railway)

Agrega la variable de entorno en tu panel de Railway:

1. Ve a tu proyecto en Railway
2. Selecciona el servicio del backend
3. Ve a la pestaña "Variables"
4. Agrega: `ELEVENLABS_API_KEY` con tu API key

### 2. Obtener tu API Key de ElevenLabs

1. Ve a [ElevenLabs Dashboard](https://elevenlabs.io/app/settings/api-keys)
2. Copia tu API key
3. Agrégala a las variables de entorno como se explicó arriba

## 📖 Uso

### Para Usuarios

1. **Acceder a la sección de Agents**

   - Navega a: Calls > Agents

2. **Abrir el modal de un agente**

   - Haz clic en cualquier fila de la tabla de agentes

3. **Ver detalles del agente**

   - El modal mostrará:
     - Nombre del agente
     - ID de ElevenLabs
     - First Message actual
     - Prompt actual

4. **Editar configuración**

   - Modifica el texto en los campos de:
     - **First Message**: Mensaje inicial que dirá el agente
     - **Prompt**: Instrucciones del sistema que definen el comportamiento del agente
   - Haz clic en "Save Changes"

5. **Confirmación**
   - Verás un mensaje de éxito
   - El modal se cerrará automáticamente después de 2 segundos

### Manejo de Errores

El sistema maneja varios casos de error:

- Agente sin `external_id` configurado
- API key no configurada
- Errores de la API de ElevenLabs
- Problemas de red

Todos los errores se muestran claramente al usuario mediante alertas.

## 🔍 Detalles Técnicos

### Flujo de Datos

1. Usuario hace clic en un agente
2. Frontend obtiene el `agent.id` de la base de datos local
3. Backend usa el `external_id` del agente para consultar ElevenLabs
4. Se muestran los datos en el modal
5. Usuario edita y guarda
6. Backend envía PATCH a ElevenLabs
7. ElevenLabs actualiza la configuración del agente

### Relación entre IDs

- `agent.id`: ID interno en la base de datos de Supabase
- `agent.external_id`: ID del agente en ElevenLabs (usado para las llamadas API)

### Estructura de la API de ElevenLabs

```typescript
// GET /v1/convai/agents/:agent_id
{
  agent_id: string,
  name: string,
  conversation_config: {
    agent: {
      first_message: string,
      prompt: {
        prompt: string
      }
    }
  }
}

// PATCH /v1/convai/agents/:agent_id
{
  conversation_config: {
    agent: {
      first_message?: string,
      prompt?: {
        prompt: string
      }
    }
  }
}
```

## 🧪 Testing

### Pruebas Recomendadas

1. **Sin API Key configurada**

   - El backend debería mostrar un warning en los logs
   - El usuario debería ver un error claro en el modal

2. **Agente sin external_id**

   - El modal debería mostrar un error indicando que el agente no tiene ID de ElevenLabs

3. **Actualización exitosa**

   - Los cambios deberían guardarse en ElevenLabs
   - El modal debería cerrarse automáticamente

4. **Errores de red**
   - Deberían mostrarse mensajes de error apropiados

## 📚 Referencias

- [Documentación API ElevenLabs - Get Agent](https://elevenlabs.io/docs/agents-platform/api-reference/agents/get)
- [Documentación API ElevenLabs - Update Agent](https://elevenlabs.io/docs/agents-platform/api-reference/agents/update)

## 🚀 Próximos Pasos (Opcional)

Posibles mejoras futuras:

1. **Más campos editables**

   - Voz del agente
   - Idioma
   - Configuración de LLM
   - Tools del agente

2. **Preview de cambios**

   - Mostrar un diff antes de guardar

3. **Historial de cambios**

   - Guardar registro de modificaciones en la base de datos

4. **Testing de agentes**

   - Probar el agente directamente desde el modal

5. **Sincronización automática**
   - Mantener los datos del agente sincronizados con ElevenLabs
