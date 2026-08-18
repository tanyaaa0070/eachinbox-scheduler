import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const data = req[source];
    const result = schema.safeParse(data);

    if (!result.success) {
      return next(result.error);
    }

    // Replace with parsed/transformed data
    if (source === 'body') {
      req.body = result.data;
    }

    next();
  };
}
