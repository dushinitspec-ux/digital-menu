import type { z } from 'zod';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
    public readonly details?: unknown,
  ) {
    super(message ?? code);
  }
}

export const notFound = (what = 'not_found') => new HttpError(404, what);
export const forbidden = () => new HttpError(403, 'forbidden');
export const unauthorized = () => new HttpError(401, 'unauthorized');
export const conflict = (code: string, details?: unknown) => new HttpError(409, code, code, details);

export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    throw new HttpError(
      400,
      'validation',
      'Validation failed',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return result.data;
}

export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
