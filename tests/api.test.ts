import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { LoginTicket } from 'google-auth-library';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Mailer } from '../src/utils/mailer.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/social_app_course_test';
process.env.GOOGLE_CLIENT_ID = 'mock-client';
process.env.GOOGLE_CLIENT_SECRET = 'mock-secret';
const mail: { email: string; purpose: string; token: string }[] = [];
const mailer: Mailer = { async sendCredential(email, purpose, token) { mail.push({ email, purpose, token }); } };
const { createApp } = await import('../src/app.js');
const { User, Session, Credential, Follow } = await import('../src/models/index.js');
const { GoogleSignIn, googleClient } = await import('../src/modules/auth/google.js');
const { AuthService } = await import('../src/modules/auth/service.js');
const app = createApp(mailer);
let mongo: MongoMemoryServer;
let a: string, b: string, tokenA: string, tokenB: string, refreshA: string;
const password = 'Course-password-123';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
beforeAll(async () => {
  const uri = process.env.TEST_MONGODB_URI;
  if (uri && new URL(uri).pathname !== '/social_app_course_test') throw new Error('Tests may only use social_app_course_test');
  if (!uri) mongo = await MongoMemoryServer.create({ instance: { dbName: 'social_app_course_test' } });
  await mongoose.connect(uri ?? mongo.getUri('social_app_course_test'));
  await Promise.all([User.init(), Session.init(), Credential.init(), Follow.init()]);
  await Promise.all([User.deleteMany({}), Session.deleteMany({}), Credential.deleteMany({}), Follow.deleteMany({})]);
}, 180000);
afterAll(async () => {
  if (mongoose.connection.readyState === 1) await Promise.all([User.deleteMany({}), Session.deleteMany({}), Credential.deleteMany({}), Follow.deleteMany({})]);
  await mongoose.disconnect(); await mongo?.stop();
});

describe('authentication, profiles, and privacy', () => {
  it('formats health, 404, malformed JSON and validation errors safely', async () => {
    expect((await request(app).get('/api/health')).body).toEqual({ success: true, data: { status: 'ok' } });
    expect((await request(app).get('/missing')).status).toBe(404);
    expect((await request(app).post('/api/auth/register').send({})).status).toBe(400);
    expect((await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{')).status).toBe(400);
  });
  it('registers, rejects duplicates and unverified login, expires and consumes verification', async () => {
    for (const name of ['alice', 'bob']) {
      const res = await request(app).post('/api/auth/register').send({ email: `${name}@example.test`, username: name, password });
      expect(res.status).toBe(201);
      if (name === 'alice') a = res.body.data.id; else b = res.body.data.id;
    }
    expect((await request(app).post('/api/auth/register').send({ email: 'alice@example.test', username: 'other', password })).status).toBe(409);
    expect((await request(app).post('/api/auth/login').send({ email: 'alice@example.test', password })).status).toBe(403);
    await Credential.updateMany({ user: a }, { expiresAt: new Date(0) });
    expect((await request(app).post('/api/auth/verify-email').send({ credential: mail[0]!.token })).status).toBe(400);
    expect((await request(app).post('/api/auth/resend-verification').send({ email: 'alice@example.test' })).status).toBe(200);
    for (const email of ['alice@example.test', 'bob@example.test']) {
      const token = mail.filter(v => v.email === email).at(-1)!.token;
      expect((await request(app).post('/api/auth/verify-email').send({ credential: token })).status).toBe(200);
      expect((await request(app).post('/api/auth/verify-email').send({ credential: token })).status).toBe(400);
    }
  });
  it('logs in without leaking credentials and rejects wrong passwords', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: 'alice@example.test', password: 'wrong' })).status).toBe(401);
    for (const name of ['alice', 'bob']) {
      const res = await request(app).post('/api/auth/login').send({ email: `${name}@example.test`, password });
      expect(res.status).toBe(200);
      if (name === 'alice') { tokenA = res.body.data.accessToken; refreshA = res.body.data.refreshToken; } else tokenB = res.body.data.accessToken;
    }
    const res = await request(app).get('/api/users/me').set(auth(tokenA));
    expect(res.body.data.email).toBe('alice@example.test');
    expect(res.text).not.toMatch(/passwordHash|authVersion|googleSubject/);
  });
  it('rotates atomically and revokes replayed sessions', async () => {
    const rotated = await request(app).post('/api/auth/refresh').send({ refreshToken: refreshA });
    expect(rotated.status).toBe(200);
    expect(rotated.body.data.refreshToken).not.toBe(refreshA);
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: refreshA })).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: rotated.body.data.refreshToken })).status).toBe(401);
    expect((await request(app).get('/api/users/me').set(auth(tokenA))).status).toBe(401);
    const login = await request(app).post('/api/auth/login').send({ email: 'alice@example.test', password });
    tokenA = login.body.data.accessToken; refreshA = login.body.data.refreshToken;
  });
  it('updates only own allowed fields and validates IDs', async () => {
    expect((await request(app).patch('/api/users/me').set(auth(tokenA)).send({ bio: 'Hello' })).body.data.bio).toBe('Hello');
    expect((await request(app).patch('/api/users/me').set(auth(tokenA)).send({ verified: true })).status).toBe(400);
    expect((await request(app).patch(`/api/users/${b}`).set(auth(tokenA)).send({ bio: 'bad' })).status).toBe(404);
    expect((await request(app).get('/api/users/me')).status).toBe(401);
    expect((await request(app).get('/api/users/bad-id').set(auth(tokenA))).status).toBe(400);
    expect((await request(app).get(`/api/users/${b}`).set(auth(tokenA))).text).not.toContain('bob@example.test');
  });
  it('follows public users, counts accepted relations, blocks duplicates and self-follow', async () => {
    expect((await request(app).post(`/api/users/${a}/follow`).set(auth(tokenA))).status).toBe(400);
    expect((await request(app).post(`/api/users/${b}/follow`).set(auth(tokenA))).body.data.status).toBe('ACCEPTED');
    expect((await request(app).post(`/api/users/${b}/follow`).set(auth(tokenA))).status).toBe(409);
    expect((await request(app).get(`/api/users/${b}`).set(auth(tokenA))).body.data.followers).toBe(1);
    expect((await request(app).get(`/api/users/${b}/followers`).set(auth(tokenA))).body.data.total).toBe(1);
    expect((await request(app).delete(`/api/users/${b}/follow`).set(auth(tokenA))).status).toBe(204);
  });
  it('enforces private access, pending authorization, rejection, cancellation and acceptance', async () => {
    await request(app).patch('/api/users/me/settings').set(auth(tokenB)).send({ visibility: 'PRIVATE' });
    expect((await request(app).get(`/api/users/${b}`).set(auth(tokenA))).status).toBe(403);
    let relation = await request(app).post(`/api/users/${b}/follow`).set(auth(tokenA));
    expect(relation.body.data.status).toBe('PENDING');
    expect((await request(app).get(`/api/users/${b}`).set(auth(tokenA))).status).toBe(403);
    expect((await request(app).get('/api/users/me/follow-requests').set(auth(tokenB))).body.data.total).toBe(1);
    expect((await request(app).post(`/api/follows/${relation.body.data.id}/accept`).set(auth(tokenA))).status).toBe(404);
    expect((await request(app).post(`/api/follows/${relation.body.data.id}/reject`).set(auth(tokenB))).status).toBe(200);
    await request(app).post(`/api/users/${b}/follow`).set(auth(tokenA));
    await request(app).delete(`/api/users/${b}/follow`).set(auth(tokenA));
    expect((await request(app).get('/api/users/me/follow-requests').set(auth(tokenB))).body.data.total).toBe(0);
    relation = await request(app).post(`/api/users/${b}/follow`).set(auth(tokenA));
    await request(app).post(`/api/follows/${relation.body.data.id}/accept`).set(auth(tokenB));
    expect((await request(app).get(`/api/users/${b}`).set(auth(tokenA))).status).toBe(200);
    await request(app).patch('/api/users/me/settings').set(auth(tokenB)).send({ visibility: 'PUBLIC' });
  });
  it('searches case-insensitively and excludes followed/self users from suggestions', async () => {
    const search = await request(app).get('/api/users/search?q=BO&page=1&limit=1').set(auth(tokenA));
    expect(search.body.data.items[0].username).toBe('bob');
    expect(search.text).not.toMatch(/email|bio|passwordHash/);
    expect((await request(app).get('/api/users/suggestions').set(auth(tokenA))).body.data.items).toHaveLength(0);
    expect((await request(app).get('/api/users/search?limit=999').set(auth(tokenA))).status).toBe(400);
  });
  it('resets once, invalidates sessions and old passwords, and keeps forgot responses generic', async () => {
    const known = await request(app).post('/api/auth/forgot-password').send({ email: 'alice@example.test' });
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'unknown@example.test' });
    expect(known.body).toEqual(unknown.body);
    const credential = mail.at(-1)!.token;
    expect((await request(app).post('/api/auth/reset-password').send({ credential, password: 'New-password-456' })).status).toBe(200);
    expect((await request(app).post('/api/auth/reset-password').send({ credential, password })).status).toBe(400);
    expect((await request(app).get('/api/users/me').set(auth(tokenA))).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: refreshA })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: 'alice@example.test', password })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: 'alice@example.test', password: 'New-password-456' })).status).toBe(200);
  });
  it('logs out and rejects refresh and access afterward', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'bob@example.test', password });
    const res = await request(app).post('/api/auth/logout').set(auth(login.body.data.accessToken));
    expect(res.status).toBe(204); expect(res.text).toBe('');
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: login.body.data.refreshToken })).status).toBe(401);
  });
  it('rejects invalid OAuth state and mocked unverified identity; resolves stable subjects without unsafe linking', async () => {
    expect((await request(app).get('/api/auth/google/callback?code=bad&state=bad')).status).toBe(400);
    const google = new GoogleSignIn(new AuthService(mailer));
    await expect(google.resolveUser({ sub: 'mock', email: 'google@example.test', email_verified: false })).rejects.toMatchObject({ status: 401 });
    await expect(google.resolveUser({ sub: 'mock', email: 'alice@example.test', email_verified: true })).rejects.toMatchObject({ status: 409 });
    const user = await google.resolveUser({ sub: 'mock-google-subject', email: 'google@example.test', email_verified: true });
    expect((await google.resolveUser({ sub: 'mock-google-subject', email: 'changed@example.test', email_verified: true })).id).toBe(user.id);
  });
  it('completes a mocked state/PKCE/nonce callback once and rejects failed token exchange', async () => {
    const browser = request.agent(app);
    let start = await browser.get('/api/auth/google');
    expect(start.status).toBe(302);
    let url = new URL(start.headers.location!);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    // Narrow the library's callback/Promise overloads to the Promise signatures used by the app.
    const client = googleClient as unknown as {
      getToken(options: { code: string; codeVerifier: string }): Promise<{ tokens: { id_token: string } }>;
      verifyIdToken(options: { idToken: string; audience: string }): Promise<LoginTicket>;
    };
    const exchange = vi.spyOn(client, 'getToken').mockResolvedValue({ tokens: { id_token: 'mock-id-token' } });
    const verify = vi.spyOn(client, 'verifyIdToken').mockResolvedValue(new LoginTicket('header', {
      iss: 'https://accounts.google.com', aud: 'mock-client', sub: 'mock-callback-subject',
      iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600,
      email: 'callback@example.test', email_verified: true, nonce: url.searchParams.get('nonce')!,
    }));
    let callback = await browser.get(`/api/auth/google/callback?code=mock-code&state=${url.searchParams.get('state')}`);
    expect(callback.status).toBe(200); expect(callback.body.data.accessToken).toBeTruthy();
    expect(exchange).toHaveBeenCalledWith(expect.objectContaining({ code: 'mock-code', codeVerifier: expect.any(String) }));
    expect(verify).toHaveBeenCalledWith({ idToken: 'mock-id-token', audience: 'mock-client' });
    expect((await browser.get(`/api/auth/google/callback?code=mock-code&state=${url.searchParams.get('state')}`)).status).toBe(400);
    start = await browser.get('/api/auth/google'); url = new URL(start.headers.location!);
    exchange.mockRejectedValueOnce(new Error('Exchange failed'));
    callback = await browser.get(`/api/auth/google/callback?code=bad&state=${url.searchParams.get('state')}`);
    expect(callback.status).toBe(401);
    start = await browser.get('/api/auth/google'); url = new URL(start.headers.location!);
    expect((await browser.get(`/api/auth/google/callback?error=access_denied&state=${url.searchParams.get('state')}`)).status).toBe(400);
    vi.restoreAllMocks();
  });
  it('rejects expired sessions and reset credentials independently of TTL cleanup', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'bob@example.test', password });
    const refresh = login.body.data.refreshToken as string;
    await Session.updateOne({ _id: refresh.split('.')[0] }, { expiresAt: new Date(0) });
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: refresh })).status).toBe(401);
    expect((await request(app).get('/api/users/me').set(auth(login.body.data.accessToken))).status).toBe(401);
    await request(app).post('/api/auth/forgot-password').send({ email: 'bob@example.test' });
    await Credential.updateMany({ user: b, purpose: 'reset' }, { expiresAt: new Date(0) });
    expect((await request(app).post('/api/auth/reset-password').send({ credential: mail.at(-1)!.token, password: 'Changed-password-789' })).status).toBe(400);
    expect((await request(app).post('/api/auth/reset-password').send({ credential: 'invalid-reset-credential-value', password: 'Changed-password-789' })).status).toBe(400);
  });
  it('allows only one concurrent rotation and stores only credential hashes', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'bob@example.test', password });
    const refresh = login.body.data.refreshToken as string;
    const attempts = await Promise.all([1, 2].map(() => request(app).post('/api/auth/refresh').send({ refreshToken: refresh })));
    expect(attempts.map(v => v.status).sort()).toEqual([200, 401]);
    const session = await Session.findById(refresh.split('.')[0]).select('+previousHashes');
    expect(session!.revoked).toBe(true);
    expect(JSON.stringify(session)).not.toContain(refresh.split('.')[1]);
    const user = await User.findById(b).select('+passwordHash');
    expect(user!.passwordHash).not.toBe(password); expect(user!.passwordHash).toMatch(/^\$2/);
  });
});
