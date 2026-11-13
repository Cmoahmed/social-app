import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { config } from '../config/index.js';
import { AppError } from '../errors/app-error.js';
import { Session, User } from '../models/index.js';
// Question 17: Reopen
declare global {
  namespace Express { interface Request { auth: { userId: string; sessionId: string } } }
}
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new Error();
    const payload = jwt.verify(header.slice(7), config.JWT_SECRET, { algorithms: ['HS256'], issuer: 'social-app', audience: 'social-app-api' });
    if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string' ||
      !Types.ObjectId.isValid(payload.sub) || !Types.ObjectId.isValid(payload.sid)) throw new Error();
    const [session, user] = await Promise.all([
      Session.exists({ _id: payload.sid, user: payload.sub, revoked: false, expiresAt: { $gt: new Date() } }),
      User.findById(payload.sub).select('+authVersion'),
    ]);
    if (!session || !user || user.authVersion !== payload.ver) throw new Error();
    req.auth = { userId: payload.sub, sessionId: payload.sid };
    next();
  } catch { next(new AppError(401, 'Authentication required')); }
};
