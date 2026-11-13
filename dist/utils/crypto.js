import { createHash, randomBytes } from 'node:crypto';
export const randomToken = () => randomBytes(32).toString('base64url');
export const digest = (token) => createHash('sha256').update(token).digest('hex');
//# sourceMappingURL=crypto.js.map