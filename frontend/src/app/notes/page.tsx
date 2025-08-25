'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { getApiUrl } from '@/config/features'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { User, Plus, Link2, Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { CallModal } from '@/components/call-modal'

interface NoteRow {
  id: number
  workspace_id: number
  author_id: number
  author_name?: string
  call_id: number | null
  content: string
  created_at: string
}

export default function NotesPage() {
  usePageTitle('Notes')
  const authenticatedFetch = useAuthenticatedFetch()
  const { userId } = useWorkspaceContext()

  const [rows, setRows] = useState<NoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 20
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const inflightRef = useRef<AbortController | null>(null)

  const [newOpen, setNewOpen] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newCallId, setNewCallId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const [members, setMembers] = useState<{ id: number; name: string }[]>([])
  const [linkedCallId, setLinkedCallId] = useState<number | null>(null)

  // Load workspace members to map author names
  useEffect(() => {
    let cancelled = false
    async function loadMembers() {
      try {
        const res = await authenticatedFetch(getApiUrl('tasks/helpers/members'), { muteErrors: true } as any)
        if (!cancelled && res?.success && Array.isArray(res.data)) {
          setMembers(res.data)
        }
      } catch { /* ignore */ }
    }
    loadMembers()
    return () => { cancelled = true }
  }, [authenticatedFetch])

  const getAuthorName = (authorId: number, fallback?: string) => {
    const m = members.find(x => Number(x.id) === Number(authorId))
    return m?.name || fallback || `User ${authorId}`
  }

  const fetchNotes = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true)
    try {
      if (inflightRef.current) inflightRef.current.abort()
      const ctrl = new AbortController()
      inflightRef.current = ctrl

      const params = new URLSearchParams({ page: String(pageNum), limit: String(limit) })
      const res = await authenticatedFetch(getApiUrl(`notes?${params.toString()}`), { signal: ctrl.signal } as any)
      if (res?.success) {
        const data: NoteRow[] = Array.isArray(res.data) ? res.data : []
        if (append) setRows(prev => [...prev, ...data]); else setRows(data)
        const totalPages = Number(res.pagination?.totalPages || 0)
        setHasMore(pageNum < totalPages)
        setCurrentPage(pageNum)
      } else {
        if (!append) setRows([])
        setHasMore(false)
      }
    } finally {
      inflightRef.current = null
      if (append) setLoadingMore(false); else setLoading(false)
    }
  }, [authenticatedFetch, limit])

  const handleScroll = useCallback(() => {
    const c = scrollContainerRef.current
    if (!c || loadingMore || !hasMore) return
    const threshold = 100
    if (c.scrollHeight - c.scrollTop - c.clientHeight < threshold) {
      fetchNotes(currentPage + 1, true)
    }
  }, [loadingMore, hasMore, currentPage, fetchNotes])

  useEffect(() => { fetchNotes(1, false) }, [fetchNotes])

  const handleCreate = async () => {
    if (!newContent.trim() || !userId) return
    setSubmitting(true)
    try {
      const payload: any = { content: newContent }
      if (newCallId && !isNaN(Number(newCallId))) payload.call_id = Number(newCallId)
      const res = await authenticatedFetch(getApiUrl('notes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res?.success) {
        setNewContent('')
        setNewCallId('')
        setNewOpen(false)
        fetchNotes(1, false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        {/* Placeholder search for future server filter; hidden for now to keep UX clean */}
        <div className="flex-1" />
        <Button className="ml-auto" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New note
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div ref={scrollContainerRef} onScroll={handleScroll} className="max-h-[800px] overflow-y-auto">
            <Table className="hidden sm:table">
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow className="border-b border-gray-200">
                  <TableHead className="text-left font-semibold text-gray-900 w-1/2">Note</TableHead>
                  <TableHead className="text-left font-semibold text-gray-900 w-1/6">
                    <div className="flex items-center gap-2"><User className="h-4 w-4" /> Author</div>
                  </TableHead>
                  <TableHead className="text-left font-semibold text-gray-900 w-1/6">
                    <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Date</div>
                  </TableHead>
                  <TableHead className="text-left font-semibold text-gray-900 w-1/6">
                    <div className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Linked</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-gray-500">Loading…</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-gray-500">No notes</TableCell></TableRow>
                ) : (
                  rows.map(r => (
                    <TableRow key={r.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="py-3">
                        <div className="text-sm text-gray-900 line-clamp-2 whitespace-pre-wrap">{r.content}</div>
                      </TableCell>
                      <TableCell className="py-3">{getAuthorName(r.author_id, r.author_name)}</TableCell>
                      <TableCell className="py-3">{format(new Date(r.created_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                      <TableCell className="py-3">
                        {r.call_id ? (
                          <button className="text-blue-600 hover:text-blue-800 hover:underline" onClick={() => setLinkedCallId(r.call_id!)}>
                            {`Call #${r.call_id}`}
                          </button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {loadingMore && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading more notes…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!hasMore && rows.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-4 text-center">
                      <span className="text-sm text-muted-foreground">All notes loaded</span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-500">
              {rows.length} notes loaded {hasMore && '• Scroll down for more'}
            </div>
            {hasMore && !loadingMore && (
              <Button variant="outline" size="sm" onClick={() => fetchNotes(currentPage + 1, true)}>
                Load more
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>New note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea rows={6} placeholder="Write your note…" value={newContent} onChange={(e) => setNewContent(e.target.value)} />
            <div className="flex items-center gap-2">
              <Input placeholder="Link to Call ID (optional)" value={newCallId} onChange={(e) => setNewCallId(e.target.value)} className="w-60" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newContent.trim() || submitting}>{submitting ? 'Saving…' : 'Save note'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CallModal callId={linkedCallId} open={linkedCallId !== null} onOpenChange={(o) => !o && setLinkedCallId(null)} />
    </div>
  )
}