"use client"

import { Home, MessageSquare, User, Share2, ChevronDown, Phone } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { UserButton, useUser } from "@clerk/nextjs"
import { useMemo, useState } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

// Menu items
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Conversations",
    url: "/conversations",
    icon: MessageSquare,
  },
  {
    title: "Contacts",
    url: "/contacts",
    icon: User,
  },
  {
    title: "Social Connections",
    url: "/social-connections",
    icon: Share2,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()

  const isMessagesActive = useMemo(
    () => pathname.startsWith("/messages") || pathname.startsWith("/conversations"),
    [pathname]
  )
  const [messagesOpen, setMessagesOpen] = useState<boolean>(isMessagesActive)

  const isContactsActive = useMemo(
    () => pathname.startsWith("/contacts"),
    [pathname]
  )
  const [contactsOpen, setContactsOpen] = useState<boolean>(isContactsActive)

  const isCallsActive = useMemo(
    () => pathname.startsWith("/calls"),
    [pathname]
  )
  const [callsOpen, setCallsOpen] = useState<boolean>(isCallsActive)

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden">
            <Image 
              src="/ateneai-logo.svg"
              alt="AteneAI Logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">AteneAI</span>
            <span className="text-xs text-sidebar-foreground/60">Dashboard</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Home Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                  <Link href="/dashboard">
                    <Home />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Messages collapsible */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isMessagesActive}
                  onClick={() => setMessagesOpen((v) => !v)}
                  className="justify-between"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>Messages</span>
                  </div>
                  <ChevronDown className={cn("transition-transform", messagesOpen ? "rotate-180" : "rotate-0")} />
                </SidebarMenuButton>

                {messagesOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname.startsWith("/messages")}>
                        <Link href="/messages/dashboard">
                          <span>Dashboard</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname.startsWith("/conversations")}>
                        <Link href="/conversations">
                          <span>Conversations</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Contacts collapsible */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isContactsActive}
                  onClick={() => setContactsOpen((v) => !v)}
                  className="justify-between"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Contacts</span>
                  </div>
                  <ChevronDown className={cn("transition-transform", contactsOpen ? "rotate-180" : "rotate-0")} />
                </SidebarMenuButton>

                {contactsOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname.startsWith("/contacts/dashboard")}>
                        <Link href="/contacts/dashboard">
                          <span>Dashboard</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === "/contacts" || pathname.startsWith("/contacts/list")}>
                        <Link href="/contacts/list">
                          <span>List</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Calls collapsible */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isCallsActive}
                  onClick={() => setCallsOpen((v) => !v)}
                  className="justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>Calls</span>
                  </div>
                  <ChevronDown className={cn("transition-transform", callsOpen ? "rotate-180" : "rotate-0")} />
                </SidebarMenuButton>

                {callsOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname.startsWith("/calls/dashboard")}>
                        <Link href="/calls/dashboard">
                          <span>Dashboard</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === "/calls"}>
                        <Link href="/calls">
                          <span>Conversations</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname.startsWith("/calls/agents")}>
                        <Link href="/calls/agents">
                          <span>Agents</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Social Connections */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/social-connections")}>
                  <Link href="/social-connections">
                    <Share2 />
                    <span>Social Connections</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3">
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8"
                  }
                }}
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {user?.firstName || 'Usuario'}
                </span>
                <span className="text-xs text-sidebar-foreground/60">
                  {user?.emailAddresses[0]?.emailAddress}
                </span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}