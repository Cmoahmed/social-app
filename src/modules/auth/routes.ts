import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authController } from './controller.js';
import { GoogleSignIn } from './google.js';
import type { AuthService } from './service.js';
export function authRoutes(service: AuthService) {
  const router = Router(), controller = authController(service), google = new GoogleSignIn(service);
  const routes = { register: 'register', 'verify-email': 'verify', 'resend-verification': 'resend', login: 'login', refresh: 'refresh', 'forgot-password': 'forgot', 'reset-password': 'reset' };
  for (const [path, action] of Object.entries(routes)) router.post(`/${path}`, controller[action]!);
  router.post('/logout', authenticate, controller.logout!);
  router.get('/google', google.start); router.get('/google/callback', google.callback);
  return router;
}
