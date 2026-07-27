import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'gestao-rural-local-jwt-secret-2026';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];

  // 1. Try custom JWT
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { uid: string; email?: string };
    if (decoded && decoded.uid) {
      req.user = decoded;
      return next();
    }
  } catch (err) {
    // Ignore, try Firebase Admin token next
  }

  // 2. Try Firebase token
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    return next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
