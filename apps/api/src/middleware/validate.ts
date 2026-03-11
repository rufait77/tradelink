import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from './errorHandler';

// Validates req.body against a Zod schema
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.errors[0];
      return next(
        new AppError(firstError.message, 422, 'VALIDATION_ERROR')
      );
    }
    req.body = result.data;
    next();
  };
}

// Validates req.query against a Zod schema
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const firstError = result.error.errors[0];
      return next(new AppError(firstError.message, 422, 'VALIDATION_ERROR'));
    }
    (req as any).validatedQuery = result.data;
    next();
  };
}
