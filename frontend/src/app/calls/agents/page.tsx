'use client'

import { useEffect, useState } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getApiUrl } from '@/config/features'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Tag as TagIcon, Calendar as CalendarIcon } from 'lucide-react'

interface Agent {
  id: number
  name: string
  type?: string | null
  key?: string | null
  created_at?: string
}

export default function CallsAgentsPage() {
  usePageTitle('Calls Agents')
  const authenticatedFetch = useAuthenticatedFetch()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState<boolean>(true)

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

  const renderTypeBadge = (type?: string | null) => {
    if (!type) return <span className="text-gray-400">-</span>
    const t = type.toLowerCase()
    const styles = t === 'call'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-slate-100 text-slate-800'
    const text = t.replace('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())
    return <Badge className={styles}>{text}</Badge>
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
                    <CalendarIcon className="h-4 w-4" />
                    Created
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">Loading...</TableCell>
                </TableRow>
              ) : agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No agents</TableCell>
                </TableRow>
              ) : (
                agents.map(a => (
                  <TableRow key={a.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="py-4">
                      <span className="font-medium text-gray-900">{a.name}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      {renderTypeBadge(a.type)}
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
    </div>
  )
}


