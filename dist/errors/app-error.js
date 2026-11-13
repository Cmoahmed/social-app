// Question 8: Inheritance
// Question 12: Implement Inheritance
// Question 27: Application Exception
export class AppError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
//# sourceMappingURL=app-error.js.map