"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from '@clerk/nextjs'
import * as XLSX from "xlsx"
import Papa from "papaparse"
import { usePageTitle } from "@/hooks/usePageTitle"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"

type Agent = {
  id: number
  name: string
  external_id?: string | null
  phone?: string | null
  phone_external_id?: string | null
}

type PhoneCatalog = {
  id: number
  external_id: string
  phone: string
  label?: string | null
}

type CsvRow = Record<string, string>

type CallType = 'bulk' | 'priority'

export default function CreateBatchCallPage() {
  usePageTitle("Create a batch call")
  const authenticatedFetch = useAuthenticatedFetch()
  const { getToken } = useAuth()

  const [batchName, setBatchName] = useState("")
  const [callType, setCallType] = useState<CallType>('bulk')
  
  // Multiple agents and phones support
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  // Map agentId -> phone_external_id chosen for that agent
  const [agentPhoneMap, setAgentPhoneMap] = useState<Record<string, string>>({})
  
  // AMD Configuration
  const [enableMachineDetection, setEnableMachineDetection] = useState(true)
  const [machineDetectionTimeout, setMachineDetectionTimeout] = useState(6)
  const [concurrency, setConcurrency] = useState(10)
  
  // Time Window Configuration
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [timezone, setTimezone] = useState("America/New_York")
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]) // Mon-Fri by default
  
  const [agents, setAgents] = useState<Agent[]>([])
  const [phones, setPhones] = useState<PhoneCatalog[]>([])

  const [rowsPreview, setRowsPreview] = useState<CsvRow[]>([])
  const [rowCount, setRowCount] = useState<number>(0)
  const [headers, setHeaders] = useState<string[]>([])
  const [phoneHeader, setPhoneHeader] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [campaignId, setCampaignId] = useState<string>("")
  const [toastMsg, setToastMsg] = useState<string>("")
  const [progress, setProgress] = useState<{ queued: number; in_progress: number; completed: number; failed: number; total: number; done: boolean } | null>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Load agents of type call scoped to current workspace.
    authenticatedFetch(`/api/v2/agents?type=call`).then((res) => {
      if (res?.success) {
        const apiAgents = Array.isArray(res.data) ? res.data : []
        setAgents(apiAgents)
      } else {
        setAgents([])
      }
    }).catch(() => {
      setAgents([])
    })
    // Load phone numbers catalog for current workspace
    authenticatedFetch(`/api/calls/phones`).then((res) => {
      if (res?.success && Array.isArray(res.data)) {
        setPhones(res.data as PhoneCatalog[])
      } else {
        setPhones([])
      }
    }).catch(() => setPhones([]))
  }, [authenticatedFetch])

  // Clear polling when unmounting
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [])

  const phoneOptions = useMemo(() => {
    // Build phone list from phone_numbers catalog
    return (phones || []).map(p => ({ label: p.label ? `${p.label} (${p.phone})` : p.phone, value: p.external_id, phone: p.phone }))
  }, [phones])

  const agentOptions = useMemo(() => {
    return agents
      .filter(a => a.external_id)
      .map(a => ({ label: `${a.name}`, value: String(a.external_id) }))
  }, [agents])

  // Helper functions for multiple selection
  const addAgent = (agentId: string) => {
    if (!selectedAgentIds.includes(agentId)) {
      setSelectedAgentIds(prev => [...prev, agentId])
    }
  }

  const removeAgent = (agentId: string) => {
    setSelectedAgentIds(prev => prev.filter(id => id !== agentId))
  }

  const addPhoneForAgent = (agentId: string, phoneId: string) => {
    setAgentPhoneMap(prev => ({ ...prev, [agentId]: phoneId }))
  }

  const removePhoneForAgent = (agentId: string) => {
    setAgentPhoneMap(prev => {
      const next = { ...prev }
      delete next[agentId]
      return next
    })
  }

  function detectPhoneHeader(hs: string[]): string | null {
    const candidates = [
      'phone_number', 'phone', 'telefono', 'tel', 'mobile', 'msisdn', 'number', 'phone number'
    ]
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '_')
    const set = new Set(hs.map(norm))
    for (const c of candidates.map(norm)) {
      if (set.has(c)) {
        // return the actual header name as it appears
        const idx = hs.findIndex(h => norm(h) === c)
        return hs[idx]
      }
    }
    return null
  }

  function parseCsv(file: File) {
    const headerRef: { current: string[] | null } = { current: null }
    const preview: CsvRow[] = []
    let total = 0
    Papa.parse(file, {
      header: true,
      worker: true,
      skipEmptyLines: true,
      chunk: (results: Papa.ParseResult<CsvRow>) => {
        if (!headerRef.current) headerRef.current = results.meta.fields || []
        const chunkRows = results.data as CsvRow[]
        total += chunkRows.length
        // collect up to 20 rows for preview
        for (let i = 0; i < chunkRows.length && preview.length < 20; i++) {
          preview.push(chunkRows[i])
        }
      },
      complete: () => {
        const hs = headerRef.current || []
        setHeaders(hs)
        const detected = detectPhoneHeader(hs)
        setPhoneHeader(detected)
        setUploadError(detected ? "" : "El archivo no contiene una columna de teléfono. Añade 'phone_number' (o 'phone', 'telefono', 'mobile').")
        setRowsPreview(preview)
        setRowCount(total)
      },
      error: () => {
        // Fallback: do nothing
      }
    })
  }

  function parseSheet(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const wsName = wb.SheetNames[0]
      const ws = wb.Sheets[wsName]
      const json: CsvRow[] = XLSX.utils.sheet_to_json(ws, { defval: "" })
      if (json.length === 0) return
      const header = Object.keys(json[0])
      setHeaders(header)
      const detected = detectPhoneHeader(header)
      setPhoneHeader(detected)
      setUploadError(detected ? "" : "El archivo no contiene una columna de teléfono. Añade 'phone_number' (o 'phone', 'telefono', 'mobile').")
      setRowsPreview(json.slice(0, 20))
      setRowCount(json.length)
    }
    reader.readAsArrayBuffer(file)
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function handleFile(file: File) {
    const name = file.name.toLowerCase()
    setSelectedFile(file)
    if (name.endsWith('.csv')) {
      parseCsv(file)
      return
    }
    if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
      parseSheet(file)
      return
    }
  }

  const hasData = rowsPreview.length > 0
  const isPriority = callType === 'priority'
  const allAgentsHavePhone = selectedAgentIds.length > 0 && selectedAgentIds.every(id => !!agentPhoneMap[id])
  const canSubmit = hasData && 
    // Agents/phones: bulk allows many; priority requires exactly one with phone
    (isPriority ? (selectedAgentIds.length === 1 && !!agentPhoneMap[selectedAgentIds[0]]) : allAgentsHavePhone) &&
    !!phoneHeader &&
    machineDetectionTimeout >= 1 && 
    machineDetectionTimeout <= 30 &&
    concurrency >= 1 && 
    concurrency <= 100 &&
    startTime < endTime &&
    selectedDays.length > 0

  function resolveFromNumber(phoneExternalId?: string): string | undefined {
    if (!phoneExternalId) return undefined
    const match = phones.find(p => p.external_id === phoneExternalId)
    return match?.phone || undefined
  }

  async function buildAllRows(): Promise<Array<{ toNumber: string; variables?: Record<string, string>; metadata?: Record<string, unknown> }>> {
    if (!selectedFile || !phoneHeader) return []
    const name = selectedFile.name.toLowerCase()
    const toPayload = (row: CsvRow, idx: number) => {
      const toNumber = (row[phoneHeader!] || "").toString().trim()
      const variables: Record<string, string> = {}
      headers.forEach(h => {
        if (h !== phoneHeader) {
          const val = (row[h] ?? "").toString()
          if (val !== "") variables[h] = val
        }
      })
      return { toNumber, variables, metadata: { externalRowId: idx + 1 } }
    }

    if (name.endsWith('.csv')) {
      return await new Promise((resolve) => {
        const result: Array<{ toNumber: string; variables?: Record<string, string>; metadata?: Record<string, unknown> }> = []
        let idxBase = 0
        Papa.parse(selectedFile, {
          header: true,
          worker: true,
          skipEmptyLines: true,
          chunk: (res: Papa.ParseResult<CsvRow>) => {
            const chunkRows = res.data as CsvRow[]
            for (let i = 0; i < chunkRows.length; i++) {
              result.push(toPayload(chunkRows[i], idxBase + i))
            }
            idxBase += chunkRows.length
          },
          complete: () => resolve(result),
        })
      })
    }

    // XLS/XLSX
    const buf = await selectedFile.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const json: CsvRow[] = XLSX.utils.sheet_to_json(ws, { defval: "" })
    return json.map((row, idx) => toPayload(row, idx))
  }

  async function handleSubmit() {
    if (!canSubmit) return
    // validate phone per agent
    for (const agentId of selectedAgentIds) {
      if (!agentPhoneMap[agentId]) {
        setUploadError('Selecciona un teléfono para cada agente agregado.')
        return
      }
    }
    setSubmitting(true)
    setUploadError("")
    const cid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `cmp_${Date.now()}`
    setCampaignId(cid)
    try {
      const rows = await buildAllRows()
      // Filtra filas sin teléfono
      const valid = rows.filter(r => r.toNumber && r.toNumber.length > 0)
      const useServerMode = rowCount > 1000 || (selectedFile && selectedFile.size > 2 * 1024 * 1024)
      if (useServerMode && selectedFile) {
        // Server-mode: upload file with FormData, immediate schedule
        const fd = new FormData()
        fd.append('file', selectedFile)
        fd.append('campaignName', batchName || 'Bulk Campaign')
        fd.append('agents', JSON.stringify(selectedAgentIds.map(agentId => ({ agentId, agentPhoneNumberId: agentPhoneMap[agentId], fromNumber: resolveFromNumber(agentPhoneMap[agentId]) }))))
        fd.append('agentPhoneNumberId', '')
        fd.append('fromNumber', '')
        fd.append('concurrency', String(concurrency))
        fd.append('timeWindow', JSON.stringify({ startTime, endTime, timezone, daysOfWeek: selectedDays }))

        // Use fetch directly to override JSON header from hook
        const token = await getToken()
        const api = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/calls/bulk/upload`
        const upResp = await fetch(api, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: fd })
        const res = { ok: upResp.ok, data: await upResp.json().catch(() => ({})) as any }

        if (!res.ok || !res.data?.success) {
          throw new Error(res.data?.error || 'Upload failed')
        }
        setToastMsg('Campaign scheduled. Redirecting…')
        // Redirect immediately; background worker and VO will handle progress
        window.location.href = '/calls/campaigns'
        return
      }
      
      // Prepare payload based on call type
      let payload: {
        campaignName: string
        campaignId: string
        agents: Array<{ agentId: string; agentPhoneNumberId: string; fromNumber: string }>
        calls: Array<{
          toNumber: string
          variables?: Record<string, string>
          metadata?: Record<string, unknown>
        }>
        timeWindow: {
          startTime: string
          endTime: string
          timezone: string
          daysOfWeek: number[]
        }
        concurrency?: number
      }
      
      if (callType === 'priority') {
        // Priority: immediately place a single 1:1 call using first recipient
        const first = valid[0]
        if (!first) {
          throw new Error('No valid recipients found for priority call')
        }
        const phoneId = agentPhoneMap[selectedAgentIds[0]]
        const priorityBody = {
          agentId: selectedAgentIds[0],
          agentPhoneNumberId: phoneId,
          fromNumber: resolveFromNumber(phoneId),
          toNumber: first.toNumber,
          variables: first.variables,
          campaignId: cid,
          concurrency: Math.min(concurrency, 100)
        }
        const res = await authenticatedFetch('/api/calls/priority', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(priorityBody)
        })
        if (!res?.success) {
          throw new Error(res?.error || 'Priority call failed')
        }
        // Do not proceed with bulk flow after priority
        setSubmitting(false)
        return
      } else {
        // Bulk calls
        payload = {
          campaignName: batchName || 'Bulk Campaign',
          campaignId: cid,
          agents: selectedAgentIds.map(agentId => {
            const phoneId = agentPhoneMap[agentId]
            return {
              agentId,
              agentPhoneNumberId: phoneId,
              fromNumber: resolveFromNumber(phoneId) as string,
            }
          }),
          calls: valid.map(row => ({
            toNumber: row.toNumber,
            variables: row.variables,
            metadata: row.metadata
          })),
          concurrency,
          // Time Window Configuration
          timeWindow: {
            startTime,
            endTime,
            timezone,
            daysOfWeek: selectedDays
          }
        }
      }

      const res = await authenticatedFetch('/api/calls/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!res?.success) {
        throw new Error(res?.error || 'Bulk failed')
      }
      
      // Start polling progress
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
      progressTimerRef.current = setInterval(async () => {
        try {
          const pr = await authenticatedFetch(`/api/calls/bulk/progress?campaignId=${encodeURIComponent(cid)}`, { muteErrors: true })
          // Stop polling if backend or orchestrator reports 404 (campaign not found)
          if (pr && pr.status === 404) {
            clearInterval(progressTimerRef.current as NodeJS.Timeout)
            // Navigate to list once finished or unavailable
            window.location.href = '/calls/campaigns'
            return
          }
          if (pr?.success) {
            setProgress(pr.data)
            if (pr.data?.done) {
              clearInterval(progressTimerRef.current as NodeJS.Timeout)
              window.location.href = '/calls/campaigns'
            }
          }
        } catch {
          // ignore
        }
      }, 5000)
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Error while submitting batch')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 p-6 gap-6">
      {/* Left form */}
      <div className="w-full max-w-md space-y-6">
        {/* Recipients Section - Moved to top */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Recipients</label>
            <div className="text-xs text-muted-foreground">CSV/XLS/XLSX</div>
          </div>
          <Card className="p-6">
            <div className="flex items-center justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>Upload</Button>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              The phone_number column is required. Any other columns will be saved as dynamic variables.
            </div>
            {uploadError && (
              <div className="mt-3 text-xs text-red-600">{uploadError}</div>
            )}
          </Card>
        </div>

        {/* Basic Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Basic Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Campaign Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Campaign name</label>
              <Input placeholder="Untitled Campaign" value={batchName} onChange={e => setBatchName(e.target.value)} />
            </div>

            {/* Call Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Call Type</label>
              <Select value={callType} onValueChange={(value: CallType) => setCallType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bulk">Bulk Calls (High volume, optimized)</SelectItem>
                  <SelectItem value="priority">Priority Calls (Individual, immediate)</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {callType === 'bulk' 
                  ? 'Optimized for high-volume campaigns with AMD and concurrency control'
                  : 'Individual calls with immediate processing and limited concurrency'
                }
              </div>
            </div>

            {/* Multiple Agents Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Agents</label>
              <Select onValueChange={addAgent} value="">
                <SelectTrigger>
                  <SelectValue placeholder="Add an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agentOptions
                    .filter(opt => !selectedAgentIds.includes(opt.value))
                    .map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              
              {/* Selected Agents with per-agent phone selection */}
              {selectedAgentIds.length > 0 && (
                <div className="space-y-3">
                  {selectedAgentIds.map(agentId => {
                    const agent = agentOptions.find(opt => opt.value === agentId)
                    // For now, allow choosing ANY phone from catalog regardless of agent
                    const phonesForAgent = phoneOptions
                    return (
                      <div key={agentId} className="p-3 bg-muted rounded-md space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{agent?.label}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => { removeAgent(agentId); removePhoneForAgent(agentId) }}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">Select phone for this agent</div>
                        <Select value={agentPhoneMap[agentId] || ''} onValueChange={(val) => addPhoneForAgent(agentId, val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose phone" />
                          </SelectTrigger>
                          <SelectContent>
                            {phonesForAgent.map(p => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  })}
                </div>
              )}
              
              {agents.length === 0 && (
                <div className="text-xs text-muted-foreground">No hay agentes de tipo call en este workspace.</div>
              )}
            </div>

            {/* Removed global phone selector; now phone is selected per agent */}

            {/* Concurrency */}
            <div className="space-y-2">
              <Label htmlFor="concurrency">Concurrency</Label>
              <Select value={String(concurrency)} onValueChange={(value) => setConcurrency(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 25 }, (_, i) => i + 1).map(conc => (
                    <SelectItem key={conc} value={String(conc)}>
                      {conc} {conc === 1 ? 'call' : 'calls'}
                    </SelectItem>
                  ))}
                  <SelectItem value="50">50 calls</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {concurrency <= 25 
                  ? 'Low concurrency, stable but slower'
                  : concurrency <= 50
                  ? 'Medium concurrency, balanced performance'
                  : 'High concurrency, faster but may have delays'
                }
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AMD Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">AMD Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable Machine Detection */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-amd">Enable Machine Detection</Label>
                <div className="text-xs text-muted-foreground">
                  Detect answering machines and hang up automatically
                </div>
              </div>
              <Switch
                id="enable-amd"
                checked={enableMachineDetection}
                onCheckedChange={setEnableMachineDetection}
              />
            </div>

            {/* Machine Detection Timeout */}
            {enableMachineDetection && (
              <div className="space-y-2">
                <Label htmlFor="amd-timeout">AMD Timeout (seconds)</Label>
                <Select value={String(machineDetectionTimeout)} onValueChange={(value) => setMachineDetectionTimeout(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30].map(timeout => (
                      <SelectItem key={timeout} value={String(timeout)}>
                        {timeout}s {timeout === 6 && '(default)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  {machineDetectionTimeout <= 5 
                    ? 'Fast detection, may have false positives'
                    : machineDetectionTimeout <= 10
                    ? 'Balanced detection, recommended for most campaigns'
                    : 'Conservative detection, fewer false positives but slower'
                  }
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time Window Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Time Window Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Start and End Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                  <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                  <SelectItem value="Europe/Madrid">Madrid (CET/CEST)</SelectItem>
                  <SelectItem value="Europe/Berlin">Berlin (CET/CEST)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                  <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                  <SelectItem value="Australia/Sydney">Sydney (AEST/AEDT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Days of Week - Improved width */}
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="grid grid-cols-7 gap-1">
                {[
                  { value: 1, label: 'Mon' },
                  { value: 2, label: 'Tue' },
                  { value: 3, label: 'Wed' },
                  { value: 4, label: 'Thu' },
                  { value: 5, label: 'Fri' },
                  { value: 6, label: 'Sat' },
                  { value: 7, label: 'Sun' }
                ].map(({ value, label }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={selectedDays.includes(value) ? "default" : "outline"}
                    size="sm"
                    className="h-10 w-full p-0 text-xs"
                    onClick={() => {
                      if (selectedDays.includes(value)) {
                        setSelectedDays(prev => prev.filter(d => d !== value))
                      } else {
                        setSelectedDays(prev => [...prev, value])
                      }
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {startTime && endTime && selectedDays.length > 0 && (
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium mb-1">Time Window Summary</div>
                <div className="text-xs text-muted-foreground">
                  Calls will be made from <span className="font-medium">{startTime}</span> to <span className="font-medium">{endTime}</span> 
                  on {selectedDays.sort().map(day => {
                    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                    return dayNames[day - 1]
                  }).join(', ')} 
                  ({timezone})
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button variant="outline" disabled>Test call</Button>
          <Button disabled={!canSubmit || !batchName || submitting} onClick={handleSubmit}>
            {submitting ? 'Submitting…' : `Submit ${callType === 'priority' ? 'Priority' : 'Bulk'} Calls`}
          </Button>
        </div>
      </div>

      {/* Right preview */}
      <div className="flex-1">
        <Card className="p-4 min-h-[400px]">
          {!hasData ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No recipients yet
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {headers.map(h => (
                      <th key={h} className="text-left py-2 px-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowsPreview.map((r, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      {headers.map(h => (
                        <td key={h} className="py-2 px-2 text-gray-700">{r[h] || ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rowCount > rowsPreview.length && (
                <div className="text-xs text-muted-foreground mt-2">Showing first {rowsPreview.length} of {rowCount} rows</div>
              )}
              {campaignId && (
                <div className="mt-4 text-sm">
                  <div className="font-medium">Campaign: {campaignId}</div>
                  {progress ? (
                    <div className="text-muted-foreground">
                      queued: {progress.queued} · in_progress: {progress.in_progress} · completed: {progress.completed} · failed: {progress.failed} · total: {progress.total} {progress.done ? '· done' : ''}
                    </div>
                  ) : (
                    submitting ? <div className="text-muted-foreground">Submitting…</div> : null
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}


