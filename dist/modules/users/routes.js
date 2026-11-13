import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { send } from '../../utils/response.js';
import * as service from './service.js';
import * as input from './validation.js';
import * as follows from '../follows/service.js';
export function userRoutes() {
    const router = Router();
    router.use(authenticate);
    router.get('/me', async (req, res) => { send(res, await service.getProfile(req.auth.userId, req.auth.userId)); });
    router.patch('/me', async (req, res) => { send(res, await service.updateProfile(req.auth.userId, input.profileInput.parse(req.body))); });
    router.get('/me/settings', async (req, res) => { send(res, { visibility: (await service.requireUser(req.auth.userId)).visibility }); });
    router.patch('/me/settings', async (req, res) => { send(res, await service.setVisibility(req.auth.userId, input.settingsInput.parse(req.body).visibility)); });
    router.get('/me/follow-requests', async (req, res) => { const p = input.pageInput.parse(req.query); send(res, await follows.incoming(req.auth.userId, p.page, p.limit)); });
    router.get('/search', async (req, res) => { send(res, await service.discover(req.auth.userId, input.pageInput.parse(req.query), false)); });
    router.get('/suggestions', async (req, res) => { send(res, await service.discover(req.auth.userId, input.pageInput.parse(req.query), true)); });
    router.get('/:id', async (req, res) => { send(res, await service.getProfile(req.auth.userId, input.idInput.parse(req.params.id))); });
    for (const direction of ['followers', 'following']) {
        router.get(`/:id/${direction}`, async (req, res) => { const p = input.pageInput.parse(req.query); send(res, await follows.list(req.auth.userId, input.idInput.parse(req.params.id), direction, p.page, p.limit)); });
    }
    router.post('/:id/follow', async (req, res) => { send(res, await follows.follow(req.auth.userId, input.idInput.parse(req.params.id)), 201); });
    router.delete('/:id/follow', async (req, res) => { await follows.unfollow(req.auth.userId, input.idInput.parse(req.params.id)); res.status(204).end(); });
    return router;
}
export function followRoutes() {
    const router = Router();
    router.use(authenticate);
    for (const action of ['accept', 'reject'])
        router.post(`/:id/${action}`, async (req, res) => { send(res, await follows.decide(req.auth.userId, input.idInput.parse(req.params.id), action === 'accept')); });
    return router;
}
//# sourceMappingURL=routes.js.map