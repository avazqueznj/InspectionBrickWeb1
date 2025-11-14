import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "./jwt";

// Extend Express Request to include auth
export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    companyId: string | null; // null for superusers
    isSuperuser: boolean;
    isDeviceToken: boolean;
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
