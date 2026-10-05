import { Response } from 'express';

export function successResponse<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function errorResponse(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: object
) {
  const body: Record<string, unknown> = { success: false, message };
  if (errors) body['errors'] = errors;
  return res.status(statusCode).json(body);
}
