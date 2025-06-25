import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

// https://medium.com/@narcis.fanica/building-a-rest-api-with-typescript-express-prisma-zod-and-neon-db-part-6-schema-validation-09bca19a15e9
export const validate =
  (schema: AnyZodObject) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        params: req.params,
        body: req.body,
        query: req.query,
      });
      return next();
    } catch (e: any) {
      res.status(400).send(e.errors);
    }
  };

// Global error handler
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
};
