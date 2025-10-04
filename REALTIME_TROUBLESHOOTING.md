# 🔧 Troubleshooting Supabase Realtime - Calls Page

## ❌ Problema

Los logs muestran: `📡 Realtime update received: undefined 3020`

Esto indica que el evento está llegando pero sin `eventType`.

---

## ✅ Solución Implementada

### 1. Corrección del código

He actualizado el código para:

- Usar `payload.eventType` (es el campo correcto en Supabase Realtime v2)
- Agregar logs detallados para debugging
- Manejar correctamente INSERT, UPDATE y DELETE

### 2. Verificar Realtime en Supabase

#### **Paso 1: Habilitar Realtime en la tabla `calls`**

1. Ve a **Supabase Dashboard** → Tu proyecto
2. Ve a **Database** → **Replication**
3. Busca la tabla `calls`
4. **Habilita todas las opciones**:
   - ✅ **Insert**: Para detectar nuevos registros
   - ✅ **Update**: Para detectar cambios
   - ✅ **Delete**: Para detectar eliminaciones

#### **Paso 2: Verificar Row Level Security (RLS)**

El RLS debe permitir que los usuarios vean los registros de su workspace:

```sql
-- Política para SELECT (leer)
CREATE POLICY "Users can view calls from their workspace"
ON calls
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM users_new
    WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Política para realtime (importante!)
-- Supabase necesita esta política para enviar eventos realtime
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
```

#### **Paso 3: Verificar que Realtime esté publicando la tabla**

En el SQL Editor de Supabase, ejecuta:

```sql
-- Ver qué tablas están publicando eventos realtime
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

Si `calls` NO aparece en la lista, ejecuta:

```sql
-- Agregar la tabla calls a la publicación realtime
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
```

---

## 🧪 Cómo Probar

### 1. Verificar en Console del Navegador

Abre la página de Calls y busca en console:

```
🔌 Setting up realtime subscription for calls in workspace: 5
📡 Realtime subscription status: SUBSCRIBED
```

Si no ves `SUBSCRIBED`, hay un problema con la conexión.

### 2. Insertar un Registro de Prueba

En Supabase SQL Editor:

```sql
INSERT INTO calls (
  workspace_id,
  phone_from,
  phone_to,
  status,
  interest,
  type,
  created_at,
  updated_at
) VALUES (
  5,  -- Tu workspace_id
  '+34123456789',
  '+34987654321',
  'lead',
  'energy',
  'inbound',
  NOW(),
  NOW()
);
```

Deberías ver en console:

```
📡 Realtime payload received (full): {...}
📡 Event type: INSERT
📡 Row data: {...}
📡 Realtime update received: INSERT ID: 3021
✅ New call received, adding to list: {...}
```

### 3. Actualizar un Registro Existente

```sql
UPDATE calls
SET status = 'mql'
WHERE id = 3020 AND workspace_id = 5;
```

Deberías ver en console:

```
📡 Event type: UPDATE
✅ Call updated in list: {...}
```

---

## 🔍 Debugging Adicional

### Si no llegan eventos:

1. **Verificar que Supabase Realtime esté habilitado en tu proyecto**

   - Dashboard → Project Settings → API
   - Debe estar "Realtime: Enabled"

2. **Verificar las credenciales en .env**

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```

3. **Verificar en Supabase Logs**

   - Dashboard → Logs → Realtime
   - Busca errores o eventos que no se están enviando

4. **Probar con una suscripción simple**

   En console del navegador:

   ```javascript
   const { createClient } = require("@supabase/supabase-js");
   const supabase = createClient("https://xxx.supabase.co", "eyJhbGc...");

   const channel = supabase
     .channel("test")
     .on(
       "postgres_changes",
       {
         event: "*",
         schema: "public",
         table: "calls",
         filter: "workspace_id=eq.5",
       },
       (payload) => {
         console.log("TEST EVENT:", payload);
       }
     )
     .subscribe((status) => {
       console.log("TEST STATUS:", status);
     });
   ```

---

## 📝 Notas Importantes

1. **Latencia**: Los eventos realtime pueden tardar 1-2 segundos en llegar
2. **Filtros**: El filtro `workspace_id=eq.5` se aplica a nivel de base de datos
3. **RLS**: Las políticas de RLS también afectan a realtime
4. **Límites**: Supabase tiene límites de conexiones realtime en el plan free

---

## ✅ Checklist de Verificación

- [ ] Realtime habilitado en tabla `calls` (Insert, Update, Delete)
- [ ] RLS configurado correctamente
- [ ] Tabla `calls` en la publicación `supabase_realtime`
- [ ] Variables de entorno correctas
- [ ] Console muestra "SUBSCRIBED"
- [ ] Logs detallados en console al insertar/actualizar

---

## 🆘 Si Sigue Sin Funcionar

1. Compartir los logs completos de console
2. Verificar el plan de Supabase (algunos planes tienen limitaciones)
3. Revisar si hay errores en Supabase Dashboard → Logs
4. Verificar que el `workspace_id` sea correcto (debe ser 5 en tu caso)
