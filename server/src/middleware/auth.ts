import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      errorResponse(res, 'Access token required', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch {
    errorResponse(res, 'Invalid or expired token', 401);
  }
}
