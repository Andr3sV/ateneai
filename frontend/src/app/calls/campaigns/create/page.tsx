"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as XLSX from "xlsx"
import Papa from "papaparse"
import { usePageTitle } from "@/hooks/usePageTitle"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"

type Agent = {
  id: number
  name: string
  external_id?: string | null
  phone?: string | null
  phone_external_id?: string | null
}

type CsvRow = Record<string, string>

export default function CreateBatchCallPage() {
  usePageTitle("Create a batch call")
  const authenticatedFetch = useAuthenticatedFetch()

  const [batchName, setBatchName] = useState("")
  const [phoneExternalId, setPhoneExternalId] = useState<string>("")
  const [agentExternalId, setAgentExternalId] = useState<string>("")
  const [agents, setAgents] = useState<Agent[]>([])

  const [rowsPreview, setRowsPreview] = useState<CsvRow[]>([])
  const [rowCount, setRowCount] = useState<number>(0)
  const [headers, setHeaders] = useState<string[]>([])
  const [phoneHeader, setPhoneHeader] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [campaignId, setCampaignId] = useState<string>("")
  const [progress, setProgress] = useState<{ queued: number; in_progress: number; completed: number; failed: number; total: number; done: boolean } | null>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Load agents of type call. If backend isn't available locally, use sample data.
    authenticatedFetch(`/api/v2/agents?type=call`).then((res) => {
      if (res?.success) {
        const apiAgents = Array.isArray(res.data) ? res.data : []
        if (apiAgents.length > 0) {
          setAgents(apiAgents)
        } else {
          // Fallback samples if API returns empty list
          setAgents([
            { id: 1, name: 'Cold - Energy - Call - Endesa V2', external_id: 'agent_cold_energy_call_endesa_v2', phone: '+34 881 55 60 00', phone_external_id: 'phnum_energy_001' },
            { id: 2, name: 'Alarm - Outbound - V1', external_id: 'agent_cold_alarm_call', phone: '+34 600 11 22 33', phone_external_id: 'phnum_alarm_001' },
          ])
        }
      } else {
        throw new Error('agents fetch failed')
      }
    }).catch(() => {
      // Fallback samples for local testing
      setAgents([
        { id: 1, name: 'Cold - Energy - Call - Endesa V2', external_id: 'agent_cold_energy_call_endesa_v2', phone: '+34 881 55 60 00', phone_external_id: 'phnum_energy_001' },
        { id: 2, name: 'Alarm - Outbound - V1', external_id: 'agent_cold_alarm_call', phone: '+34 600 11 22 33', phone_external_id: 'phnum_alarm_001' },
      ])
    })
  }, [authenticatedFetch])

  // Clear polling when unmounting
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [])

  const phoneOptions = useMemo(() => {
    // Build phone list from agents having phone + phone_external_id
    const list: { label: string; value: string }[] = []
    agents.forEach(a => {
      if (a.phone && a.phone_external_id) {
        list.push({ label: `${a.name} (${a.phone})`, value: a.phone_external_id })
      }
    })
    return list
  }, [agents])

  const agentOptions = useMemo(() => {
    return agents
      .filter(a => a.external_id)
      .map(a => ({ label: `${a.name}`, value: String(a.external_id) }))
  }, [agents])

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
      chunk: (results) => {
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
  const canSubmit = hasData && !!phoneExternalId && !!agentExternalId && !!phoneHeader

  function getFromNumber(): string | undefined {
    const match = agents.find(a => a.phone_external_id === phoneExternalId)
    return match?.phone || undefined
  }

  async function buildAllRows(): Promise<Array<{ toNumber: string; variables?: Record<string, string>; metadata?: Record<string, any> }>> {
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
        const result: Array<{ toNumber: string; variables?: Record<string, string>; metadata?: Record<string, any> }> = []
        let idxBase = 0
        Papa.parse(selectedFile, {
          header: true,
          worker: true,
          skipEmptyLines: true,
          chunk: (res) => {
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
    const fromNumber = getFromNumber()
    if (!fromNumber) {
      setUploadError("No se pudo resolver el número emisor (fromNumber) para el phone seleccionado.")
      return
    }
    setSubmitting(true)
    setUploadError("")
    const cid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `cmp_${Date.now()}`
    setCampaignId(cid)
    try {
      const rows = await buildAllRows()
      // Filtra filas sin teléfono
      const valid = rows.filter(r => r.toNumber && r.toNumber.length > 0)
      const res = await authenticatedFetch('/api/calls/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: batchName || 'Untitled Batch',
          campaignId: cid,
          agentExternalId,
          agentPhoneExternalId: phoneExternalId,
          fromNumber,
          rows: valid,
        })
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
    } catch (e: any) {
      setUploadError(e?.message || 'Error while submitting batch')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 p-6 gap-6">
      {/* Left form */}
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Batch name</label>
          <Input placeholder="Untitled Batch" value={batchName} onChange={e => setBatchName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Phone Number</label>
          <Select value={phoneExternalId} onValueChange={setPhoneExternalId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a phone number" />
            </SelectTrigger>
            <SelectContent>
              {phoneOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Select Agent</label>
          <Select value={agentExternalId} onValueChange={setAgentExternalId}>
            <SelectTrigger>
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {agentOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Recipients</label>
            <div className="text-xs text-muted-foreground">CSV</div>
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

        <div className="flex items-center gap-3">
          <Button variant="outline" disabled>Test call</Button>
          <Button disabled={!canSubmit || !batchName || submitting} onClick={handleSubmit}>
            {submitting ? 'Submitting…' : 'Submit a Batch Call'}
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


