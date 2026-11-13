import * as input from './validation.js';
import { send } from '../../utils/response.js';
export function authController(service) {
    return {
        register: async (req, res) => { send(res, await service.register(input.registerInput.parse(req.body)), 201); },
        verify: async (req, res) => { send(res, await service.verify(input.credentialInput.parse(req.body).credential)); },
        resend: async (req, res) => { send(res, await service.resend(input.emailInput.parse(req.body).email)); },
        login: async (req, res) => { const body = input.loginInput.parse(req.body); send(res, await service.login(body.email, body.password)); },
        refresh: async (req, res) => { send(res, await service.refresh(input.refreshInput.parse(req.body).refreshToken)); },
        logout: async (req, res) => { await service.logout(req.auth.sessionId); res.status(204).end(); },
        forgot: async (req, res) => { send(res, await service.forgot(input.emailInput.parse(req.body).email)); },
        reset: async (req, res) => { const body = input.resetInput.parse(req.body); send(res, await service.reset(body.credential, body.password)); },
    };
}
//# sourceMappingURL=controller.js.map