"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { WorkspaceProvider } from "@/hooks/useWorkspaceContext"

const DASHBOARD_ROUTES = ['/home', '/messages', '/contacts', '/calls', '/tasks', '/notes']

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const isDashboardRoute = DASHBOARD_ROUTES.some(route => pathname.startsWith(route))
  
  if (isDashboardRoute) {
    return (
      <WorkspaceProvider>
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1 overflow-hidden">
            <div className="flex h-full flex-col">
              {/* Header con el trigger del sidebar */}
              <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
                <SidebarTrigger />
                <div className="flex-1">
                  {/* Title area - will be populated by each page */}
                  <div id="page-title" className="flex items-center">
                    {/* Page title will be inserted here */}
                  </div>
                </div>
              </header>
              
              {/* Contenido principal */}
              <div className="flex-1 overflow-auto">
                {children}
              </div>
            </div>
          </main>
        </SidebarProvider>
      </WorkspaceProvider>
    )
  }
  
  // Para rutas que no necesitan sidebar (como sign-in, sign-up, etc.)
  return <>{children}</>
}