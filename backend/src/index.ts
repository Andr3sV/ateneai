import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import conversationRoutes from './routes/conversations';
import contactRoutes from './routes/contacts';
import analyticsRoutes from './routes/analytics';
import webhookRoutes from './routes/webhooks';

// NEW: Workspace-based routes
import authWorkspaceRoutes from './routes/auth-workspace';
import conversationsWorkspaceRoutes from './routes/conversations-workspace';
import contactsWorkspaceRoutes from './routes/contacts-workspace';
import analyticsWorkspaceRoutes from './routes/analytics-workspace';
import socialConnectionsWorkspaceRoutes from './routes/social-connections-workspace';
import webhooksSocialRoutes from './routes/webhooks-social';
import conversationsPublicRoutes from './routes/conversations-public';
import agentsWorkspaceRoutes from './routes/agents-workspace';
import callsWorkspaceRoutes from './routes/calls-workspace';
import tasksWorkspaceRoutes from './routes/tasks-workspace';
import notesWorkspaceRoutes from './routes/notes-workspace';
import { MIGRATION_CONFIG, logMigrationEvent } from './config/migration';

// Load environment variables
dotenv.config(); // Load .env first
dotenv.config({ path: '.env.local', override: true }); // Override with .env.local for development

// Debug: Log environment variables (remove in production)
console.log('🔧 Environment check:');
console.log('CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? '✅ Set' : '❌ Missing');
console.log('CLERK_PUBLISHABLE_KEY:', process.env.CLERK_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

const app = express();
const PORT = process.env.PORT || 3001;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AteneAI API',
      version: '1.0.0',
      description: 'API for AteneAI chatbot platform',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Trust proxy to get correct client IPs behind Railway/NGINX
app.set('trust proxy', 1);

// Rate limiting
// NOTE: We apply separate limiters for authenticated (workspace) routes and public routes
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: process.env.NODE_ENV === 'production' ? 300 : 10000, // allow higher burst for authenticated users
  standardHeaders: true, // include RateLimit-* headers
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please slow down.' },
  skip: (req) => req.method === 'OPTIONS',
  keyGenerator: (req) => {
    // Prefer a stable per-user key when Authorization header is present
    const authHeader = req.headers['authorization'];
    if (typeof authHeader === 'string' && authHeader.length > 0) {
      // Use a prefix + first 32 chars to avoid storing full tokens
      return `auth:${authHeader.slice(0, 32)}`;
    }
    // Fallback to IP address
    const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    const ip = req.ip || forwarded || (Array.isArray((req as any).ips) ? (req as any).ips[0] : undefined) || (req.socket && req.socket.remoteAddress) || 'unknown';
    return ip as string;
  },
});

const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 120 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests from this IP.' },
  skip: (req) => req.method === 'OPTIONS',
});

// Middleware
app.use(helmet());
// CORS configuration
const corsOrigins = [
  ...(process.env.CORS_ORIGIN?.split(',').map(url => url.trim()) || []),
  ...(process.env.CORS_ADDITIONAL_ORIGINS?.split(',').map(url => url.trim()) || [])
].filter(Boolean);

app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Documentation
app.use('/api-docs', publicLimiter, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', publicLimiter, (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// OLD API Routes (v1) - Legacy support
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/clients', authMiddleware, clientRoutes);
app.use('/api/v1/conversations', authMiddleware, conversationRoutes);
app.use('/api/v1/contacts', contactRoutes); // Auth middleware ya aplicado en el router
app.use('/api/v1/analytics', authMiddleware, analyticsRoutes);
app.use('/api/v1/webhooks', webhookRoutes); // Webhooks sin autenticación

// NEW API Routes (v2) - Workspace-based system
logMigrationEvent('Server startup', { 
  workspaceRoutesEnabled: MIGRATION_CONFIG.ENABLE_WORKSPACE_ROUTES,
  fallbackEnabled: MIGRATION_CONFIG.FALLBACK_TO_OLD_SYSTEM
});

app.use('/api/v2', authLimiter);
app.use('/api/v2/auth', authWorkspaceRoutes);
app.use('/api/v2/conversations', conversationsWorkspaceRoutes);
app.use('/api/v2/calls', callsWorkspaceRoutes);
app.use('/api/v2/contacts', contactsWorkspaceRoutes);
app.use('/api/v2/analytics', analyticsWorkspaceRoutes);
app.use('/api/v2/social-connections', socialConnectionsWorkspaceRoutes);
app.use('/api/v2/agents', agentsWorkspaceRoutes);
app.use('/api/v2/tasks', tasksWorkspaceRoutes);
app.use('/api/v2/notes', notesWorkspaceRoutes);

// Social webhooks (sin autenticación, verificación interna)
app.use('/api/webhooks', publicLimiter, webhooksSocialRoutes);

// Public routes (no auth) for automation tools like n8n
app.use('/api/public', publicLimiter);
app.use('/api/public/conversations', conversationsPublicRoutes);

// Conditional routing based on migration config
if (MIGRATION_CONFIG.ENABLE_WORKSPACE_ROUTES) {
  // Primary routes use workspace system
  app.use('/api', authLimiter);
  app.use('/api/auth', authWorkspaceRoutes);
  app.use('/api/conversations', conversationsWorkspaceRoutes);
  app.use('/api/contacts', contactsWorkspaceRoutes);
  app.use('/api/analytics', analyticsWorkspaceRoutes);
  app.use('/api/social-connections', socialConnectionsWorkspaceRoutes);
  app.use('/api/agents', agentsWorkspaceRoutes);
  app.use('/api/calls', callsWorkspaceRoutes);
  app.use('/api/tasks', tasksWorkspaceRoutes);
  app.use('/api/notes', notesWorkspaceRoutes);
  console.log('🚀 Using NEW workspace-based routes as primary');
} else {
  // Primary routes use legacy system
  app.use('/api/auth', authRoutes);
  app.use('/api/conversations', authMiddleware, conversationRoutes);
  app.use('/api/contacts', contactRoutes);
  app.use('/api/analytics', authMiddleware, analyticsRoutes);
  console.log('📊 Using LEGACY routes as primary');
}

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});

export default app; 