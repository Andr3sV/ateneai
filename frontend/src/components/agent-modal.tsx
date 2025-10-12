"use client"

import { useEffect, useState } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Bot, MessageSquare, FileText, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { getApiUrl } from '@/config/features'

type AgentDetail = {
  id: number
  name: string
  type?: string | null
  external_id?: string | null
  created_at?: string
}

type ElevenLabsAgentData = {
  agent_id: string
  name: string
  conversation_config: {
    agent: {
      first_message: string
      prompt: {
        prompt: string
      }
    }
  }
}

interface AgentModalProps {
  agent: AgentDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AgentModal({ agent, open, onOpenChange }: AgentModalProps) {
  const authenticatedFetch = useAuthenticatedFetch()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState(false)
  const [elevenLabsData, setElevenLabsData] = useState<ElevenLabsAgentData | null>(null)
  
  // Form fields
  const [firstMessage, setFirstMessage] = useState('')
  const [prompt, setPrompt] = useState('')
  
  // Original values to detect changes
  const [originalFirstMessage, setOriginalFirstMessage] = useState('')
  const [originalPrompt, setOriginalPrompt] = useState('')
  
  // Check if there are changes
  const hasChanges = firstMessage !== originalFirstMessage || prompt !== originalPrompt

  // Fetch ElevenLabs agent details
  useEffect(() => {
    async function fetchAgentDetails() {
      if (!open || !agent?.id) return

      try {
        setLoading(true)
        setError('')
        setSuccess(false)
        
        const response = await authenticatedFetch(
          getApiUrl(`agents/${agent.id}/elevenlabs`),
          { muteErrors: true }
        )

        if (response?.success && response.data?.elevenlabs) {
          const data = response.data.elevenlabs
          setElevenLabsData(data)
          const initialFirstMessage = data.conversation_config?.agent?.first_message || ''
          const initialPrompt = data.conversation_config?.agent?.prompt?.prompt || ''
          setFirstMessage(initialFirstMessage)
          setPrompt(initialPrompt)
          setOriginalFirstMessage(initialFirstMessage)
          setOriginalPrompt(initialPrompt)
        } else {
          setError(response?.error || 'Failed to load agent details')
        }
      } catch (err: any) {
        console.error('Error fetching agent details:', err)
        setError(err.message || 'Failed to load agent details')
      } finally {
        setLoading(false)
      }
    }

    fetchAgentDetails()
  }, [open, agent?.id, authenticatedFetch])

  const handleSave = async () => {
    if (!agent?.id) return

    try {
      setSaving(true)
      setError('')
      setSuccess(false)

      const response = await authenticatedFetch(
        getApiUrl(`agents/${agent.id}/elevenlabs`),
        {
          method: 'PATCH',
          body: JSON.stringify({
            first_message: firstMessage,
            prompt: prompt
          })
        }
      )

      if (response?.success) {
        setSuccess(true)
        
        // Close modal after 2 seconds
        setTimeout(() => {
          onOpenChange(false)
        }, 2000)
      } else {
        setError(response?.error || 'Failed to update agent')
      }
    } catch (err: any) {
      console.error('Error updating agent:', err)
      setError(err.message || 'Failed to update agent')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    // Reset state when closing
    setError('')
    setSuccess(false)
    setElevenLabsData(null)
    setFirstMessage('')
    setPrompt('')
    setOriginalFirstMessage('')
    setOriginalPrompt('')
    onOpenChange(false)
  }

  // Extract dynamic variables from prompt
  const getDynamicVariables = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g
    const matches = text.matchAll(regex)
    const variables = new Set<string>()
    for (const match of matches) {
      variables.add(match[1])
    }
    return Array.from(variables)
  }

  const dynamicVariables = getDynamicVariables(prompt)

  // Highlight dynamic variables in the prompt display
  const highlightDynamicVariables = (text: string) => {
    if (!text) return null
    const parts = text.split(/(\{\{\w+\}\})/g)
    return parts.map((part, index) => {
      if (part.match(/\{\{\w+\}\}/)) {
        return (
          <span
            key={index}
            className="underline decoration-green-400 decoration-2 bg-green-50 px-0.5"
          >
            {part}
          </span>
        )
      }
      return part
    })
  }

  if (!agent) return null

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="px-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl flex items-center gap-2">
                <Bot className="h-5 w-5" />
                {agent.name || 'Agent Details'}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                Configure agent conversation settings
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 px-6 space-y-6">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success alert */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Agent updated successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Agent Info */}
          {!loading && elevenLabsData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Agent Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Agent Name</div>
                      <div className="text-muted-foreground">{agent.name}</div>
                    </div>
                  </div>
                  {agent.external_id && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="font-medium text-xs text-muted-foreground">ID</div>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{agent.external_id}</code>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* First Message */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    First Message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="first-message" className="text-sm text-muted-foreground">
                      The initial message the agent will say when starting a conversation
                    </Label>
                    <Textarea
                      id="first-message"
                      value={firstMessage}
                      onChange={(e) => setFirstMessage(e.target.value)}
                      placeholder="Enter the first message..."
                      className="min-h-[100px] resize-y"
                      disabled={saving || success}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Prompt */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Agent Prompt
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Label htmlFor="prompt" className="text-sm text-muted-foreground">
                      The system prompt that defines the agent's behavior and personality
                    </Label>
                    <Textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Enter the agent prompt..."
                      className="min-h-[200px] resize-y font-mono text-sm"
                      disabled={saving || success}
                    />
                    
                    {/* Dynamic Variables Display */}
                    {dynamicVariables.length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          Dynamic Variables Detected:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {dynamicVariables.map((variable) => (
                            <span
                              key={variable}
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono bg-green-50 text-green-700 border border-green-200"
                            >
                              {`{{${variable}}}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving || success || loading || !hasChanges}
                  className={`flex-1 ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Saved!
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Bottom padding for better scroll experience */}
        <div className="h-6" />
      </SheetContent>
    </Sheet>
  )
}

