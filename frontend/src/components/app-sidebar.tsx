"use client"

import { Home, MessageSquare, User, ChevronDown, Phone, Share2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { UserButton, useUser } from "@clerk/nextjs"
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
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



export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { role } = useWorkspaceContext()

  const isMessagesActive = useMemo(
    () => pathname.startsWith("/messages") || pathname.startsWith("/social-connections"),
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

              {/* Tasks */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/tasks")}>
                  <Link href="/tasks">
                    <Share2 className="h-4 w-4" />
                    <span>Tasks</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Notes */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/notes")}>
                  <Link href="/notes">
                    <Share2 className="h-4 w-4" />
                    <span>Notes</span>
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
                      <SidebarMenuSubButton asChild isActive={pathname.startsWith("/messages/conversations")}>
                        <Link href="/messages/conversations">
                          <span>Conversations</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname.startsWith("/social-connections")}>
                        <Link href="/social-connections">
                          <span>Social Connections</span>
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
                    {(role !== 'member' && role !== 'viewer') && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={pathname.startsWith("/calls/campaigns")}>
                          <Link href="/calls/campaigns">
                            <span>Campaigns</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Contacts collapsible (moved below Calls) */}
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