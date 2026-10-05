import { Response } from 'express';
export declare function successResponse<T>(res: Response, data: T, message?: string, statusCode?: number): Response<any, Record<string, any>>;
export declare function errorResponse(res: Response, message: string, statusCode?: number, errors?: object): Response<any, Record<string, any>>;
//# sourceMappingURL=response.d.ts.map