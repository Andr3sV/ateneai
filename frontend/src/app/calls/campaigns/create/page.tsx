"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import Papa from "papaparse"
import { usePageTitle } from "@/hooks/usePageTitle"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CalendarIcon, Upload, AlertCircle, CheckCircle2, Loader2, Phone, Users, Clock, Zap, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

type Agent = {
  id: number
  name: string
  external_id?: string | null
}

type PhoneNumber = {
  id: number
  external_id: string
  phone: string
  label?: string | null
  provider?: string | null
}

type CsvRow = Record<string, string>

export default function CreateBatchCallPage() {
  usePageTitle("Create Campaign")
  const authenticatedFetch = useAuthenticatedFetch()
  const router = useRouter()

  // Form fields
  const [callName, setCallName] = useState("")
  const [selectedAgentId, setSelectedAgentId] = useState<string>("")
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<string>("")
  const [scheduleType, setScheduleType] = useState<"immediate" | "scheduled">("immediate")
  const [scheduledDate, setScheduledDate] = useState<Date>()
  const [scheduledTime, setScheduledTime] = useState<string>("09:00")
  const [timezone, setTimezone] = useState<string>("Europe/Madrid")
  const [isRetry, setIsRetry] = useState(false)
  
  // Data
  const [agents, setAgents] = useState<Agent[]>([])
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [rowsPreview, setRowsPreview] = useState<CsvRow[]>([])
  const [rowCount, setRowCount] = useState<number>(0)
  const [headers, setHeaders] = useState<string[]>([])
  const [phoneHeader, setPhoneHeader] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [retryRecipients, setRetryRecipients] = useState<any[]>([])
  
  // UI state
  const [uploadError, setUploadError] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Load agents
  useEffect(() => {
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
  }, [authenticatedFetch])

  // Load phone numbers
  useEffect(() => {
    authenticatedFetch(`/api/calls/phones`).then((res) => {
      if (res?.success && Array.isArray(res.data)) {
        setPhoneNumbers(res.data as PhoneNumber[])
      } else {
        setPhoneNumbers([])
      }
    }).catch(() => {
      setPhoneNumbers([])
    })
  }, [authenticatedFetch])

  // Check if this is a retry campaign and load data from sessionStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const isRetryParam = urlParams.get('retry') === 'true'
    
    if (isRetryParam) {
      const retryDataStr = sessionStorage.getItem('retryCampaignData')
      
      if (retryDataStr) {
        try {
          const retryData = JSON.parse(retryDataStr)
          
          // Set form fields
          setCallName(retryData.campaignName || '')
          setSelectedAgentId(retryData.agentId || '')
          setSelectedPhoneNumberId(retryData.phoneNumberId || '')
          setScheduleType('immediate')
          setIsRetry(true)
          
          // Store retry recipients for submission
          if (retryData.recipients && retryData.recipients.length > 0) {
            setRetryRecipients(retryData.recipients)
            
            // Extract all dynamic_variables keys to use as headers
            const allVariableKeys = new Set<string>()
            retryData.recipients.forEach((r: any) => {
              const vars = r.conversation_initiation_client_data?.dynamic_variables || {}
              Object.keys(vars).forEach(key => allVariableKeys.add(key))
            })
            
            // Convert recipients to CSV-like format for preview (with dynamic_variables)
            const recipientsData = retryData.recipients.map((r: any) => {
              const vars = r.conversation_initiation_client_data?.dynamic_variables || {}
              return {
                phone_number: r.phone_number,
                ...vars
              }
            })
            
            const headers = ['phone_number', ...Array.from(allVariableKeys)]
            
            setRowsPreview(recipientsData.slice(0, 10))
            setRowCount(recipientsData.length)
            setHeaders(headers)
            setPhoneHeader('phone_number')
          }
          
          // Clear sessionStorage after loading
          sessionStorage.removeItem('retryCampaignData')
          
        } catch (error) {
          console.error('Error loading retry data:', error)
        }
      }
    }
  }, [])

  function detectPhoneHeader(hs: string[]): string | null {
    const candidates = [
      'phone_number', 'phone', 'telefono', 'tel', 'mobile', 'msisdn', 'number', 'phone number'
    ]
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '_')
    const set = new Set(hs.map(norm))
    for (const c of candidates.map(norm)) {
      if (set.has(c)) {
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
        for (let i = 0; i < chunkRows.length && preview.length < 20; i++) {
          preview.push(chunkRows[i])
        }
      },
      complete: () => {
        const hs = headerRef.current || []
        setHeaders(hs)
        const detected = detectPhoneHeader(hs)
        setPhoneHeader(detected)
        setUploadError(detected ? "" : "File must contain a phone_number column (or 'phone', 'telefono', 'mobile').")
        setRowsPreview(preview)
        setRowCount(total)
      },
      error: () => {
        setUploadError("Error parsing CSV file")
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
      setUploadError(detected ? "" : "File must contain a phone_number column (or 'phone', 'telefono', 'mobile').")
      setRowsPreview(json.slice(0, 20))
      setRowCount(json.length)
    }
    reader.readAsArrayBuffer(file)
  }

  function handleFile(file: File) {
    const name = file.name.toLowerCase()
    setSelectedFile(file)
    setUploadError("")
    if (name.endsWith('.csv')) {
      parseCsv(file)
      return
    }
    if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
      parseSheet(file)
      return
    }
    setUploadError("Please upload a CSV or Excel file")
  }

  async function buildAllRows(): Promise<Array<{ phone_number: string; dynamic_variables: Record<string, string> }>> {
    if (!selectedFile || !phoneHeader) return []
    const name = selectedFile.name.toLowerCase()
    const toPayload = (row: CsvRow) => {
      const phone_number = (row[phoneHeader!] || "").toString().trim()
      const dynamic_variables: Record<string, string> = {}
      headers.forEach(h => {
        if (h !== phoneHeader) {
          const val = (row[h] ?? "").toString()
          if (val !== "") dynamic_variables[h] = val
        }
      })
      return { phone_number, dynamic_variables }
    }

    if (name.endsWith('.csv')) {
      return await new Promise((resolve) => {
        const result: Array<{ phone_number: string; dynamic_variables: Record<string, string> }> = []
        Papa.parse(selectedFile, {
          header: true,
          worker: true,
          skipEmptyLines: true,
          chunk: (res: Papa.ParseResult<CsvRow>) => {
            const chunkRows = res.data as CsvRow[]
            for (let i = 0; i < chunkRows.length; i++) {
              result.push(toPayload(chunkRows[i]))
            }
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
    return json.map((row) => toPayload(row))
  }

  const hasData = rowsPreview.length > 0 || (isRetry && retryRecipients.length > 0)
  const canSubmit = hasData && 
    callName.trim() !== '' &&
    selectedAgentId !== '' &&
    selectedPhoneNumberId !== '' &&
    (isRetry || !!phoneHeader) &&
    (scheduleType === 'immediate' || (scheduledDate && scheduledTime)) &&
    !submitting

  // Normalize phone number to E.164 format (add + if missing)
  function normalizePhoneNumber(phone: string | number): string {
    // Convert to string first (in case it's a number from Excel)
    let normalized = String(phone).trim().replace(/\s+/g, '')
    
    // If it doesn't start with +, add it
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized
    }
    
    return normalized
  }

  async function handleSubmit() {
    if (!canSubmit) return
    
    setSubmitting(true)
    setUploadError("")
    
    try {
      let recipients: any[] = []
      
      // If this is a retry, use the pre-loaded retry recipients (with their original dynamic_variables)
      if (isRetry && retryRecipients.length > 0) {
        recipients = retryRecipients.map(r => ({
          phone_number: normalizePhoneNumber(r.phone_number),
          conversation_initiation_client_data: r.conversation_initiation_client_data || {
            dynamic_variables: {}
          }
        }))
        
        console.log('🔄 Using retry recipients with dynamic_variables:', {
          total: recipients.length,
          sample: recipients[0]
        })
      } else {
        // Normal flow: build from uploaded file
        const rows = await buildAllRows()
        const valid = rows.filter(r => r.phone_number && r.phone_number.length > 0)
        
        if (valid.length === 0) {
          throw new Error('No valid phone numbers found in the file')
        }

        // Prepare recipients for call-manager API (normalize phone numbers to E.164)
        recipients = valid.map(row => ({
          phone_number: normalizePhoneNumber(row.phone_number),
          conversation_initiation_client_data: {
            dynamic_variables: row.dynamic_variables
          }
        }))
      }
      
      if (recipients.length === 0) {
        throw new Error('No valid recipients to call')
      }

      // Get phone provider from selected phone number
      const selectedPhone = phoneNumbers.find(p => p.external_id === selectedPhoneNumberId)
      const phone_provider = selectedPhone?.provider || null

      // Build payload
      const payload: any = {
        call_name: callName,
        agent_id: selectedAgentId,
        agent_phone_number_id: selectedPhoneNumberId,
        recipients
      }

      // Only add scheduled_time_unix if scheduled (don't send null)
      if (scheduleType === 'scheduled' && scheduledDate && scheduledTime) {
        const [hours, minutes] = scheduledTime.split(':').map(Number)
        
        // Create date string in format YYYY-MM-DD HH:mm for the selected timezone
        const year = scheduledDate.getFullYear()
        const month = String(scheduledDate.getMonth() + 1).padStart(2, '0')
        const day = String(scheduledDate.getDate()).padStart(2, '0')
        const dateTimeString = `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
        
        // Convert to unix timestamp using the selected timezone
        // Use Intl API to interpret the date in the selected timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
        
        // Create a date in the selected timezone
        const parts = dateTimeString.split('T')
        const datePart = parts[0]
        const timePart = parts[1]
        const [y, m, d] = datePart.split('-').map(Number)
        const [h, min, s] = timePart.split(':').map(Number)
        
        // Create date as if it's in UTC, then adjust for the timezone offset
        const utcDate = new Date(Date.UTC(y, m - 1, d, h, min, s))
        
        // Get the offset for the selected timezone at this date
        const tzDate = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }))
        const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: 'UTC' }))
        const offset = localDate.getTime() - tzDate.getTime()
        
        payload.scheduled_time_unix = Math.floor((utcDate.getTime() + offset) / 1000)
      }

      // Only add phone_provider if available (don't send null)
      if (phone_provider) {
        payload.phone_provider = phone_provider
      }

      // Submit to backend proxy
      const res = await authenticatedFetch('/api/call-manager/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res?.success) {
        throw new Error(res?.error || 'Failed to submit batch')
      }

      console.log('✅ Batch created:', res.data)
      setSuccess(true)
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/calls/campaigns')
      }, 2000)
      
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Error while submitting batch')
    } finally {
      setSubmitting(false)
    }
  }

  const agentOptions = useMemo(() => {
    return agents
      .filter(a => a.external_id)
      .map(a => ({ label: a.name, value: String(a.external_id) }))
  }, [agents])

  const phoneNumberOptions = useMemo(() => {
    return phoneNumbers.map(p => ({
      label: p.label ? `${p.label} (${p.phone})` : p.phone,
      value: p.external_id,
      provider: p.provider
    }))
  }, [phoneNumbers])

  return (
    <div className="flex flex-1 flex-col p-6 gap-6 max-w-7xl mx-auto">
      {success ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Campaign created successfully! Redirecting...
          </AlertDescription>
        </Alert>
      ) : null}
      
      {isRetry && !success && (
        <Alert className="border-blue-200 bg-blue-50">
          <RefreshCw className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Retry Mode:</strong> Launching campaign with {retryRecipients.length} recipient(s) who were not completed successfully in the previous campaign.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Campaign Details
              </CardTitle>
              <CardDescription>Basic information about your calling campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="call-name">Campaign Name *</Label>
                <Input
                  id="call-name"
                  placeholder="Q4 2025 Outreach Campaign"
                  value={callName}
                  onChange={e => setCallName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent">Agent *</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger id="agent">
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentOptions.length === 0 ? (
                      <SelectItem value="none" disabled>No agents available</SelectItem>
                    ) : (
                      agentOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {agents.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No call agents found in this workspace.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-number">Phone Number *</Label>
                <Select value={selectedPhoneNumberId} onValueChange={setSelectedPhoneNumberId}>
                  <SelectTrigger id="phone-number">
                    <SelectValue placeholder="Select a phone number" />
                  </SelectTrigger>
                  <SelectContent>
                    {phoneNumberOptions.length === 0 ? (
                      <SelectItem value="none" disabled>No phone numbers available</SelectItem>
                    ) : (
                      phoneNumberOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center justify-between w-full">
                            <span>{opt.label}</span>
                            {opt.provider && (
                              <span className="ml-2 text-xs text-muted-foreground">({opt.provider})</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {phoneNumbers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No phone numbers found in this workspace.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Schedule
              </CardTitle>
              <CardDescription>
                Start the campaign immediately or schedule it for later
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={scheduleType} onValueChange={(val: "immediate" | "scheduled") => setScheduleType(val)}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="immediate" id="immediate" />
                  <Label htmlFor="immediate" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Zap className="h-4 w-4 text-orange-500" />
                    <div>
                      <div className="font-medium">Send Immediately</div>
                      <div className="text-xs text-muted-foreground">Start calling as soon as the campaign is created</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="scheduled" id="scheduled" />
                  <Label htmlFor="scheduled" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="font-medium">Schedule for Later</div>
                      <div className="text-xs text-muted-foreground">Pick a specific date and time</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {scheduleType === 'scheduled' && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !scheduledDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduledDate}
                          onSelect={setScheduledDate}
                          disabled={(date) => {
                            // Only disable dates before today (not today itself)
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            return date < today
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduled-time">Time *</Label>
                    <Input
                      id="scheduled-time"
                      type="time"
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone *</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Madrid">🇪🇸 Madrid (CET/CEST)</SelectItem>
                        <SelectItem value="Europe/London">🇬🇧 London (GMT/BST)</SelectItem>
                        <SelectItem value="Europe/Paris">🇫🇷 Paris (CET/CEST)</SelectItem>
                        <SelectItem value="America/New_York">🇺🇸 New York (EST/EDT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">🇺🇸 Los Angeles (PST/PDT)</SelectItem>
                        <SelectItem value="America/Chicago">🇺🇸 Chicago (CST/CDT)</SelectItem>
                        <SelectItem value="America/Mexico_City">🇲🇽 Mexico City (CST)</SelectItem>
                        <SelectItem value="America/Bogota">🇨🇴 Bogotá (COT)</SelectItem>
                        <SelectItem value="America/Lima">🇵🇪 Lima (PET)</SelectItem>
                        <SelectItem value="America/Buenos_Aires">🇦🇷 Buenos Aires (ART)</SelectItem>
                        <SelectItem value="America/Sao_Paulo">🇧🇷 São Paulo (BRT)</SelectItem>
                        <SelectItem value="Asia/Tokyo">🇯🇵 Tokyo (JST)</SelectItem>
                        <SelectItem value="Asia/Shanghai">🇨🇳 Shanghai (CST)</SelectItem>
                        <SelectItem value="Asia/Dubai">🇦🇪 Dubai (GST)</SelectItem>
                        <SelectItem value="Australia/Sydney">🇦🇺 Sydney (AEDT/AEST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {scheduledDate && scheduledTime && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <CalendarIcon className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        Campaign will start on <strong>{format(scheduledDate, "PPP")}</strong> at <strong>{scheduledTime}</strong> ({timezone.split('/')[1].replace('_', ' ')})
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                size="lg" 
                className="w-full" 
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Campaign...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Create Campaign
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Recipients */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recipients
              </CardTitle>
              <CardDescription>Upload a CSV or Excel file with phone numbers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8">
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
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload File
                </Button>
              </div>

              {selectedFile && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <strong>{selectedFile.name}</strong> - {rowCount} contacts
                  </AlertDescription>
                </Alert>
              )}

              {uploadError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• File must contain a <strong>phone_number</strong> column (or phone, telefono, mobile)</p>
                <p>• All other columns will be sent as dynamic variables to the agent</p>
                <p>• Phone numbers will be auto-formatted to E.164 (+ will be added if missing)</p>
                <p className="text-green-600">• Example: 34631021622 → +34631021622 ✓</p>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {hasData && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  Showing first {rowsPreview.length} of {rowCount} contacts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="border-b sticky top-0 bg-white">
                      <tr>
                        {headers.map(h => (
                          <th key={h} className="text-left py-2 px-3 font-medium">
                            {h}
                            {h === phoneHeader && (
                              <span className="ml-1 text-green-600">✓</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rowsPreview.map((r, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                          {headers.map(h => {
                            const value = r[h] || ""
                            const isPhoneColumn = h === phoneHeader
                            const normalizedPhone = isPhoneColumn && value ? normalizePhoneNumber(value) : null
                            const phoneChanged = normalizedPhone && normalizedPhone !== value
                            
                            return (
                              <td key={h} className="py-2 px-3 text-gray-700">
                                {isPhoneColumn && phoneChanged ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400 line-through text-xs">{value}</span>
                                    <span className="text-green-600 font-medium">{normalizedPhone}</span>
                                  </div>
                                ) : (
                                  value
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
