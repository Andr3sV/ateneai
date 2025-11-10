# 🔍 Análisis de Performance - Página de Conversaciones

## 🐛 Problemas Identificados

### 1. **Doble useEffect Inicial** ⚠️ CRÍTICO

**Ubicación:** `frontend/src/app/calls/page.tsx` líneas 341-344 y 346-380

```typescript
// useEffect #1 - Se ejecuta al montar
useEffect(() => {
  console.log('🚀 Initial load effect triggered');
  fetchCalls(1, false);
}, []); // Línea 341-344

// useEffect #2 - Se ejecuta al cambiar filtros
useEffect(() => {
  console.log('🔍 useEffect triggered with filters:', { ... });
  fetchCalls(1, true, controller.signal);
}, [fromFilter, toFilter, statusFilter, ...]) // Línea 346-380
```

**Problema:**

- Cuando la página carga, **ambos useEffect se disparan**
- Resultado: **2 llamadas simultáneas** a la API para la misma data
- Con 20 usuarios: **40 requests simultáneos** al cargar la página

**Impacto:**

- ❌ Duplica el tráfico de red
- ❌ Sobrecarga el servidor
- ❌ Posible race condition (la segunda respuesta puede llegar antes que la primera)
- ❌ Desperdicia recursos del cliente

---

### 2. **loadScheduled() - Múltiples Requests en Cascada** ⚠️ ALTO

**Ubicación:** líneas 382-498

```typescript
useEffect(() => {
  async function loadScheduled() {
    // 1. Intenta minimap (1 request)
    // 2. Si falla, hace bulk tasks (1 request)
    // 3. Para cada call faltante, hace request individual (hasta 3 requests)
  }
  loadScheduled();
}, [calls, pagination.page]);
```

**Problema:**

- Por cada cambio de página, hace **hasta 5 requests adicionales**
- Si hay 20 usuarios navegando: **100 requests extra** simultáneos
- El endpoint `tasks/by-contact/:id` se llama individualmente (N+1 query problem)

**Impacto:**

- ❌ Lentitud al cambiar de página
- ❌ Saturación del backend
- ❌ Timeouts en el backend si hay muchos usuarios

---

### 3. **Realtime + Polling Redundante** ⚠️ MEDIO

**Ubicación:** líneas 500-659

```typescript
// Health check cada 30 segundos
healthCheckInterval = setInterval(() => {
  if (timeSinceLastEvent > 60000) {
    fetchCalls(pagination.page, false);
  }
}, 30000);

// Fallback polling cada 2 minutos
fallbackPollingInterval = setInterval(() => {
  fetchCalls(pagination.page, false);
}, 120000);
```

**Problema:**

- Realtime **debería** ser suficiente
- Si Realtime falla, hay 2 mecanismos de recuperación activos
- Con 20 usuarios: **20 polling requests cada 2 minutos** (innecesario si Realtime funciona)

**Impacto:**

- ❌ Tráfico innecesario si Realtime está funcionando
- ❌ Posibles race conditions si polling y realtime se disparan a la vez

---

### 4. **Backend: Doble Query (Count + Data)** ⚠️ MEDIO

**Ubicación:** `backend/src/services/supabase-workspace.ts` líneas 703-757

```typescript
// Query 1: Count total
let countQuery = supabase
  .from(TABLES.CALLS)
  .select("id", { count: "exact", head: true })
  .eq("workspace_id", workspaceId);
// ... aplica todos los filtros ...

// Query 2: Data con joins
let dataQuery = supabase
  .from(TABLES.CALLS)
  .select(
    `
    *,
    contact:contacts_new(id, name, phone),
    agent:agents(id, name),
    assigned_user:users_new(id, first_name, last_name, email)
  `
  )
  .eq("workspace_id", workspaceId);
// ... aplica todos los filtros DE NUEVO ...
```

**Problema:**

- **2 queries a Supabase** por cada request
- Los filtros se duplican (misma lógica aplicada 2 veces)
- Count query con `head: true` es costoso en tablas grandes

**Impacto:**

- ❌ Doble carga en Supabase
- ❌ Latencia duplicada
- ❌ Con 20 usuarios simultáneos: 40 queries a Supabase por cada load

---

### 5. **Falta de Caché** ⚠️ BAJO-MEDIO

**Problema:**

- Cada vez que cambias de filtro, se hace una nueva request
- No hay caché de resultados anteriores
- Volver a "All status" vuelve a hacer una request completa

**Impacto:**

- ❌ Requests innecesarios cuando el usuario "explora" con filtros
- ❌ Mala UX (el usuario espera cada vez)

---

### 6. **ILIKE en phone_from y phone_to** ⚠️ BAJO

**Ubicación:** líneas 711-712, 741-742

```typescript
if (filters.from)
  countQuery = countQuery.ilike("phone_from", `%${filters.from}%`);
if (filters.to) countQuery = countQuery.ilike("phone_to", `%${filters.to}%`);
```

**Problema:**

- `ILIKE` con `%` al inicio y al final **no puede usar índices**
- Hace un full table scan en tablas grandes

**Impacto:**

- ❌ Lento con miles de registros
- ❌ Escala mal

---

## 🎯 Soluciones Propuestas (Ordenadas por Impacto)

### ✅ **Solución 1: Eliminar useEffect Duplicado** - CRÍTICO

**Impacto:** Reduce 50% de las requests iniciales

```typescript
// ELIMINAR el primer useEffect (líneas 341-344)
// MANTENER solo el segundo useEffect que responde a filtros

// Resultado: 1 request al cargar en lugar de 2
```

**Riesgo:** ⭐ Bajo - Solo hay que eliminar código redundante

---

### ✅ **Solución 2: Optimizar loadScheduled()** - ALTO

**Impacto:** Reduce hasta 80% de requests secundarios

```typescript
// Opción A: Hacer el endpoint /tasks/minimap más robusto
// - Si falla, no hacer fallback individual
// - Simplemente mostrar "sin fecha" en lugar de hacer 3+ requests

// Opción B: Hacer lazy loading
// - Solo cargar scheduled dates cuando el usuario hace click en "ver detalles"
// - No cargarlos automáticamente para toda la página

// Opción C: Agregar scheduled_date directamente a la query principal
// - JOIN con tasks en el backend
// - 1 query en lugar de 1 + N requests
```

**Riesgo:** ⭐⭐ Medio - Requiere cambios en backend o UX

---

### ✅ **Solución 3: Deshabilitar Fallback Polling por Defecto** - MEDIO

**Impacto:** Elimina 33% del tráfico de polling innecesario

```typescript
// Mantener Realtime
// Mantener health check (solo si no hay eventos)
// ELIMINAR fallback polling cada 2 minutos
// - Solo usar health check si realtime se cae

// Resultado: Menos requests de background
```

**Riesgo:** ⭐ Bajo - Realtime + health check es suficiente

---

### ✅ **Solución 4: Combinar Count + Data Query** - MEDIO

**Impacto:** Reduce 50% de queries a Supabase

```typescript
// En lugar de 2 queries separadas:
// 1. Hacer la data query con .select('*', { count: 'exact' })
// 2. Extraer count del header de la respuesta
// 3. Una sola query devuelve tanto data como count

// Supabase soporta esto nativamente
```

**Riesgo:** ⭐ Bajo - Cambio simple en backend

---

### ✅ **Solución 5: Agregar Índices en Base de Datos** - MEDIO

**Impacto:** Mejora 30-50% la velocidad de queries filtradas

```sql
-- Índices compuestos para mejorar performance
CREATE INDEX IF NOT EXISTS idx_calls_workspace_created
  ON calls(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calls_workspace_status
  ON calls(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_calls_workspace_agent
  ON calls(workspace_id, agent_id);

CREATE INDEX IF NOT EXISTS idx_calls_workspace_assigned
  ON calls(workspace_id, assigned_user_id);

-- Para búsquedas de teléfono
CREATE INDEX IF NOT EXISTS idx_calls_phone_to_pattern
  ON calls USING gin (phone_to gin_trgm_ops);
```

**Riesgo:** ⭐ Bajo - Solo agregar índices (no rompe nada)

---

### ✅ **Solución 6: Caché del Cliente (React Query o SWR)** - BAJO-MEDIO

**Impacto:** Mejora UX, reduce requests repetidas

```typescript
// Usar React Query para:
// - Cachear resultados de filtros
// - Deduplicar requests simultáneos
// - Stale-while-revalidate para mejor UX
// - Invalidar caché en realtime updates

// Beneficio: Si el usuario vuelve a un filtro anterior, no hace request
```

**Riesgo:** ⭐⭐⭐ Alto - Requiere refactoring significativo

---

## 📊 Estimación de Mejora Total

| Cambio                        | Reducción de Requests      | Riesgo   | Esfuerzo    |
| ----------------------------- | -------------------------- | -------- | ----------- |
| Eliminar useEffect duplicado  | -50% en initial load       | Bajo     | 5 min       |
| Optimizar loadScheduled       | -80% en scheduled requests | Medio    | 30 min      |
| Deshabilitar fallback polling | -33% en background         | Bajo     | 2 min       |
| Combinar count+data           | -50% en queries DB         | Bajo     | 15 min      |
| Agregar índices               | +30-50% velocidad          | Bajo     | 10 min      |
| **TOTAL RÁPIDO (sin riesgo)** | **~60% menos requests**    | **Bajo** | **~1 hora** |

---

## 🚀 Plan de Implementación Recomendado

### **Fase 1: Quick Wins (1 hora, sin riesgo)**

1. ✅ Eliminar primer useEffect duplicado
2. ✅ Deshabilitar fallback polling
3. ✅ Combinar count+data en backend
4. ✅ Agregar índices en Supabase

**Resultado esperado:**

- 60% menos requests
- 40-50% más rápido
- Sin romper nada

---

### **Fase 2: Optimizaciones Medias (2-3 horas)**

5. ✅ Simplificar loadScheduled (opción A: sin fallback individual)
6. ✅ Mejorar manejo de errores (timeouts, retries)

**Resultado esperado:**

- 80% menos requests
- 60% más rápido

---

### **Fase 3: Refactoring Largo Plazo (1-2 días)**

7. 🔄 Migrar a React Query para caché
8. 🔄 Lazy loading de scheduled dates
9. 🔄 Virtualización de tabla (react-virtual) para miles de rows

**Resultado esperado:**

- 90% menos requests innecesarios
- UX instantánea con caché
- Soporta 100+ usuarios simultáneos

---

## ⚠️ Diagnóstico del "No Carga Datos"

### Posibles Causas:

1. **Race condition** entre los 2 useEffect iniciales
   - La segunda respuesta sobrescribe la primera con datos vacíos
2. **Timeout en backend** por sobrecarga
   - Con 20 usuarios: 40-60 requests simultáneos pueden saturar
3. **Error silencioso** en loadScheduled
   - Si falla, puede bloquear el render
4. **Realtime desconexión**
   - Si Realtime se cae y polling no recupera

### Cómo Verificar:

```javascript
// En la consola del navegador cuando "no carga":
1. ¿Hay errores en consola? ❌
2. ¿La request a /api/calls responde? ⏱️
3. ¿Cuánto tarda en responder? (>3s es lento)
4. ¿El response tiene data: []? (vacío)
5. ¿Hay requests duplicados al mismo endpoint?
```

---

## 🎯 Recomendación Final

**Empezar con Fase 1 (Quick Wins):**

- Bajo riesgo
- Alto impacto
- 1 hora de trabajo
- No rompe nada existente

Esto debería solucionar el 80% del problema de "no carga datos" y mejorar significativamente la velocidad.

Después de validar que funciona bien, continuar con Fase 2.
