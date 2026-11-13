import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { config } from '../../config/index.js';
import { Credential, Session, User } from '../../models/index.js';
import { AppError } from '../../errors/app-error.js';
import { digest, randomToken } from '../../utils/crypto.js';
// Question 28: Auth Service
export class AuthService {
    mailer;
    constructor(mailer) {
        this.mailer = mailer;
    }
    async issueCredential(user, purpose) {
        const token = randomToken();
        await Credential.create({ user: user.id, purpose, tokenHash: digest(token), authVersion: user.authVersion,
            expiresAt: new Date(Date.now() + (purpose === 'verify' ? 86400 : 1800) * 1000) });
        await this.mailer.sendCredential(user.email, purpose, token);
    }
    // Question 35: User Registration and Email Verification
    async register(input) {
        const passwordHash = await bcrypt.hash(input.password, 12);
        const user = await User.create({ email: input.email, username: input.username, passwordHash });
        await this.issueCredential(user, 'verify');
        return { id: user.id, message: 'Check Mailpit for your verification credential' };
    }
    async resend(email) {
        const user = await User.findOne({ email, verified: false }).select('+authVersion');
        if (user)
            await this.issueCredential(user, 'verify');
        return { message: 'If eligible, an email has been sent' };
    }
    async verify(token) {
        const credential = await Credential.findOneAndDelete({ tokenHash: digest(token), purpose: 'verify', expiresAt: { $gt: new Date() } });
        if (!credential)
            throw new AppError(400, 'Invalid or expired verification credential');
        await User.updateOne({ _id: credential.user }, { $set: { verified: true } });
        await Credential.deleteMany({ user: credential.user, purpose: 'verify' });
        return { message: 'Email verified' };
    }
    // Question 36: Login and Session Generation
    async login(email, password) {
        const user = await User.findOne({ email }).select('+passwordHash +authVersion');
        // Always perform a hash comparison, including for unknown or Google-only accounts.
        const valid = await bcrypt.compare(password, user?.passwordHash ?? '$2b$12$KIXZVKjmJ4VqkWsDhzILUe.0kwMHkqR3IICFmFaGBc1lwY5HHl9Bu');
        if (!user || !user.passwordHash || !valid)
            throw new AppError(401, 'Invalid credentials');
        if (!user.verified)
            throw new AppError(403, 'Verify your email first');
        return this.createSession(user.id, user.authVersion);
    }
    async createSession(userId, version) {
        const user = await User.findById(userId).select('+authVersion');
        if (!user || (version !== undefined && version !== user.authVersion))
            throw new AppError(401, 'Account changed; sign in again');
        const secret = randomToken();
        const session = await Session.create({ user: userId, tokenHash: digest(secret), expiresAt: new Date(Date.now() + 7 * 86400_000) });
        const current = await User.findById(userId).select('+authVersion');
        if (!current || current.authVersion !== user.authVersion) {
            await Session.updateOne({ _id: session.id }, { $set: { revoked: true } });
            throw new AppError(401, 'Account changed; sign in again');
        }
        return this.tokens(userId, session.id, secret, user.authVersion);
    }
    tokens(userId, sessionId, secret, version) {
        return { userId, accessToken: jwt.sign({ sid: sessionId, ver: version }, config.JWT_SECRET, { subject: userId, expiresIn: '15m', issuer: 'social-app', audience: 'social-app-api', algorithm: 'HS256' }),
            refreshToken: `${sessionId}.${secret}`, expiresIn: 900 };
    }
    // Question 37: Token Refreshing and Revocation
    async refresh(token) {
        const [id, secret, extra] = token.split('.');
        if (!id || !secret || extra || !Types.ObjectId.isValid(id))
            throw new AppError(401, 'Invalid refresh token');
        const next = randomToken();
        const hash = digest(secret);
        const session = await Session.findOneAndUpdate({ _id: id, tokenHash: hash, revoked: false, expiresAt: { $gt: new Date() } }, { $set: { tokenHash: digest(next) }, $push: { previousHashes: hash } }, { returnDocument: 'after' });
        if (!session) {
            // Only a previously valid secret can revoke the session; a guessed secret cannot.
            await Session.updateOne({ _id: id, previousHashes: hash }, { $set: { revoked: true } });
            throw new AppError(401, 'Invalid, expired, or replayed refresh token');
        }
        const user = await User.findById(session.user).select('+authVersion');
        if (!user)
            throw new AppError(401, 'Invalid session');
        return this.tokens(user.id, session.id, next, user.authVersion);
    }
    async logout(sessionId) { await Session.updateOne({ _id: sessionId }, { $set: { revoked: true } }); }
    // Question 38: Password Reset Flow
    async forgot(email) {
        const user = await User.findOne({ email }).select('+passwordHash +authVersion');
        if (user?.passwordHash)
            await this.issueCredential(user, 'reset');
        return { message: 'If eligible, an email has been sent' };
    }
    async reset(token, password) {
        const passwordHash = await bcrypt.hash(password, 12);
        const credential = await Credential.findOneAndDelete({ tokenHash: digest(token), purpose: 'reset', expiresAt: { $gt: new Date() } });
        if (!credential)
            throw new AppError(400, 'Invalid or expired reset credential');
        const user = await User.findOneAndUpdate({ _id: credential.user, authVersion: credential.authVersion }, { $set: { passwordHash }, $inc: { authVersion: 1 } });
        if (!user)
            throw new AppError(400, 'Invalid or expired reset credential');
        await Session.updateMany({ user: credential.user }, { $set: { revoked: true } });
        await Credential.deleteMany({ user: credential.user, purpose: 'reset' });
        return { message: 'Password reset; sign in again' };
    }
}
//# sourceMappingURL=service.js.map