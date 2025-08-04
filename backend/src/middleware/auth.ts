import { Request, Response, NextFunction } from 'express';
import { createClerkClient } from '@clerk/backend';
import { db } from '../services/supabase';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
});

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        clerk_user_id: string;
        client_id?: string;
      };
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('🔐 AuthMiddleware: Checking authorization...');
    const authHeader = req.headers.authorization;
    console.log('🔐 Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header found');
      res.status(401).json({
        success: false,
        error: 'No authorization token provided'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Use authenticateRequest() to verify the session token
      // Convert Express Request to Fetch API Request
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const headers = new Headers();
      Object.entries(req.headers).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          headers.set(key, value);
        }
      });
      
      const fetchRequest = new Request(url, {
        method: req.method,
        headers,
      });

      const authResult = await clerkClient.authenticateRequest(fetchRequest, {
        secretKey: process.env.CLERK_SECRET_KEY,
        publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      });

      if (!authResult.isAuthenticated) {
        console.log('❌ Clerk authentication failed:', authResult.reason);
        res.status(401).json({
          success: false,
          error: 'Authentication failed',
          reason: authResult.reason
        });
        return;
      }
      
      console.log('✅ Clerk authentication successful');

      const auth = authResult.toAuth();
      // Check if it's a session token (user auth) vs machine auth
      const clerkUserId = 'userId' in auth ? auth.userId : null;
      
      if (!clerkUserId) {
        res.status(401).json({
          success: false,
          error: 'User session required'
        });
        return;
      }
      
      console.log('✅ Clerk User ID:', clerkUserId);

      // Get user info from Clerk
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      
      // Get client information from database
      try {
        const client = await db.getClientByClerkId(clerkUserId);
        
        req.user = {
          id: client.id.toString(),
          email: client.email || clerkUser.primaryEmailAddress?.emailAddress || '',
          clerk_user_id: clerkUserId,
          client_id: client.id.toString()
        };
      } catch (error) {
        // If client doesn't exist, create one
        const newClient = await db.createClient({
          email: clerkUser.primaryEmailAddress?.emailAddress || `user-${clerkUserId}@example.com`,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || `User ${clerkUserId}`,
          clerk_user_id: clerkUserId,
          settings: {}
        });

        req.user = {
          id: newClient.id.toString(),
          email: newClient.email || '',
          clerk_user_id: clerkUserId,
          client_id: newClient.id.toString()
        };
      }

      next();
    } catch (clerkError) {
      console.error('Clerk token verification failed:', clerkError);
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
    return;
  }
};

export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clerkUserId = req.headers['clerk-user-id'] as string;
    
    if (!clerkUserId) {
      next(); // Continue without user
      return;
    }

    try {
      const client = await db.getClientByClerkId(clerkUserId);
      req.user = {
        id: client.id.toString(),
        email: client.email || '',
        clerk_user_id: clerkUserId,
        client_id: client.id.toString()
      };
    } catch (error) {
      // User not found, continue without user
    }

    next();
  } catch (error) {
    // Continue without user
    next();
  }
}; 