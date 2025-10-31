import { Response, NextFunction } from 'express';
import { authService } from '../services/AuthService.js';
import { AuthRequest, Role } from '../types/index.js'; // Import the new 'Role' type
import jwt from 'jsonwebtoken'; // --- FIX: Import the default object ---

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    // --- OPTIMIZATION: Specific error handling ---
    
    // --- FIX: Check errors as properties of the default 'jwt' import ---
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Fallback for unexpected errors
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * --- OPTIMIZATION: Type-Safe Roles ---
 * By using '...roles: Role[]' instead of '...roles: string[]',
 * TypeScript will now give you a compile-time error if you
 * try to use a role that doesn't exist.
 * * e.g., `requireRole('USER')` -> OK
 * e.g., `requireRole('ADMIN')` -> OK
 * e.g., `requireRole('USSER')` -> TypeScript Error!
 */
export const requireRole = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // This check is perfect.
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

