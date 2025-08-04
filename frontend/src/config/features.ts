// Feature flags for gradual migration
export const FEATURE_FLAGS = {
  // Enable workspace-based system
  ENABLE_WORKSPACE_SYSTEM: process.env.NEXT_PUBLIC_ENABLE_WORKSPACE_SYSTEM === 'true',
  
  // Use workspace API endpoints (v2) instead of legacy (v1)
  USE_WORKSPACE_API: process.env.NEXT_PUBLIC_USE_WORKSPACE_API === 'true',
  
  // Fallback to legacy system if workspace fails
  FALLBACK_TO_LEGACY: process.env.NEXT_PUBLIC_FALLBACK_TO_LEGACY !== 'false',
  
  // Log migration events
  LOG_MIGRATION_EVENTS: process.env.NEXT_PUBLIC_LOG_MIGRATION_EVENTS !== 'false',
} as const

export function logMigrationEvent(event: string, data?: any) {
  if (FEATURE_FLAGS.LOG_MIGRATION_EVENTS) {
    console.log(`🔄 Frontend Migration Event: ${event}`, data ? JSON.stringify(data, null, 2) : '')
  }
}

// Helper to determine which API version to use
export function getApiVersion(): 'v1' | 'v2' {
  return FEATURE_FLAGS.USE_WORKSPACE_API ? 'v2' : 'v1'
}

// Helper to get API base URL with version
export function getApiUrl(endpoint: string): string {
  const version = getApiVersion()
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  
  return `${baseUrl}/api/${version}/${cleanEndpoint}`
}