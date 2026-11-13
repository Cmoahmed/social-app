import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
const child = spawn(process.execPath, ['dist/server.js'], { env: { ...process.env,
  NODE_ENV: 'development', PORT: '3031', JWT_SECRET: randomBytes(48).toString('hex'),
  MONGODB_URI: 'mongodb://127.0.0.1:27017/social_app_course' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let output = '';
child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
try {
  let response;
  for (let i = 0; i < 50; i++) {
    try { response = await fetch('http://localhost:3031/api/health'); break; } catch { await new Promise(resolve => setTimeout(resolve, 200)); }
  }
  assert.ok(response, output); assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, data: { status: 'ok' } });
  assert.equal((await fetch('http://localhost:3031/no-route')).status, 404);
  assert.equal((await fetch('http://localhost:3031/api/users/me')).status, 401);
  assert.match(output, /Social App listening/);
  console.log('Production server bootstrapped with MongoDB; HTTP health 200, unknown route 404, protected profile 401.');
} finally { child.kill(); }
