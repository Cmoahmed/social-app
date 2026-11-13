import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../errors/app-error.js';
// Question 31: Not Found Middleware
export const notFound: RequestHandler = (_req, _res, next) => next(new AppError(404, 'Route not found'));
// Question 24: Global Error Middleware
// Question 30: Response Formatter Part 2
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  let status = 500, message = 'Internal server error';
  if (error instanceof AppError) { status = error.status; message = error.message; }
  else if (error instanceof ZodError) { status = 400; message = error.issues.map(v => `${v.path.join('.')}: ${v.message}`).join('; '); }
  else if (error instanceof mongoose.Error.CastError || error instanceof mongoose.Error.ValidationError) { status = 400; message = 'Invalid data or MongoDB ID'; }
  else if (typeof error === 'object' && error && 'code' in error && error.code === 11000) { status = 409; message = 'Duplicate email, username, identity, or follow relationship'; }
  else if (error instanceof SyntaxError && 'body' in error) { status = 400; message = 'Invalid JSON'; }
  else if (typeof error === 'object' && error && 'type' in error && error.type === 'entity.too.large') { status = 413; message = 'Request too large'; }
  res.status(status).json({ success: false, error: { message } });
};
