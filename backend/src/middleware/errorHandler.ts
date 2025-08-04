import { Request, Response, NextFunction } from 'express';

// Custom error class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Create error utility
export const createError = (message: string, statusCode: number) => {
  return new AppError(message, statusCode);
};

// Async handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error handling middleware
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode = 500, message } = error;

  // Log error
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.code === 'PGRST116') {
    statusCode = 404;
    message = 'Record not found';
  } else if (error.code === '23505') {
    statusCode = 409;
    message = 'Duplicate entry';
  } else if (error.code === '23503') {
    statusCode = 400;
    message = 'Foreign key constraint violation';
  } else if (error.code === '42P01') {
    statusCode = 500;
    message = 'Table does not exist';
  } else if (error.code === '42703') {
    statusCode = 500;
    message = 'Column does not exist';
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    message = statusCode === 500 ? 'Internal Server Error' : message;
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}; 