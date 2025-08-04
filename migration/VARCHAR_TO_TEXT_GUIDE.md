# 🔧 Guía: Migración VARCHAR → TEXT

## 📋 Resumen

PostgreSQL/Supabase recomienda usar `text` en lugar de `varchar` a menos que tengas un caso de uso muy específico.

**Referencia:** [PostgreSQL Wiki - Don't Do This](https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_varchar.28n.29_by_default)

---

## 🎯 **CAMBIOS REALIZADOS**

### **✅ Cambiados a `text`:**

```sql
-- WORKSPACES
name: VARCHAR(255) → text
domain: VARCHAR(255) → text

-- USERS
email: VARCHAR(255) → text
clerk_user_id: VARCHAR(255) → text
first_name: VARCHAR(100) → text
last_name: VARCHAR(100) → text

-- CONTACTS
phone: VARCHAR(50) → text
name: VARCHAR(255) → text
email: VARCHAR(255) → text
country: VARCHAR(10) → text

-- CONVERSATIONS
assigned_to: VARCHAR(100) → text
```

### **🎯 FILOSOFÍA: TODO A `text` (Simplicidad):**

```sql
-- TODOS los campos de texto ahora son `text`
workspace_users.role: text CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
contacts_new.status: text CHECK (status IN ('Lead', 'Client', 'Prospect'))
conversations_new.status: text CHECK (status IN ('open', 'closed', 'closed_timeout', 'closed_human'))
messages_new.role: text CHECK (role IN ('user', 'assistant'))
messages_new.sender_type: text CHECK (sender_type IN ('ai', 'human', 'contact'))
workspaces.slug: text

-- ✅ Los CHECK constraints siguen proporcionando validación
-- ✅ Sin límites arbitrarios que recordar
-- ✅ Regla simple: "Siempre usar text"
```

---

## 🚀 **CÓMO APLICAR LA MIGRACIÓN**

### **Opción 1: En Tablas Existentes (Producción)**

```sql
-- Ejecutar en Supabase SQL Editor
\i migration/fix_varchar_to_text.sql
```

### **Opción 2: En Nuevas Instalaciones**

```sql
-- Usar el esquema actualizado
\i migration/new_schema.sql
```

---

## 📊 **VENTAJAS DEL CAMBIO**

### **🔄 Antes (VARCHAR):**

```sql
name VARCHAR(255) -- ❌ Límite arbitrario
email VARCHAR(255) -- ❌ ¿Qué pasa si el email es más largo?
```

### **✅ Después (TEXT):**

```sql
name text -- ✅ Sin límite artificial
email text -- ✅ Puede manejar cualquier email
```

### **📈 Beneficios:**

1. **🎯 Sin límites artificiales:** Nombres muy largos, emails corporativos extensos
2. **🚀 Mejor rendimiento:** PostgreSQL optimiza `text` mejor que `varchar`
3. **🔧 Menos mantenimiento:** No necesitas cambiar límites en el futuro
4. **📱 Compatibilidad:** Mejor soporte para caracteres internacionales

---

## 🆚 **CUÁNDO USAR CADA UNO**

### **✅ Usar `text`:**

- Nombres, emails, teléfonos
- Direcciones, descripciones
- URLs largas
- Cualquier campo de texto libre

### **✅ Usar `VARCHAR(n)` solamente para:**

- Campos con CHECK constraints (roles, estados)
- Códigos con longitud fija (ISBN, códigos postales)
- Slugs/URLs cortas por consistencia
- Cuando necesites validación explícita de longitud

---

## 🔍 **VERIFICACIÓN POST-MIGRACIÓN**

### **Consulta para verificar tipos:**

```sql
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    check_clause
FROM information_schema.columns
LEFT JOIN information_schema.check_constraints cc ON cc.constraint_name LIKE '%' || column_name || '%'
WHERE table_schema = 'public'
    AND table_name IN ('workspaces', 'users_new', 'contacts_new', 'conversations_new', 'messages_new')
    AND data_type IN ('text', 'character varying')
ORDER BY table_name, column_name;
```

### **Resultado esperado:**

```
table_name     | column_name    | data_type          | length | check_clause
---------------|----------------|-------------------|--------|-------------
workspaces     | domain         | text              | null   | null
workspaces     | name           | text              | null   | null
workspaces     | slug           | character varying | 100    | null
users_new      | email          | text              | null   | null
users_new      | clerk_user_id  | text              | null   | null
contacts_new   | name           | text              | null   | null
contacts_new   | status         | character varying | 50     | CHECK (status IN (...))
```

---

## 🎯 **CHECKLIST DE MIGRACIÓN**

- [ ] ✅ Esquema `new_schema.sql` actualizado
- [ ] ✅ Script de migración `fix_varchar_to_text.sql` creado
- [ ] ⏳ Migración aplicada en Supabase
- [ ] ⏳ Verificación de tipos ejecutada
- [ ] ⏳ Tests de funcionalidad completados
- [ ] ⏳ Documentación actualizada

---

## 📚 **REFERENCIAS**

- [PostgreSQL Documentation - Character Types](https://www.postgresql.org/docs/current/datatype-character.html)
- [Supabase Best Practices](https://supabase.com/docs/guides/database/postgres-best-practices)
- [PostgreSQL Wiki - Don't Do This](https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_varchar.28n.29_by_default)

**¡Migración completada siguiendo las mejores prácticas de PostgreSQL!** 🎉
