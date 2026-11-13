// Question 8: Inheritance
// Question 12: Implement Inheritance
// Question 27: Application Exception
export class AppError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
