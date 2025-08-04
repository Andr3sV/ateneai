// Migration configuration for gradual switch to workspace-based system
export const MIGRATION_CONFIG = {
  // Enable workspace-based routes (set to true to use new system)
  ENABLE_WORKSPACE_ROUTES: process.env.ENABLE_WORKSPACE_ROUTES === 'true',
  
  // Fallback to old system if workspace context fails
  FALLBACK_TO_OLD_SYSTEM: process.env.FALLBACK_TO_OLD_SYSTEM !== 'false',
  
  // Log migration events
  LOG_MIGRATION_EVENTS: process.env.LOG_MIGRATION_EVENTS !== 'false',
  
  // Default workspace ID for fallback (if needed)
  DEFAULT_WORKSPACE_ID: parseInt(process.env.DEFAULT_WORKSPACE_ID || '1'),
  
  // Route prefixes
  OLD_ROUTE_PREFIX: '/api/v1',
  NEW_ROUTE_PREFIX: '/api/v2',
} as const;

export function logMigrationEvent(event: string, data?: any) {
  if (MIGRATION_CONFIG.LOG_MIGRATION_EVENTS) {
    console.log(`🔄 Migration Event: ${event}`, data ? JSON.stringify(data, null, 2) : '');
  }
}