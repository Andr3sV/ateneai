"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          {/* Header con el trigger del sidebar */}
          <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="flex-1">
              {/* Aquí puedes agregar más elementos del header si necesitas */}
            </div>
          </header>
          
          {/* Contenido principal */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </main>
    </SidebarProvider>
  )
}