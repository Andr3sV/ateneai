import { Request, Response, NextFunction } from 'express';
import { createClerkClient } from '@clerk/backend';
import { WorkspaceContext, supabase } from '../services/supabase-workspace';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

// Extend Request interface to include workspace context
declare global {
  namespace Express {
    interface Request {
      workspaceContext?: WorkspaceContext;
      clerkUserId?: string;
    }
  }
}

export async function requireWorkspaceContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('🏢 WorkspaceMiddleware: Checking authorization...');
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header found');
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }

    // 1. Verify Clerk authentication using authenticateRequest
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
        error: 'Authentication failed',
        reason: authResult.reason 
      });
      return;
    }

    console.log('✅ Clerk authentication successful');

    const auth = authResult.toAuth();
    const clerkUserId = 'userId' in auth ? auth.userId : null;
    
    if (!clerkUserId) {
      res.status(401).json({ error: 'User session required' });
      return;
    }

    req.clerkUserId = clerkUserId;
    console.log('✅ Clerk User ID:', clerkUserId);

    // 2. Get workspace context for user
    try {
      const workspaceContext = await WorkspaceContext.fromClerkUserId(clerkUserId);
      req.workspaceContext = workspaceContext;
      
      console.log(`🏢 Workspace context: User ${workspaceContext.userId} in Workspace ${workspaceContext.workspaceId}`);
      
      next();
    } catch (error) {
      console.log('🔧 User not found in workspace system, attempting auto-creation...');
      
      try {
        // Get user info from Clerk
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        const email = clerkUser.primaryEmailAddress?.emailAddress;
        
        if (!email) {
          res.status(400).json({ 
            error: 'Invalid user data',
            details: 'User email not found in Clerk'
          });
          return;
        }
        
        // Extract domain from email
        const domain = email.split('@')[1];
        
        // Look for existing workspace with this domain
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('domain', domain)
          .single();
        
        if (!workspace) {
          console.log(`❌ No workspace found for domain: ${domain}`);
          res.status(403).json({ 
            error: 'No workspace access',
            details: `No workspace found for domain: ${domain}. Please contact administrator.`
          });
          return;
        }
        
        console.log(`✅ Found workspace ${workspace.id} for domain: ${domain}`);
        
        // Create user in users_new table
        const { data: newUser, error: createUserError } = await supabase
          .from('users_new')
          .insert({
            email: email,
            clerk_user_id: clerkUserId,
            first_name: clerkUser.firstName || '',
            last_name: clerkUser.lastName || ''
          })
          .select()
          .single();
        
        if (createUserError) {
          console.error('❌ Error creating user:', createUserError);
          res.status(500).json({ 
            error: 'User creation failed',
            details: createUserError.message
          });
          return;
        }
        
        console.log(`✅ User created: ${newUser.id} (${email})`);
        
        // Assign user to workspace
        const { error: assignError } = await supabase
          .from('workspace_users')
          .insert({
            workspace_id: workspace.id,
            user_id: newUser.id,
            role: 'member'  // Default role, can be changed later
          });
        
        if (assignError) {
          console.error('❌ Error assigning user to workspace:', assignError);
          res.status(500).json({ 
            error: 'Workspace assignment failed',
            details: assignError.message
          });
          return;
        }
        
        console.log(`✅ User ${newUser.id} assigned to workspace ${workspace.id} as member`);
        
        // Create workspace context for the new user
        const workspaceContext = new WorkspaceContext(workspace.id, newUser.id);
        req.workspaceContext = workspaceContext;
        
        console.log(`🎉 Auto-created user and workspace context: User ${newUser.id} in Workspace ${workspace.id}`);
        
        next();
        
      } catch (autoCreateError) {
        console.error('❌ Auto-creation failed:', autoCreateError);
        res.status(403).json({ 
          error: 'No workspace access',
          details: 'User not assigned to any workspace and auto-creation failed'
        });
        return;
      }
    }

  } catch (error) {
    console.error('❌ Workspace auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
    return;
  }
}

// Optional: Middleware for routes that can work with or without workspace context
export async function optionalWorkspaceContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
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

        if (authResult.isAuthenticated) {
          const auth = authResult.toAuth();
          const clerkUserId = 'userId' in auth ? auth.userId : null;
          
          if (clerkUserId) {
            req.clerkUserId = clerkUserId;
            
            try {
              const workspaceContext = await WorkspaceContext.fromClerkUserId(clerkUserId);
              req.workspaceContext = workspaceContext;
            } catch {
              // Workspace context not available, but continue anyway
              console.log('⚠️  No workspace context available for user');
            }
          }
        }
      } catch {
        // Auth failed, but continue anyway
        console.log('⚠️  Optional auth failed, continuing without context');
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ Optional auth middleware error:', error);
    next(); // Continue without auth
  }
}