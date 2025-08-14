"use client"

import { useEffect, useState } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

  const renderStatusBadge = (status: CallDetail['status']) => {
    if (!status) return null
    const s = status.toLowerCase()
    const styles = s === 'client'
      ? 'bg-green-100 text-green-800'
      : s === 'mql'
      ? 'bg-red-100 text-red-800'
      : 'bg-yellow-100 text-yellow-800'
    const text = s.charAt(0).toUpperCase() + s.slice(1)
    return <Badge className={styles}>{text}</Badge>
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
                    {renderStatusBadge(call?.status || null)}
                    {renderInterestBadge(call?.interest || null)}
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
  )
}


