import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import { config } from '../../config/index.js';
import { AppError } from '../../errors/app-error.js';
import { User } from '../../models/index.js';
import { randomToken } from '../../utils/crypto.js';
import { send } from '../../utils/response.js';
export const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI);
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: config.NODE_ENV === 'production', path: '/api/auth/google' };
// Question 39: OAuth 2.0 Integration — Google Sign-In
export class GoogleSignIn {
    auth;
    flows = new Map();
    constructor(auth) {
        this.auth = auth;
    }
    start = async (_req, res) => {
        if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET)
            throw new AppError(503, 'Configure Google OAuth credentials first');
        for (const [key, flow] of this.flows)
            if (flow.expires <= Date.now())
                this.flows.delete(key);
        if (this.flows.size >= 1000)
            throw new AppError(503, 'Please retry later');
        const key = randomToken(), state = randomToken(), nonce = randomToken();
        const { codeVerifier, codeChallenge } = await googleClient.generateCodeVerifierAsync();
        this.flows.set(key, { state, verifier: codeVerifier, nonce, expires: Date.now() + 600_000 });
        res.cookie('oauth_flow', key, { ...cookieOptions, maxAge: 600_000 });
        res.redirect(googleClient.generateAuthUrl({ scope: ['openid', 'email', 'profile'], state, nonce,
            code_challenge: codeChallenge, code_challenge_method: CodeChallengeMethod.S256 }));
    };
    callback = async (req, res) => {
        res.set('Cache-Control', 'no-store');
        const key = req.cookies?.oauth_flow;
        const flow = key ? this.flows.get(key) : undefined;
        if (key)
            this.flows.delete(key);
        res.clearCookie('oauth_flow', cookieOptions);
        if (!flow || flow.expires <= Date.now() || req.query.state !== flow.state)
            throw new AppError(400, 'Invalid or expired OAuth state');
        if (req.query.error || typeof req.query.code !== 'string')
            throw new AppError(400, 'Google sign-in cancelled or failed');
        try {
            const { tokens } = await googleClient.getToken({ code: req.query.code, codeVerifier: flow.verifier });
            if (!tokens.id_token)
                throw new Error();
            const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token, audience: config.GOOGLE_CLIENT_ID });
            const identity = ticket.getPayload();
            if (!identity || !identity.sub || !identity.email || !identity.email_verified || identity.nonce !== flow.nonce)
                throw new Error();
            const user = await this.resolveUser(identity);
            return send(res, await this.auth.createSession(user.id));
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            throw new AppError(401, 'Google identity verification failed');
        }
    };
    async resolveUser(identity) {
        if (!identity.email_verified || !identity.email || !identity.sub)
            throw new AppError(401, 'Verified Google email required');
        const existing = await User.findOne({ googleSubject: identity.sub });
        if (existing)
            return existing;
        const email = identity.email.toLowerCase();
        if (await User.exists({ email }))
            throw new AppError(409, 'An account with this email exists; use its original sign-in method');
        return User.create({ email, googleSubject: identity.sub, verified: true,
            username: `google_${randomToken().slice(0, 20).toLowerCase().replace(/-/g, '_')}`, displayName: (identity.name ?? '').slice(0, 80) });
    }
}
//# sourceMappingURL=google.js.map