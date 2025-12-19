import type { Request, Response, NextFunction } from "express";
import { verifyToken, VerifiedToken } from "./jwt";
import { AUTH_COOKIE_NAME } from "./config";

// Extend Express Request to include auth
export interface AuthRequest extends Request {
  auth?: VerifiedToken;
}

/**
 * Extract JWT token from cookie or Authorization header
 * - Web clients: JWT in httpOnly cookie
 * - Device clients: JWT in Authorization header
 */
function extractToken(req: Request): string | null {
  // First check cookie (for web clients)
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (cookieToken) {
    return cookieToken;
  }
  
  // Fall back to Authorization header (for device clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * Middleware to require authentication (JWT from cookie or header)
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const verified = await verifyToken(token);
    req.auth = verified;
    next();
  } catch (error) {
    console.error('❌ [Auth] Authentication failed:', error);
    logAuthFailure(req, error instanceof Error ? error.message : 'Unknown error');
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware to require superuser access
 */
export async function requireSuperuser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const verified = await verifyToken(token);
    req.auth = verified;
    
    if (!verified.isSuperuser) {
      console.log(`❌ [Auth] Superuser access denied for user: ${verified.userId}`);
      return res.status(403).json({ error: "Superuser access required" });
    }
    
    next();
  } catch (error) {
    console.error('❌ [Auth] Authentication failed:', error);
    logAuthFailure(req, error instanceof Error ? error.message : 'Unknown error');
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware to require customer admin access (superuser OR customerAdminAccess)
 */
export async function requireCustomerAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const verified = await verifyToken(token);
    req.auth = verified;
    
    if (!verified.isSuperuser && !verified.customerAdminAccess) {
      console.log(`❌ [Auth] Customer admin access denied for user: ${verified.userId}`);
      return res.status(403).json({ error: "Customer admin access required" });
    }
    
    next();
  } catch (error) {
    console.error('❌ [Auth] Authentication failed:', error);
    logAuthFailure(req, error instanceof Error ? error.message : 'Unknown error');
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware for device-only endpoints (requires Authorization header, not cookie)
 */
export async function requireDeviceAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Device token required in Authorization header" });
    }
    
    const token = authHeader.substring(7);
    const verified = await verifyToken(token);
    req.auth = verified;
    next();
  } catch (error) {
    console.error('❌ [Auth] Device authentication failed:', error);
    logAuthFailure(req, error instanceof Error ? error.message : 'Unknown error');
    return res.status(401).json({ error: "Invalid or expired device token" });
  }
}

// Rate limiting for login
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export function rateLimitLogin(req: Request, res: Response, next: NextFunction) {
  const identifier = req.ip || 'unknown';
  const now = Date.now();
  
  // Clean up old entries
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  loginAttempts.forEach((entry, key) => {
    if (entry.resetTime < cutoff) {
      loginAttempts.delete(key);
    }
  });
  
  const entry = loginAttempts.get(identifier);
  
  if (entry) {
    if (entry.count >= MAX_LOGIN_ATTEMPTS) {
      const waitTime = Math.ceil((entry.resetTime - now) / 1000 / 60);
      console.log(`⚠️ [Auth] Rate limit exceeded for ${identifier}`);
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

export function resetLoginRateLimit(req: Request) {
  const identifier = req.ip || 'unknown';
  loginAttempts.delete(identifier);
}

// Auth failure logging
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
  
  if (authFailures.length > MAX_AUTH_FAILURE_LOGS) {
    authFailures.shift();
  }
  
  console.log(`🔍 [Audit] Auth failure - IP: ${log.ip}, Reason: ${reason}, User: ${userId || 'N/A'}`);
}

export function logLoginFailure(req: Request, userId: string) {
  logAuthFailure(req, 'Invalid credentials', userId);
}

export function getAuthFailures(limit: number = 100): AuthFailureLog[] {
  return authFailures.slice(-limit);
}
