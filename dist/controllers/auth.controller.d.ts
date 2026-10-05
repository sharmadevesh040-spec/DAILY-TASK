import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
export declare function register(req: Request, res: Response): Promise<void>;
export declare function login(req: Request, res: Response): Promise<void>;
export declare function getMe(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function changePassword(req: AuthenticatedRequest, res: Response): Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map