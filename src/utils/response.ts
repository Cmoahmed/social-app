import type { Response } from 'express';
// Question 21: Generics
export interface ApiResult<T> { success: true; data: T }
// Question 29: Response Formatter
export function send<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data } satisfies ApiResult<T>);
}
