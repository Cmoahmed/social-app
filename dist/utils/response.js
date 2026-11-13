// Question 29: Response Formatter
export function send(res, data, status = 200) {
    return res.status(status).json({ success: true, data });
}
//# sourceMappingURL=response.js.map