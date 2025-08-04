# Social Connections Implementation Guide

## 🎯 Resumen de la Implementación

Se ha creado una sección completa de **Social Connections** que permite a los clientes conectar sus cuentas de Facebook e Instagram para centralizar la gestión de mensajes.

## 📁 Archivos Creados

### Frontend

- `src/app/social-connections/page.tsx` - Página principal con UI/UX inspirada en Attio
- `src/components/app-sidebar.tsx` - Actualizado con nueva sección

### Backend

- `src/routes/social-connections-workspace.ts` - Controlador OAuth y gestión de conexiones
- `src/routes/webhooks-social.ts` - Webhooks para mensajes de Facebook/Instagram
- `src/services/social-connections.ts` - Lógica de negocio y cifrado de tokens
- `src/validators/social-connections.ts` - Validaciones con Zod

### Base de Datos

- `migration/social_connections_schema.sql` - Esquema completo con cifrado y RLS

### Documentación

- `backend/SOCIAL_CONNECTIONS_ENV.md` - Variables de entorno y configuración

## 🔐 Características de Seguridad

### Cifrado de Tokens

- ✅ **AES-256-GCM** para tokens de acceso
- ✅ **Almacenamiento seguro** en Supabase
- ✅ **Renovación automática** antes de expirar

### Verificación de Webhooks

- ✅ **HMAC SHA-256** para verificar signatures
- ✅ **Tokens de verificación** únicos por workspace
- ✅ **Validación de origen** Meta/Facebook

### Autenticación

- ✅ **OAuth 2.0** con Meta
- ✅ **CSRF Protection** con state parameter
- ✅ **Scoped Permissions** mínimos necesarios

## 🔧 Configuración Requerida

### 1. Variables de Entorno

```bash
# Meta App Configuration
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret

# Webhook Verification
FACEBOOK_WEBHOOK_VERIFY_TOKEN=random_secure_token
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=random_secure_token

# Encryption
ENCRYPTION_KEY=32_byte_random_key

# URLs
BACKEND_URL=https://your-backend.com
FRONTEND_URL=https://your-frontend.com
```

### 2. Meta Developer App Setup

1. **Crear App**: https://developers.facebook.com/apps/
2. **Productos**: Facebook Login + Instagram API
3. **Redirect URIs**:
   - Facebook: `{BACKEND_URL}/api/v2/social-connections/facebook/callback`
   - Instagram: `{BACKEND_URL}/api/v2/social-connections/instagram/callback`
4. **Webhooks**:
   - Facebook: `{BACKEND_URL}/api/webhooks/facebook`
   - Instagram: `{BACKEND_URL}/api/webhooks/instagram`

### 3. Permisos Requeridos

#### Facebook

- `pages_messaging` - Enviar/recibir mensajes
- `pages_manage_metadata` - Gestionar información de página
- `pages_read_engagement` - Leer engagement
- `pages_show_list` - Listar páginas del usuario

#### Instagram

- `instagram_basic` - Información básica
- `instagram_manage_messages` - Gestionar DMs
- `instagram_manage_insights` - Métricas y analytics

## 🎨 UI/UX Features

### Diseño Inspirado en Attio/Notion

- ✅ **Cards modulares** para cada plataforma
- ✅ **Estados visuales** (Conectado/Desconectado/Error)
- ✅ **Badges informativos** con iconografía
- ✅ **Acciones contextuales** (Conectar/Reautorizar/Desconectar)

### Estados de Conexión

- 🟢 **Conectado** - Token válido y activo
- 🔴 **Error** - Fallo en la conexión o permisos
- ⚠️ **Token Expirado** - Requiere reautorización
- ⚪ **Desconectado** - Sin conexión establecida

### Información Mostrada

- ✅ **Nombre de página/cuenta**
- ✅ **Fecha de conexión**
- ✅ **Permisos otorgados**
- ✅ **Estado de webhooks**
- ✅ **Última sincronización**

## 🔄 Flujo de Mensajes Entrantes

### 1. Webhook Recibido

```
Meta → /api/webhooks/{platform} → Verificación de signature
```

### 2. Procesamiento

```
1. Buscar conexión activa por page/account ID
2. Crear/actualizar contacto en contacts_new
3. Crear/actualizar conversación en conversations_new
4. Insertar mensaje en messages_new
5. Trigger para respuesta automática del chatbot
```

### 3. Base de Datos

```sql
-- Contacto creado/actualizado
contacts_new {
  workspace_id,
  name: "Facebook/Instagram User",
  phone: platform_user_id,
  status: "Lead",
  metadata: { platform, platform_data }
}

-- Mensaje insertado
messages_new {
  workspace_id,
  conversation_id,
  contact_id,
  content: message_text,
  sender_type: "contact",
  role: "user",
  metadata: { platform_message_id, platform }
}
```

## 🚨 Manejo de Errores

### Tipos de Error

- ❌ **OAuth Failed** - Error en autorización
- ❌ **Token Expired** - Token caducado
- ❌ **Missing Permissions** - Permisos insuficientes
- ❌ **Webhook Invalid** - Signature inválida
- ❌ **Rate Limited** - API limit alcanzado

### Logs y Monitoring

- ✅ **Event Logs** en `social_events_log`
- ✅ **Error Tracking** con contadores
- ✅ **Webhook Logs** para debugging
- ✅ **Token Refresh** automático

## 📊 Métricas y Analytics

### Eventos Tracked

- `oauth_success` - Autorización exitosa
- `oauth_error` - Error en OAuth
- `token_refreshed` - Token renovado
- `token_refresh_error` - Error renovando token
- `webhook_received` - Webhook procesado
- `platform_disconnected` - Plataforma desconectada

### Dashboard Metrics (Futuro)

- 📈 **Mensajes por plataforma**
- 📈 **Tasa de respuesta**
- 📈 **Errores de conexión**
- 📈 **Estado de tokens**

## 🔮 Próximos Pasos

### Funcionalidades Adicionales

1. **Envío de Mensajes** - Respuestas salientes vía API
2. **Templates de Mensajes** - Respuestas predefinidas
3. **Analytics Avanzados** - Métricas detalladas
4. **Multi-Page Support** - Múltiples páginas por usuario
5. **WhatsApp Business** - Integración adicional

### Optimizaciones

1. **Token Refresh** - Job automático
2. **Webhook Retry** - Reintentos en fallos
3. **Rate Limiting** - Control de APIs
4. **Caching** - Cache de conexiones activas

## 🛠️ Testing

### Test de OAuth

1. Ve a `/social-connections`
2. Click "Conectar Facebook"
3. Autoriza en Meta
4. Verifica redirección exitosa
5. Confirma estado "Conectado"

### Test de Webhooks

1. Envía mensaje a página/cuenta conectada
2. Verifica logs en `social_events_log`
3. Confirma creación de contacto
4. Confirma inserción de mensaje

Esta implementación proporciona una base sólida y segura para la integración con redes sociales, siguiendo las mejores prácticas de OAuth, cifrado y UX/UI moderno.
