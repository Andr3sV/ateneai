# Implementación de Skeleton Loaders

## ¿Qué son los Skeleton Loaders?

Los skeleton loaders son componentes que simulan la estructura de la interfaz mientras se cargan los datos, mejorando significativamente la experiencia del usuario:

- **Percepción de velocidad**: El usuario ve que algo está pasando
- **Reducción de ansiedad**: No hay pantallas en blanco
- **Estructura visual**: Mantiene el layout mientras se cargan los datos
- **Apariencia profesional**: Se ve moderno y bien diseñado

## Implementaciones Realizadas

### 1. **Contact Detail Page** ✅

**Archivo**: `frontend/src/app/contacts/[id]/page.tsx`

```tsx
const TaskSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex items-center justify-between p-4 border rounded-lg mb-3">
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="h-6 bg-gray-200 rounded w-20"></div>
    </div>
  </div>
);
```

**Dónde se usa**: En la sección de interactions mientras se cargan las tasks

### 2. **Calls Dashboard** ✅

**Archivo**: `frontend/src/app/calls/dashboard/page.tsx`

```tsx
// StatCards Skeleton
const StatCardSkeleton = () => (
  <div className="bg-white shadow rounded-lg p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
  </div>
);

// Charts Skeleton
const ChartSkeleton = () => (
  <div className="bg-white shadow rounded-lg p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
    <div className="h-80 bg-gray-100 rounded"></div>
  </div>
);

// Tables Skeleton
const TableSkeleton = () => (
  <div className="bg-white shadow rounded-lg p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
    <div className="h-80 bg-gray-100 rounded"></div>
  </div>
);
```

**Dónde se usa**:

- StatCards (2 secciones de 5 cards cada una)
- Gráficos de evolución (LineCharts y PieChart)
- Tablas de agentes, campañas y ciudades

### 3. **Calls Conversations** ✅

**Archivo**: `frontend/src/app/calls/page.tsx`

```tsx
// Table Row Skeleton
const TableRowSkeleton = () => (
  <TableRow className="animate-pulse">
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </TableCell>
    // ... 10 columnas total
  </TableRow>
);

// Mobile Card Skeleton
const MobileCardSkeleton = () => (
  <div className="border rounded-lg p-4 mb-3 animate-pulse">
    <div className="flex justify-between items-start mb-3">
      <div className="h-5 bg-gray-200 rounded w-32"></div>
      <div className="h-5 bg-gray-200 rounded w-16"></div>
    </div>
    // ... estructura de card móvil
  </div>
);

// Filters Skeleton
const FiltersSkeleton = () => (
  <div className="flex flex-wrap gap-3 mb-6 animate-pulse">
    <div className="h-10 bg-gray-200 rounded w-32"></div>
    // ... 5 filtros
  </div>
);
```

**Dónde se usa**:

- Vista desktop: 5 filas de skeleton en la tabla
- Vista móvil: 5 cards de skeleton
- Filtros: Cuando loading=true y members.length=0

### 4. **Calls Agents** ✅

**Archivo**: `frontend/src/app/calls/agents/page.tsx`

```tsx
const TableRowSkeleton = () => (
  <TableRow className="animate-pulse">
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-6 bg-gray-200 rounded w-20"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </TableCell>
  </TableRow>
);
```

**Dónde se usa**: En la tabla de agents, 5 filas de skeleton

### 5. **Calls Campaigns** ✅

**Archivo**: `frontend/src/app/calls/campaigns/page.tsx`

```tsx
const CampaignCardSkeleton = () => (
  <Card className="p-4 flex flex-col gap-3 border-gray-200 shadow-sm animate-pulse">
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
        <div className="h-3 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="h-5 bg-gray-200 rounded w-16"></div>
    </div>

    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="h-3 bg-gray-200 rounded w-16"></div>
        <div className="h-3 bg-gray-200 rounded w-12"></div>
      </div>
      <div className="h-1.5 bg-gray-200 rounded"></div>
    </div>

    <div className="flex items-center justify-between">
      <div className="h-3 bg-gray-200 rounded w-20"></div>
      <div className="h-3 bg-gray-200 rounded w-24"></div>
    </div>
  </Card>
);
```

**Dónde se usa**:

- Grid de campañas: 6 cards de skeleton
- Barra de búsqueda: Input y botón de skeleton

### 6. **Tasks Page** ✅

**Archivo**: `frontend/src/app/tasks/page.tsx`

```tsx
const TaskRowSkeleton = () => (
  <TableRow className="animate-pulse">
    <TableCell className="py-3">
      <div className="h-4 bg-gray-200 rounded w-48"></div>
    </TableCell>
    <TableCell className="py-3">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </TableCell>
    <TableCell className="py-3">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </TableCell>
    <TableCell className="py-3">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </TableCell>
  </TableRow>
);

const TaskSectionSkeleton = (title: string) => (
  <>
    <TableRow>
      <TableCell colSpan={4} className="py-2 text-xs text-gray-600 bg-white">
        {title} <span className="ml-1">3</span>
      </TableCell>
    </TableRow>
    <TaskRowSkeleton />
    <TaskRowSkeleton />
    <TaskRowSkeleton />
  </>
);

const FiltersSkeleton = () => (
  <div className="flex items-center gap-2 animate-pulse">
    <div className="h-10 bg-gray-200 rounded w-64"></div>
    <div className="h-10 bg-gray-200 rounded w-32"></div>
    <div className="h-10 bg-gray-200 rounded w-20"></div>
    <div className="h-10 bg-gray-200 rounded w-56"></div>
    <div className="h-10 bg-gray-200 rounded w-24 ml-auto"></div>
  </div>
);
```

**Dónde se usa**:

- Filtros: Input de búsqueda, calendario, filtro de assignee y botón de nueva task
- Tabla: 4 secciones (Delay, Today, This week, Upcoming) con 3 filas cada una

### 7. **Notes Page** ✅

**Archivo**: `frontend/src/app/notes/page.tsx`

```tsx
const TableRowSkeleton = () => (
  <TableRow className="animate-pulse">
    <TableCell className="py-3">
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
    </TableCell>
    <TableCell className="py-3">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </TableCell>
    <TableCell className="py-3">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </TableCell>
    <TableCell className="py-3">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </TableCell>
  </TableRow>
);
```

**Dónde se usa**: En la tabla de notes, 5 filas de skeleton

### 8. **Contacts Dashboard** ✅

**Archivo**: `frontend/src/app/contacts/dashboard/page.tsx`

```tsx
const StatCardSkeleton = () => (
  <div className="bg-white shadow rounded-lg p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white shadow rounded-lg p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
    <div className="h-80 bg-gray-100 rounded"></div>
  </div>
);
```

**Dónde se usa**:

- Stats Cards: 4 cards principales + 3 cards de campos
- Gráfico de evolución: ChartSkeleton cuando loading=true

### 9. **Contacts List** ✅

**Archivo**: `frontend/src/app/contacts/list/page.tsx`

```tsx
const TableRowSkeleton = () => (
  <TableRow className="animate-pulse">
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-6 bg-gray-200 rounded w-16"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </TableCell>
  </TableRow>
);

const FiltersSkeleton = () => (
  <div className="flex items-center gap-3 mb-6 animate-pulse">
    <div className="h-10 bg-gray-200 rounded w-64"></div>
    <div className="h-10 bg-gray-200 rounded w-32"></div>
    <div className="h-10 bg-gray-200 rounded w-24 ml-auto"></div>
  </div>
);
```

**Dónde se usa**:

- Filtros: Input de búsqueda, filtro de status y botón de crear
- Tabla: 5 filas de skeleton con header completo

## Técnicas Utilizadas

### 1. **Animación CSS**

```css
.animate-pulse
```

- Clase de Tailwind CSS que crea animación de "pulso"
- Los elementos se desvanecen y aparecen suavemente

### 2. **Colores Consistentes**

```css
bg-gray-200  // Para contenido principal
bg-gray-100  // Para fondos de gráficos
```

### 3. **Dimensiones Realistas**

- `w-3/4` - Para títulos largos
- `w-1/2` - Para subtítulos
- `w-20` - Para fechas/badges
- `h-80` - Para gráficos altos

### 4. **Lógica Condicional**

```tsx
{
  loading ? <SkeletonComponent /> : <RealContent />;
}
```

## Patrones de Diseño

### Estructura de Skeleton

1. **Contenedor**: Con `animate-pulse`
2. **Elementos**: Con dimensiones apropiadas
3. **Espaciado**: Consistente con componente real
4. **Jerarquía**: Respeta la estructura visual

### Cantidades Apropiadas

- **StatCards**: 5 skeletons (cantidad fija)
- **TableRows**: 5 skeletons (viewport típico)
- **MobileCards**: 5 skeletons (scroll natural)
- **Filtros**: 5 skeletons (cantidad esperada)

## Beneficios Observados

1. **Mejora en UX**: Los usuarios ven progreso inmediato
2. **Reducción de fricción**: No hay pantallas vacías
3. **Percepción de velocidad**: Se siente más rápido
4. **Profesionalismo**: Apariencia moderna

## Próximas Implementaciones Sugeridas

- **Messages Dashboard**
- **Create Campaign Page** (`frontend/src/app/calls/campaigns/create/page.tsx`)
- **Create Contact Page** (`frontend/src/app/contacts/create/page.tsx`)

## Notas Técnicas

- Los skeletons se muestran solo durante `loading=true`
- Usan las mismas clases CSS que los componentes reales
- Son ligeros y no afectan el rendimiento
- Compatible con responsive design (desktop/mobile)

## Páginas con Skeleton Loaders Implementados

### ✅ **Calls Dashboard**

- **Componentes**: StatCardSkeleton, ChartSkeleton, TableSkeleton
- **Dónde se usa**:
  - Stats Cards: 2 secciones de 5 cards cada una
  - Gráficos: 4 gráficos principales
  - Tablas: 4 tablas de estadísticas

### ✅ **Calls Conversations**

- **Componentes**: TableRowSkeleton, MobileCardSkeleton, FiltersSkeleton
- **Dónde se usa**:
  - Filtros: Input de búsqueda, filtro de status, filtro de interest, filtro de assignee
  - Tabla: 5 filas de skeleton con header completo
  - Vista móvil: 5 cards de skeleton

### ✅ **Calls Agents**

- **Componentes**: TableRowSkeleton
- **Dónde se usa**:
  - Tabla: 5 filas de skeleton con header completo

### ✅ **Calls Campaigns**

- **Componentes**: CampaignCardSkeleton
- **Dónde se usa**:
  - Grid de campañas: 6 cards de skeleton
  - Barra de acciones: Input de búsqueda y botón de crear

### ✅ **Tasks Page**

- **Componentes**: TaskRowSkeleton, TaskSectionSkeleton, FiltersSkeleton
- **Dónde se usa**:
  - Filtros: Input de búsqueda, filtro de status y botón de crear
  - Tabla: 4 secciones (Delay, Today, This week, Upcoming) con filas de skeleton

### ✅ **Notes Page**

- **Componentes**: TableRowSkeleton
- **Dónde se usa**:
  - Tabla: 5 filas de skeleton con header completo

### ✅ **Contacts Dashboard**

- **Componentes**: StatCardSkeleton, ChartSkeleton
- **Dónde se usa**:
  - Stats Cards: 4 cards principales + 3 cards de campos
  - Gráfico de evolución: ChartSkeleton cuando loading=true

### ✅ **Contacts List**

- **Componentes**: TableRowSkeleton, FiltersSkeleton
- **Dónde se usa**:
  - Filtros: Input de búsqueda, filtro de status y botón de crear
  - Tabla: 5 filas de skeleton con header completo

### ✅ **Messages Dashboard**

- **Componentes**: StatCardSkeleton, ChartSkeleton, DateFiltersSkeleton
- **Dónde se usa**:
  - Filtros de fecha: 4 botones de filtro rápido
  - Stats Cards: 3 cards principales (Total Conversations, Escaladas, Tasa)
  - Gráfico: ChartSkeleton con controles de período

### ✅ **Messages Conversations**

- **Componentes**: TableRowSkeleton, MobileCardSkeleton, FiltersSkeleton
- **Dónde se usa**:
  - Filtros: Input de búsqueda, filtro de status, filtro de assigned_to
  - Tabla: 5 filas de skeleton con header completo
  - Vista móvil: 5 cards de skeleton
