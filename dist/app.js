import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { authRoutes } from './modules/auth/routes.js';
import { AuthService } from './modules/auth/service.js';
import { userRoutes, followRoutes } from './modules/users/routes.js';
import { SmtpMailer } from './utils/mailer.js';
import { send } from './utils/response.js';
import { notFound, errorHandler } from './middleware/errors.js';
// Question 19: Recap and Session Flow
// Question 23: Setup Project and Run Express
// Question 34: Apply Everything Learned to the Social App
// Question 33: Summary
// Bootstrap, request middleware, feature services, formatting and errors form one backend.
export function createApp(mailer = new SmtpMailer()) {
    const app = express();
    app.disable('x-powered-by');
    app.use(helmet(), express.json({ limit: '16kb' }), cookieParser());
    app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    const limit = (max) => rateLimit({ windowMs: 15 * 60_000, limit: max, standardHeaders: 'draft-8', legacyHeaders: false,
        handler: (_req, res) => { res.status(429).json({ success: false, error: { message: 'Too many requests; retry later' } }); } });
    app.get('/api/health', (_req, res) => { send(res, { status: 'ok' }); });
    app.use('/api/auth', limit(100), authRoutes(new AuthService(mailer)));
    app.use('/api/users', limit(500), userRoutes());
    app.use('/api/follows', limit(500), followRoutes());
    app.use(notFound);
    app.use(errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map