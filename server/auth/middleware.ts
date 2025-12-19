import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "./jwt";

// Extend Express Request to include auth
export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    companyId: string | null; // null for superusers
    isSuperuser: boolean;
    customerAdminAccess: boolean;
    isDeviceToken: boolean;
    locationId?: string | null;
  };
}

/**
 * Middleware to verify JWT tokens and populate req.auth
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`❌ [Auth] Missing or invalid Authorization header`);
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token and extract claims
    const verified = await verifyToken(token);
    
    // Attach auth info to request
    req.auth = verified;
    
    next();
  } catch (error) {
    console.error('❌ [Auth] Authentication failed:', error);
    
    // Log failed authentication attempt
    logAuthFailure(req, error instanceof Error ? error.message : 'Unknown error');
    
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Rate limiting for login endpoint
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function rateLimitLogin(req: Request, res: Response, next: NextFunction) {
  const identifier = req.ip || 'unknown';
  const now = Date.now();
  
  // Clean up old entries
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  for (const [key, entry] of loginAttempts.entries()) {
    if (entry.resetTime < cutoff) {
      loginAttempts.delete(key);
    }
  }
  
  // Check rate limit
  const entry = loginAttempts.get(identifier);
  
  if (entry) {
    if (entry.count >= MAX_LOGIN_ATTEMPTS) {
      const waitTime = Math.ceil((entry.resetTime - now) / 1000 / 60);
      console.log(`⚠️ [Auth] Rate limit exceeded for ${identifier} - ${entry.count} attempts`);
      return res.status(429).json({ 
        error: `Too many login attempts. Please try again in ${waitTime} minutes.` 
      });
    }
    
    entry.count++;
  } else {
    loginAttempts.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
  }
  
  next();
}

/**
 * Reset rate limit on successful login
 */
export function resetLoginRateLimit(req: Request) {
  const identifier = req.ip || 'unknown';
  loginAttempts.delete(identifier);
}

/**
 * Audit logging for authentication failures
 */
interface AuthFailureLog {
  timestamp: Date;
  ip: string;
  userId?: string;
  reason: string;
  userAgent?: string;
}

const authFailures: AuthFailureLog[] = [];
const MAX_AUTH_FAILURE_LOGS = 1000;

function logAuthFailure(req: Request, reason: string, userId?: string) {
  const log: AuthFailureLog = {
    timestamp: new Date(),
    ip: req.ip || 'unknown',
    userId,
    reason,
    userAgent: req.headers['user-agent'],
  };
  
  authFailures.push(log);
  
  // Keep only recent failures
  if (authFailures.length > MAX_AUTH_FAILURE_LOGS) {
    authFailures.shift();
  }
  
  console.log(`🔍 [Audit] Auth failure - IP: ${log.ip}, Reason: ${reason}, User: ${userId || 'N/A'}`);
}

/**
 * Export auth failure for login endpoint to use
 */
export function logLoginFailure(req: Request, userId: string) {
  logAuthFailure(req, 'Invalid credentials', userId);
}

/**
 * Get recent auth failures (for admin monitoring)
 */
export function getAuthFailures(limit: number = 100): AuthFailureLog[] {
  return authFailures.slice(-limit);
}

/**
 * Middleware to require superuser access (supports both JWT and session auth)
 */
export async function requireSuperuser(req: AuthRequest, res: Response, next: NextFunction) {
  // Try JWT first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const verified = await verifyToken(token);
      req.auth = verified;
      
      // Check if user is superuser
      if (!verified.isSuperuser) {
        console.log(`❌ [Auth] Superuser access denied for JWT user: ${verified.userId}`);
        return res.status(403).json({ error: "Superuser access required" });
      }
      
      return next();
    } catch (error) {
      console.error('❌ [Auth] JWT authentication failed:', error);
      logAuthFailure(req, error instanceof Error ? error.message : 'Unknown error');
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }
  
  // Fall back to session (legacy)
  if (req.session.userId) {
    console.log(`⚠️  [Auth] Using legacy session auth for user: ${req.session.userId}`);
    
    // Check if session user is superuser (companyId must be EXPLICITLY null, not undefined)
    if (req.session.companyId !== null) {
      console.log(`❌ [Auth] Superuser access denied for session user: ${req.session.userId} (companyId: ${req.session.companyId || 'undefined'})`);
      return res.status(403).json({ error: "Superuser access required" });
    }
    
    // Double-check: companyId must be explicitly null (not undefined)
    if (req.session.companyId === undefined) {
      console.log(`❌ [Auth] Superuser access denied for session user: ${req.session.userId} (companyId is undefined, not null)`);
      return res.status(403).json({ error: "Superuser access required" });
    }
    
    // Populate req.auth from session for compatibility
    req.auth = {
      userId: req.session.userId,
      companyId: null,
      isSuperuser: true,
      customerAdminAccess: true,
      isDeviceToken: false,
    };
    return next();
  }
  
  console.log(`❌ [Auth] No authentication provided`);
  return res.status(401).json({ error: "Authentication required" });
}

/**
 * Middleware to require customer admin access (superuser OR customerAdminAccess)
 * Used for layouts and inspection-types management
 */
export async function requireCustomerAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  // Try JWT first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const verified = await verifyToken(token);
      req.auth = verified;
      
      // Check if user is superuser or has customerAdminAccess
      if (!verified.isSuperuser && !verified.customerAdminAccess) {
        console.log(`❌ [Auth] Customer admin access denied for JWT user: ${verified.userId}`);
        return res.status(403).json({ error: "Customer admin access required" });
      }
      
      return next();
    } catch (error) {
      console.error('❌ [Auth] JWT authentication failed:', error);
      logAuthFailure(req, error instanceof Error ? error.message : 'Unknown error');
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }
  
  // Fall back to session (legacy) - check both superuser and customerAdminAccess
  if (req.session.userId) {
    console.log(`⚠️  [Auth] Using legacy session auth for user: ${req.session.userId}`);
    
    const isSuperuser = req.session.companyId === null;
    const hasCustomerAdminAccess = req.session.customerAdminAccess === true;
    
    // Allow access if superuser OR has customerAdminAccess
    if (!isSuperuser && !hasCustomerAdminAccess) {
      console.log(`❌ [Auth] Customer admin access denied for session user: ${req.session.userId} (not superuser and no customerAdminAccess)`);
      return res.status(403).json({ error: "Customer admin access required" });
    }
    
    // Populate req.auth from session for compatibility
    req.auth = {
      userId: req.session.userId,
      companyId: req.session.companyId || null,
      isSuperuser,
      customerAdminAccess: isSuperuser || hasCustomerAdminAccess,
      isDeviceToken: false,
    };
    return next();
  }
  
  console.log(`❌ [Auth] No authentication provided`);
  return res.status(401).json({ error: "Authentication required" });
}
