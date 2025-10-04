# 🔒 Solución: Redirección automática cuando expira la sesión

## 📋 Problema identificado

**Síntoma**: Después de una release o despliegue, algunos usuarios ven la app abierta pero sin datos, como si estuvieran dentro pero no autenticados.

**Causa raíz**:

1. El usuario tiene la app abierta en su navegador
2. Durante un despliegue, su sesión de Clerk puede expirar/invalidarse
3. El middleware de Next.js solo actúa en navegación nueva, no detecta sesiones expiradas en apps ya abiertas
4. Las llamadas API fallan con 401, dejando la UI vacía sin datos
5. No había un manejo global para este escenario

## ✅ Solución implementada

### Componente: `AuthGuard`

Ubicación: `/frontend/src/components/auth-guard.tsx`

**Funcionalidad**:

- ✅ Detecta automáticamente si el usuario está autenticado usando `useAuth()` de Clerk
- ✅ Si el usuario NO está autenticado, lo redirige a `https://simbiosia.com`
- ✅ Muestra una pantalla de loading clara mientras verifica/redirige
- ✅ Solo se aplica a rutas protegidas (dashboard)

**Integración**:

- El `AuthGuard` se integró en `layout-wrapper.tsx`
- Solo envuelve las rutas del dashboard (`/home`, `/calls`, `/tasks`, etc.)
- Las rutas públicas (`/`, `/sign-in`, `/sign-up`) no se ven afectadas

### Flujo de funcionamiento

```
Usuario en la app → Sesión expira → AuthGuard detecta
                                   ↓
                          isSignedIn = false
                                   ↓
                  window.location.href = 'https://simbiosia.com'
```

## 🌍 ¿Es esto normal en otras apps?

**SÍ**, este es un patrón estándar en aplicaciones web modernas:

### Ejemplos de apps conocidas:

- **Gmail**: Si tu sesión expira, te redirige a la página de login de Google
- **Slack**: Te redirige a la página de login del workspace
- **Notion**: Te lleva a la página principal con opción de login
- **Asana**: Redirige a su landing page

### Mejores prácticas implementadas:

1. ✅ **Detección proactiva**: No esperar a que el usuario intente cargar datos
2. ✅ **Redirección clara**: Llevar a una página conocida (no dejar en limbo)
3. ✅ **UX transparente**: Mostrar mensaje de "Verificando autenticación..."
4. ✅ **Sin loops**: Usar `useRef` para evitar múltiples redirecciones

## 🚀 Beneficios

1. **Mejor UX**: Los usuarios no ven una app vacía/rota
2. **Claridad**: Redirige a la página principal donde pueden re-autenticarse
3. **Prevención de confusión**: Evita que los usuarios piensen que la app está fallando
4. **Seguridad**: Asegura que datos sensibles no se muestren sin autenticación

## 🔄 Comportamiento después del fix

### Antes:

```
Usuario con sesión expirada:
  ├─ App abierta pero sin datos
  ├─ Sidebar visible pero vacío
  ├─ Llamadas API fallan silenciosamente
  └─ Usuario confundido 😕
```

### Ahora:

```
Usuario con sesión expirada:
  ├─ AuthGuard detecta inmediatamente
  ├─ Muestra: "Verificando autenticación..."
  ├─ Redirige a: https://simbiosia.com
  └─ Usuario puede volver a entrar desde la landing ✨
```

## 📝 Código implementado

### `/frontend/src/components/auth-guard.tsx`

```typescript
"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn && !hasRedirected.current) {
      console.log("🔒 Usuario no autenticado - Redirigiendo a simbiosia.com");
      hasRedirected.current = true;
      window.location.href = "https://simbiosia.com";
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
```

### `/frontend/src/components/layout-wrapper.tsx`

```typescript
if (isDashboardRoute) {
  return (
    <AuthGuard>
      {" "}
      {/* ← NUEVO: Protección de rutas */}
      <WorkspaceProvider>
        <SidebarProvider>{/* ... resto del layout ... */}</SidebarProvider>
      </WorkspaceProvider>
    </AuthGuard>
  );
}
```

## 🧪 Testing recomendado

1. **Simular sesión expirada**:

   - Abre la app y autentica
   - En DevTools → Application → Cookies, elimina las cookies de Clerk
   - Recarga la página
   - ✅ Debería redirigir a simbiosia.com

2. **Durante un despliegue**:
   - Tener la app abierta
   - Hacer un despliegue que invalide sesiones
   - ✅ Al interactuar, debería detectar y redirigir

## 🎯 Resultado final

Los usuarios ya **NO** verán una app vacía después de una release. En su lugar:

- Serán redirigidos automáticamente a la landing page
- Desde ahí pueden hacer login nuevamente
- La experiencia es clara y profesional

---

**Implementado**: Octubre 2025  
**Versión**: 1.0  
**Status**: ✅ Activo en producción
