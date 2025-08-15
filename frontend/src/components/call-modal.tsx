"use client"

import { useEffect, useState } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { TaskModal } from '@/components/task-modal'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { getApiUrl } from '@/config/features'
import { X, Share2, Check } from 'lucide-react'

type CallDetail = {
  id: number
  contact: { id: number; name: string; phone: string } | null
  agent: { id: number; name: string } | null
  phone_from: string | null
  phone_to: string | null
  status: 'lead' | 'mql' | 'client' | null
  interest: 'energy' | 'alarm' | 'telco' | null
  type: 'outbound' | 'inbound' | null
  city: string | null
  created_at: string
  transcript?: string | null
  criteria_evaluation?: string[] | null
  duration?: number | null
  dinamic_variables?: string[] | null
}

interface CallModalProps {
  callId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CallModal({ callId, open, onOpenChange }: CallModalProps) {
  const authenticatedFetch = useAuthenticatedFetch()
  const [call, setCall] = useState<CallDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [existingTask, setExistingTask] = useState<any | null>(null)
  // Force v2 endpoints for tasks to avoid env flag mismatch in production
  const apiV2 = (path: string) => `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v2/${path}`
  
  const handleShare = async () => {
    try {
      const id = callId || call?.id
      if (!id || typeof window === 'undefined') return
      const url = `${window.location.origin}/calls?open=${id}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  useEffect(() => {
    async function fetchCall() {
      if (!open || !callId) return
      try {
        setLoading(true)
        const data = await authenticatedFetch(getApiUrl(`calls/${callId}`))
        if (data?.success) {
          setCall(data.data)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchCall()
  }, [open, callId, authenticatedFetch])

  // Fetch tasks when the modal opens and whenever call/contact changes
  useEffect(() => {
    async function fetchTasks() {
      if (!open) return
      const contactId = call?.contact?.id || null
      if (!contactId) { setExistingTask(null); return }
      // Primary: server by-contact
      const t = await authenticatedFetch(apiV2(`tasks/by-contact/${contactId}`), { muteErrors: true } as any)
      if (t?.success && Array.isArray(t.data) && t.data.length > 0) {
        setExistingTask(t.data[0])
        return
      }
      // Fallback: fetch all and filter client-side (covers numeric/string JSONB mismatches)
      try {
        const all = await authenticatedFetch(apiV2('tasks?'), { muteErrors: true } as any)
        const list = Array.isArray(all?.data) ? all.data : []
        const filtered = list.filter((row: any) => Array.isArray(row.contacts) && row.contacts.some((c: any) => String(c?.id) === String(contactId)))
        setExistingTask(filtered.length > 0 ? filtered[0] : null)
      } catch {
        setExistingTask(null)
      }
    }
    fetchTasks()
  }, [open, call?.contact?.id])

  const StatusDropdown = ({ value, onChange }: { value: CallDetail['status']; onChange: (v: CallDetail['status']) => void }) => {
    const s = (value || '').toString().toLowerCase()
    const badgeColor = s === 'client' ? 'bg-green-100 text-green-800 hover:bg-green-200' : s === 'mql' ? 'bg-red-100 text-red-800 hover:bg-red-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    const label = s ? (s === 'lead' ? 'No interesado' : s.charAt(0).toUpperCase() + s.slice(1)) : '-'
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Badge className={`${badgeColor} cursor-pointer`}>{label}</Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => onChange('mql')}>
            <span className="text-red-600">●</span>
            <span className="ml-2 text-red-600 font-medium">Mql</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChange('client')}>
            <span className="text-green-600">●</span>
            <span className="ml-2 text-green-700 font-medium">Client</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onChange('lead')}>
            <span className="text-gray-500">●</span>
            <span className="ml-2 text-gray-700 font-medium">No interesado</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const renderInterestBadge = (interest: CallDetail['interest']) => {
    if (!interest) return null
    const i = interest.toLowerCase()
    const styles = i === 'energy'
      ? 'bg-emerald-100 text-emerald-800'
      : i === 'alarm'
      ? 'bg-red-100 text-red-800'
      : 'bg-violet-100 text-violet-800'
    const text = i.charAt(0).toUpperCase() + i.slice(1)
    return <Badge className={styles}>{text}</Badge>
  }

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-full sm:w-[90vw] sm:max-w-[640px] md:w-[70vw] md:max-w-[800px] h-[100dvh] sm:h-screen sm:max-h-screen sm:rounded-none sm:overflow-hidden p-0 flex flex-col">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="space-y-3 px-4 py-3 sticky top-0 bg-white z-10 border-b">
              <div className="flex items-start justify-between">
              <div className="flex-1 pr-8">
                <SheetTitle className="text-lg font-semibold">
                  {call?.contact?.name || 'Call details'}
                </SheetTitle>
                <SheetDescription className="text-left">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    {call?.contact?.phone && <span>📱 {call.contact.phone}</span>}
                    {call?.agent?.name && <span>• 👤 {call.agent.name}</span>}
                    {call?.type && <span>• ☎️ {call.type === 'inbound' ? 'Inbound' : 'Outbound'}</span>}
                    {call?.city && <span>• 🏙️ {call.city}</span>}
                      {typeof call?.duration === 'number' && (
                        <span>• ⏱️ {Math.floor((call.duration || 0) / 60)}m {Math.floor((call.duration || 0) % 60)}s</span>
                      )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusDropdown
                      value={call?.status || null}
                      onChange={async (next) => {
                        if (!call) return
                        try {
                          await authenticatedFetch(getApiUrl(`calls/${call.id}/status`), {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: next }),
                          })
                          setCall({ ...call, status: next })
                        } catch (e) {
                          console.error('Failed updating call status', e)
                        }
                      }}
                    />
                    {renderInterestBadge(call?.interest || null)}
                    <Badge
                      className="bg-black text-white cursor-pointer hover:bg-neutral-900"
                      onClick={(e) => { e.stopPropagation(); setTaskModalOpen(true) }}
                    >
                      {existingTask
                        ? <>Llamada agendada {existingTask?.due_date ? new Date(existingTask.due_date).toLocaleString() : ''}</>
                        : <>Agendar llamada</>}
                    </Badge>
                  </div>
                </SheetDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  title={copied ? 'Copied!' : 'Copy share link'}
                  onClick={handleShare}
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-6">
            {/* Transcript */}
            <div>
              <div className="text-sm font-semibold mb-2">Transcript</div>
              <div className="rounded-md border bg-gray-50 p-3 text-sm whitespace-pre-wrap leading-relaxed">
                {loading ? 'Loading transcript…' : (call?.transcript?.trim() || 'No transcript available')}
              </div>
            </div>

            {/* Criteria Evaluation */}
            <div>
              <div className="text-sm font-semibold mb-2">Criteria evaluation</div>
              {loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : (call?.criteria_evaluation && call.criteria_evaluation.length > 0) ? (
                <div className="flex flex-wrap gap-2">
                  {call.criteria_evaluation.map((criterion, idx) => (
                    <Badge key={idx} variant="secondary" className="px-2 py-1 text-xs">
                      {criterion}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No criteria provided</div>
              )}
            </div>

            {/* Dynamic Variables */}
            <div>
              <div className="text-sm font-semibold mb-2">Dynamic Variables</div>
              {loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : (call?.dinamic_variables && call.dinamic_variables.length > 0) ? (
                <div className="flex flex-wrap gap-2">
                  {call.dinamic_variables.map((token, idx) => (
                    <Badge key={idx} variant="secondary" className="px-2 py-1 text-xs">
                      {token}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No dynamic variables</div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    <TaskModal
      open={taskModalOpen}
      onOpenChange={setTaskModalOpen}
      task={existingTask}
      initialContacts={call?.contact ? [{ id: call.contact.id, name: call.contact.name || call.contact.phone || `Contact ${call.contact.id}` }] : []}
      onSaved={async (saved) => {
        if (call?.contact?.id) {
          const contactId = call.contact.id
          const t = await authenticatedFetch(apiV2(`tasks/by-contact/${contactId}`), { muteErrors: true } as any)
          if (t?.success && Array.isArray(t.data) && t.data.length > 0) {
            setExistingTask(t.data[0])
          } else {
            try {
              const all = await authenticatedFetch(apiV2('tasks?'), { muteErrors: true } as any)
              const list = Array.isArray(all?.data) ? all.data : []
              const filtered = list.filter((row: any) => Array.isArray(row.contacts) && row.contacts.some((c: any) => String(c?.id) === String(contactId)))
              setExistingTask(filtered.length > 0 ? filtered[0] : null)
            } catch {
              setExistingTask(null)
            }
          }
        }
        if (saved) setExistingTask(saved)
        setTaskModalOpen(false)
      }}
    />
    </>
  )
}


