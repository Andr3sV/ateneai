# Social Connections Environment Variables

## Variables de Entorno Requeridas

Agregar estas variables a tu archivo `.env`:

```bash
# ===================================================
# SOCIAL CONNECTIONS CONFIGURATION
# ===================================================

# Meta (Facebook/Instagram) App Configuration
# Obtener desde https://developers.facebook.com/apps/
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here

# Webhooks Configuration
FACEBOOK_WEBHOOK_VERIFY_TOKEN=your_facebook_webhook_verify_token_here
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=your_instagram_webhook_verify_token_here

# Encryption Configuration
# Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_32_byte_encryption_key_here

# URLs Configuration (ya deberías tenerlas)
BACKEND_URL=https://your-backend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

## Configuración Paso a Paso

### 1. Crear App de Meta

- Ve a https://developers.facebook.com/apps/
- Crea una nueva app de tipo "Business"
- Agrega los productos "Facebook Login" e "Instagram API"

### 2. Configurar Facebook Login

- **Redirect URIs**: `https://your-backend-domain.com/api/v2/social-connections/facebook/callback`
- **Scopes**: `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`, `pages_show_list`

### 3. Configurar Instagram API

- **Redirect URIs**: `https://your-backend-domain.com/api/v2/social-connections/instagram/callback`
- **Scopes**: `instagram_basic`, `instagram_manage_messages`, `instagram_manage_insights`

### 4. Configurar Webhooks

- **Facebook Webhook URL**: `https://your-backend-domain.com/api/webhooks/facebook`
- **Instagram Webhook URL**: `https://your-backend-domain.com/api/webhooks/instagram`
- **Verify Token**: Generar token aleatorio seguro

### 5. Permisos Requeridos

#### Facebook:

- `pages_messaging`: Para recibir y enviar mensajes
- `pages_manage_metadata`: Para gestionar información de la página
- `pages_read_engagement`: Para leer engagement de la página
- `pages_show_list`: Para obtener lista de páginas del usuario

#### Instagram:

- `instagram_basic`: Información básica del perfil
- `instagram_manage_messages`: Gestionar mensajes directos
- `instagram_manage_insights`: Acceso a métricas

### 6. Configuración en Meta Business Manager

- Asegurar que las páginas estén vinculadas a la app
- Configurar roles de usuario apropiados
- Activar la app para producción

## Seguridad

- ✅ Todos los tokens se almacenan cifrados en la base de datos
- ✅ Se verifican las signatures de los webhooks
- ✅ Se utiliza HTTPS para todas las comunicaciones
- ✅ Los tokens se renuevan automáticamente antes de expirar
