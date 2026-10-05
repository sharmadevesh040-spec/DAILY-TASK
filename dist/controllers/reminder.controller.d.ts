import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
export declare function getReminders(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function createReminder(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function deleteReminder(req: AuthenticatedRequest, res: Response): Promise<void>;
//# sourceMappingURL=reminder.controller.d.ts.map