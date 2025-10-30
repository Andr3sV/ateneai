'use client'

import { useEffect, useState } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getApiUrl } from '@/config/features'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { User, Tag as TagIcon, Calendar as CalendarIcon, Activity } from 'lucide-react'
import { AgentModal } from '@/components/agent-modal'

// Skeleton Component for loading state
const TableRowSkeleton = () => (
  <TableRow className="animate-pulse">
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-32"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-6 bg-gray-200 rounded w-20"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-6 bg-gray-200 rounded w-20"></div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </TableCell>
  </TableRow>
)

interface Agent {
  id: number
  name: string
  type?: string | null
  status?: 'active' | 'inactive' | null
  key?: string | null
  created_at?: string
}

export default function CallsAgentsPage() {
  usePageTitle('Calls Agents')
  const authenticatedFetch = useAuthenticatedFetch()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchAgents = async () => {
    try {
      setLoading(true)
      const data = await authenticatedFetch(getApiUrl('agents?type=call'))
      if (data.success) setAgents(data.data || [])
    } catch (e) {
      console.error('Error fetching agents:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAgents() }, [])

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent)
    setModalOpen(true)
  }

  const renderTypeBadge = (type?: string | null) => {
    if (!type) return <span className="text-gray-400">-</span>
    const t = type.toLowerCase()
    const styles = t === 'call'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-slate-100 text-slate-800'
    const text = t.replace('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())
    return <Badge className={styles}>{text}</Badge>
  }

  const StatusDropdown = ({ 
    agentId, 
    value, 
    onChange 
  }: { 
    agentId: number
    value: Agent['status']
    onChange: (v: 'active' | 'inactive') => void 
  }) => {
    const status = (value || 'active').toLowerCase()
    const badgeColor = status === 'active' 
      ? 'bg-green-100 text-green-800 hover:bg-green-200' 
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    const label = status === 'active' ? 'Active' : 'Inactive'

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Badge className={`${badgeColor} cursor-pointer`}>{label}</Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => onChange('active')}>
            <span className="text-green-600">●</span>
            <span className="ml-2 text-green-700 font-medium">Active</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChange('inactive')}>
            <span className="text-gray-600">●</span>
            <span className="ml-2 text-gray-700 font-medium">Inactive</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardContent className="p-4">
          <Table className="hidden sm:table">
            <TableHeader>
              <TableRow className="border-b border-gray-200">
                <TableHead className="text-left font-semibold text-gray-900">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Name
                  </div>
                </TableHead>
                <TableHead className="text-left font-semibold text-gray-900">
                  <div className="flex items-center gap-2">
                    <TagIcon className="h-4 w-4" />
                    Type
                  </div>
                </TableHead>
                <TableHead className="text-left font-semibold text-gray-900">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Status
                  </div>
                </TableHead>
                <TableHead className="text-left font-semibold text-gray-900">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Created
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </>
              ) : agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No agents</TableCell>
                </TableRow>
              ) : (
                agents.map(a => (
                  <TableRow 
                    key={a.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleAgentClick(a)}
                  >
                    <TableCell className="py-4">
                      <span className="font-medium text-gray-900">{a.name}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      {renderTypeBadge(a.type)}
                    </TableCell>
                    <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                      <StatusDropdown
                        agentId={a.id}
                        value={a.status}
                        onChange={async (nextStatus) => {
                          try {
                            await authenticatedFetch(getApiUrl(`agents/${a.id}/status`), {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: nextStatus }),
                            })
                            // Update locally without refetch
                            setAgents((prev) => prev.map((agent) => 
                              agent.id === a.id ? { ...agent, status: nextStatus } : agent
                            ))
                          } catch (e) {
                            console.error('Failed updating agent status', e)
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      {a.created_at ? new Date(a.created_at).toLocaleString() : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Agent Modal */}
      <AgentModal
        agent={selectedAgent}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
