import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
export declare function getTasks(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function getTask(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function createTask(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function updateTask(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function deleteTask(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function updateTaskStatus(req: AuthenticatedRequest, res: Response): Promise<void>;
export declare function getTodayTasks(req: AuthenticatedRequest, res: Response): Promise<void>;
//# sourceMappingURL=task.controller.d.ts.map