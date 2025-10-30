# 📊 Mejoras en la Exportación de Excel - Calls

## 🔍 **Problema Identificado**

El export de Excel no incluía todas las columnas importantes de la tabla `calls`:

### ❌ **Columnas Faltantes:**

1. `services_count` - Contador de servicios
2. `workspace_id` - ID del workspace
3. `dinamic_variables` - Variables dinámicas (array)
4. `batch_call_id` - Relación con la campaña que generó la llamada
5. `updated_at` - Fecha de última actualización
6. IDs originales (`agent_id`, `contact_id`, `assigned_user_id`)

### ⚠️ **Problema con `assigned_user`:**

- ✅ El backend YA está trayendo correctamente el nombre del usuario asignado mediante JOIN
- ✅ El código usa `assigned_user:users_new(id, first_name, last_name, email)`
- ✅ No había problema real, solo faltaba incluir el `assigned_user_id` en el export

### ❌ **Problema con `campaign_id`:**

- La tabla `calls` NO tiene columna `campaign_id`
- **Solución:** Usar `batch_call_id` que relaciona la llamada con `batch_calls`

---

## ✅ **Solución Implementada**

### **1. Script SQL para Agregar Columnas Faltantes**

**Archivo:** `add_batch_call_id_to_calls.sql`

Este script agrega las columnas necesarias:

- ✅ `batch_call_id INTEGER` - Referencia a `batch_calls(id)`
- ✅ `services_count INTEGER` - Contador de servicios

**⚠️ IMPORTANTE: Ejecuta este script en Supabase antes de usar la nueva funcionalidad**

---

### **2. Frontend - Export de Excel Mejorado**

**Archivo:** `/frontend/src/app/calls/page.tsx`

#### **Nuevas Columnas en el CSV:**

```csv
ID, Workspace ID, Created At, Updated At, Phone From, Phone To, Status, Interest, Type,
Duration (seconds), Services Count, Agent ID, Agent Name, Contact ID, Contact Name,
Contact Phone, Assigned User ID, Assigned User Name, City, Postal Code,
Batch Call ID, Conversation ID, Dynamic Variables
```

#### **Total de Columnas:**

- **Antes:** 16 columnas
- **Ahora:** 23 columnas ✅

---

## 📋 **Detalles de las Columnas**

### **Columnas Básicas:**

| Columna        | Descripción                   | Fuente               |
| -------------- | ----------------------------- | -------------------- |
| `ID`           | ID único del call             | `calls.id`           |
| `Workspace ID` | ID del workspace              | `calls.workspace_id` |
| `Created At`   | Fecha de creación             | `calls.created_at`   |
| `Updated At`   | Fecha de última actualización | `calls.updated_at`   |

### **Columnas de Teléfono:**

| Columna      | Descripción    | Fuente             |
| ------------ | -------------- | ------------------ |
| `Phone From` | Número origen  | `calls.phone_from` |
| `Phone To`   | Número destino | `calls.phone_to`   |

### **Columnas de Estado:**

| Columna    | Descripción             | Fuente           |
| ---------- | ----------------------- | ---------------- |
| `Status`   | Estado del call         | `calls.status`   |
| `Interest` | Interés del call        | `calls.interest` |
| `Type`     | Tipo (inbound/outbound) | `calls.type`     |

### **Columnas de Métricas:**

| Columna              | Descripción           | Fuente                              |
| -------------------- | --------------------- | ----------------------------------- |
| `Duration (seconds)` | Duración en segundos  | `calls.duration`                    |
| `Services Count`     | Contador de servicios | `calls.services_count` ⬅️ **NUEVO** |

### **Columnas de Relaciones (IDs + Nombres):**

| Columna              | Descripción                 | Fuente                                    |
| -------------------- | --------------------------- | ----------------------------------------- |
| `Agent ID`           | ID del agente               | `calls.agent_id` ⬅️ **NUEVO**             |
| `Agent Name`         | Nombre del agente           | `agents.name` (JOIN)                      |
| `Contact ID`         | ID del contacto             | `calls.contact_id` ⬅️ **NUEVO**           |
| `Contact Name`       | Nombre del contacto         | `contacts_new.name` (JOIN)                |
| `Contact Phone`      | Teléfono del contacto       | `contacts_new.phone` (JOIN)               |
| `Assigned User ID`   | ID del usuario asignado     | `calls.assigned_user_id` ⬅️ **NUEVO**     |
| `Assigned User Name` | Nombre del usuario asignado | `users_new.first_name + last_name` (JOIN) |

### **Columnas de Ubicación:**

| Columna       | Descripción   | Fuente              |
| ------------- | ------------- | ------------------- |
| `City`        | Ciudad        | `calls.city`        |
| `Postal Code` | Código postal | `calls.postal_code` |

### **Columnas de Campaña:**

| Columna           | Descripción            | Fuente                             |
| ----------------- | ---------------------- | ---------------------------------- |
| `Batch Call ID`   | ID de la campaña/batch | `calls.batch_call_id` ⬅️ **NUEVO** |
| `Conversation ID` | ID de conversación     | `calls.conversation_id`            |

### **Columnas de Datos Dinámicos:**

| Columna             | Descripción                             | Fuente                                 |
| ------------------- | --------------------------------------- | -------------------------------------- |
| `Dynamic Variables` | Variables dinámicas (separadas por `;`) | `calls.dinamic_variables` ⬅️ **NUEVO** |

---

## 🎯 **Beneficios de las Nuevas Columnas**

### **1. `batch_call_id` - Rastreo de Campañas**

**Problema anterior:** No se podía saber de qué campaña provenía una llamada.

**Ahora:**

```
Batch Call ID: 123
```

✅ Permite identificar qué campaña generó cada llamada
✅ Puedes hacer análisis por campaña
✅ Puedes filtrar/agrupar llamadas por campaña en Excel

---

### **2. `services_count` - Métricas de Servicios**

**Uso:**

- Contar cuántos servicios se ofrecieron en la llamada
- Análisis de efectividad por cantidad de servicios

---

### **3. `dinamic_variables` - Variables Personalizadas**

**Ejemplo:**

```
Dynamic Variables: budget; callback; priority
```

✅ Exporta todas las variables dinámicas de la llamada
✅ Formato legible (separadas por `;`)
✅ Permite análisis de variables custom

---

### **4. IDs Originales (`agent_id`, `contact_id`, `assigned_user_id`)**

**Beneficio:**

- Puedes hacer **VLOOKUPs** en Excel con otras tablas
- Útil para análisis avanzados
- Permite relacionar datos entre diferentes exports

**Ejemplo en Excel:**

```excel
=VLOOKUP([@[Agent ID]], Agents!A:B, 2, FALSE)
```

---

### **5. `workspace_id` - Multi-tenant**

**Uso:**

- Si exportas datos de múltiples workspaces
- Permite filtrar/agrupar por workspace
- Útil para análisis consolidados

---

## 🧪 **Cómo Probar**

### **1. Ejecutar Script SQL** (REQUERIDO)

```sql
-- En Supabase SQL Editor, ejecuta:
-- Contenido de add_batch_call_id_to_calls.sql
```

### **2. Exportar Datos**

1. Ve a `/calls`
2. Aplica algunos filtros (opcional)
3. Haz clic en **"Export"**
4. Abre el CSV descargado

### **3. Verificar Columnas**

Deberías ver **23 columnas** en este orden:

```
1.  ID
2.  Workspace ID ⬅️ NUEVO
3.  Created At
4.  Updated At ⬅️ NUEVO
5.  Phone From
6.  Phone To
7.  Status
8.  Interest
9.  Type
10. Duration (seconds)
11. Services Count ⬅️ NUEVO
12. Agent ID ⬅️ NUEVO
13. Agent Name
14. Contact ID ⬅️ NUEVO
15. Contact Name
16. Contact Phone
17. Assigned User ID ⬅️ NUEVO
18. Assigned User Name (antes solo "Assigned User")
19. City
20. Postal Code
21. Batch Call ID ⬅️ NUEVO
22. Conversation ID
23. Dynamic Variables ⬅️ NUEVO
```

---

## 📊 **Ejemplo de Datos Exportados**

**Antes:**

```csv
ID,Created At,Phone From,Phone To,Status,Interest,Type,Duration (seconds),Agent Name,Contact Name,Contact Phone,Assigned User,City,Postal Code,Campaign ID,Conversation ID
123,2024-10-30T10:00:00Z,+34911677200,+34631021622,client,alarm,outbound,180,Sales Agent 1,Juan Pérez,+34631021622,María García,Madrid,28001,,conv_abc123
```

**Ahora:**

```csv
ID,Workspace ID,Created At,Updated At,Phone From,Phone To,Status,Interest,Type,Duration (seconds),Services Count,Agent ID,Agent Name,Contact ID,Contact Name,Contact Phone,Assigned User ID,Assigned User Name,City,Postal Code,Batch Call ID,Conversation ID,Dynamic Variables
123,1,2024-10-30T10:00:00Z,2024-10-30T10:15:00Z,+34911677200,+34631021622,client,alarm,outbound,180,3,5,Sales Agent 1,789,Juan Pérez,+34631021622,10,María García,Madrid,28001,42,conv_abc123,budget; callback; priority
```

---

## 🚀 **Cambios en el Código**

### **Frontend: `/frontend/src/app/calls/page.tsx`**

**Líneas modificadas: 786-837**

#### **Headers actualizados:**

```typescript
const headers = [
  "ID",
  "Workspace ID", // NUEVO
  "Created At",
  "Updated At", // NUEVO
  "Phone From",
  "Phone To",
  "Status",
  "Interest",
  "Type",
  "Duration (seconds)",
  "Services Count", // NUEVO
  "Agent ID", // NUEVO
  "Agent Name",
  "Contact ID", // NUEVO
  "Contact Name",
  "Contact Phone",
  "Assigned User ID", // NUEVO
  "Assigned User Name", // Mejorado
  "City",
  "Postal Code",
  "Batch Call ID", // NUEVO
  "Conversation ID",
  "Dynamic Variables", // NUEVO
];
```

#### **Mapeo de datos actualizado:**

```typescript
const rows = calls.map((call: any) => [
  call.id || "",
  call.workspace_id || "", // NUEVO
  call.created_at || "",
  call.updated_at || "", // NUEVO
  call.phone_from || "",
  call.phone_to || "",
  call.status || "",
  call.interest || "",
  call.type || "",
  call.duration || "",
  call.services_count || 0, // NUEVO
  call.agent_id || "", // NUEVO
  call.agent?.name || "",
  call.contact_id || "", // NUEVO
  call.contact?.name || "",
  call.contact?.phone || "",
  call.assigned_user_id || "", // NUEVO
  call.assigned_user
    ? `${call.assigned_user.first_name || ""} ${
        call.assigned_user.last_name || ""
      }`.trim()
    : "",
  call.city || "",
  call.postal_code || "",
  call.batch_call_id || "", // NUEVO
  call.conversation_id || "",
  Array.isArray(call.dinamic_variables)
    ? call.dinamic_variables.join("; ")
    : "", // NUEVO
]);
```

---

### **Backend: Sin Cambios Necesarios**

El backend YA trae todas las columnas porque usa `SELECT *`:

```typescript
.select(`
  *,
  contact:contacts_new(id, name, phone),
  agent:agents(id, name),
  assigned_user:users_new(id, first_name, last_name, email)
`)
```

✅ `*` incluye todas las columnas de `calls`
✅ Los JOINs traen los nombres relacionados
✅ No hay cambios necesarios en el backend

---

## 📝 **Pasos para Implementar**

### **1. Ejecutar Script SQL (REQUERIDO)**

```bash
# En Supabase SQL Editor:
1. Abre add_batch_call_id_to_calls.sql
2. Ejecuta el script completo
3. Verifica que las 3 columnas se agregaron exitosamente
```

### **2. Verificar en Supabase**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'calls'
  AND column_name IN ('batch_call_id', 'services_count', 'conversation_id')
ORDER BY ordinal_position;
```

Deberías ver:

```
batch_call_id    | integer
services_count   | integer
conversation_id  | text
```

### **3. Probar Export**

1. Frontend ya está actualizado ✅
2. Backend ya funciona correctamente ✅
3. Solo falta que agregues las columnas en Supabase

---

## 🎯 **Resultado Final**

### **Columnas Agregadas al Export:**

- ✅ `Workspace ID`
- ✅ `Updated At`
- ✅ `Services Count`
- ✅ `Agent ID`
- ✅ `Contact ID`
- ✅ `Assigned User ID`
- ✅ `Batch Call ID` (relaciona con campaña)
- ✅ `Dynamic Variables`

### **Total:**

- **Antes:** 16 columnas
- **Ahora:** 23 columnas (+7 columnas nuevas)

### **Beneficios:**

- ✅ **Rastreo de campañas** con `batch_call_id`
- ✅ **Variables dinámicas** exportadas y legibles
- ✅ **IDs originales** para VLOOKUPs en Excel
- ✅ **Datos completos** de la tabla `calls`
- ✅ **Compatible con análisis avanzados** en Excel/Google Sheets

---

¡El export de Excel ahora incluye TODAS las columnas importantes de la tabla `calls`! 🎉
