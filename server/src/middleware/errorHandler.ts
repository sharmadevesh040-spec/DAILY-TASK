import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error]', err.message, err.stack);

  // Handle Multer upload errors (size limit, invalid field, etc.)
  if (err.name === 'MulterError') {
    const isSize = (err as any).code === 'LIMIT_FILE_SIZE';
    res.status(400).json({
      success: false,
      message: isSize
        ? 'Photo size exceeds 10MB limit. Please choose a smaller photo.'
        : err.message,
    });
    return;
  }

  // Handle file validation errors
  if (err.message && err.message.includes('Invalid file type')) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  const statusCode = (err as NodeJS.ErrnoException & { statusCode?: number }).statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500 && process.env.NODE_ENV === 'production'
        ? err.message || 'Internal server error'
        : err.message,
  });
}
