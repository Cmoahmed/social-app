# Setup and testing

Follow the root README for Node 24, MongoDB, Mailpit and private environment configuration. `npm ci` installs the exact lockfile. Development uses ESM and NodeNext; emitted `.js` imports are resolved from TypeScript during development and from `dist` after build.

## Verification commands

| Command | Scope / prerequisites |
| --- | --- |
| `npm run typecheck` | Backend, course examples and TypeScript tests; no services needed |
| `npm run check:examples` | Same compiler check, including course examples |
| `npm run build` | Compile only `src` into ignored `dist`; no services needed |
| `npm test` | Vitest OOP and API tests; mocks email and Google |
| `npm run validate:artifacts` | Parse Postman JSON, compile scripts, check empty exported variables and 43 question references |
| `npm run smoke` | Starts compiled backend on port 3031; requires MongoDB on localhost:27017 |
| `npm run postman:run` | Build and execute the collection against an already running backend using local Postman variables |

API tests use mongodb-memory-server by default, which may download a MongoDB executable. Network restrictions or missing binaries can prevent its startup. Alternatively set `TEST_MONGODB_URI` to a disposable MongoDB database named `social_app_course_test`. **Tests delete users, sessions, credentials and follows in that database before and after the suite. Never point this variable at valuable data.** The application uses `social_app_course`, separately from tests.

The smoke test checks health 200, unknown route 404 and unauthenticated profile 401. Mailpit is needed for manual registration/reset flows; automated API tests inject a fake mailer. Live Google authorization requires browser consent and private OAuth configuration; provider behavior is mocked in automated tests.

## Recovery provenance

The original repository contained source, course examples and tests but no README, docs, TypeScript configuration or Postman folder. The adjacent Desktop docs and Postman directories belong to a different Saraha backend, so they were not copied. These supporting files were reconstructed from this Social App's actual routes, validators, services and numbered source comments. The existing safe `.env.example` was retained. The public Postman documentation URL was retained as a historical reference; the local regenerated collection is the source of truth for this implementation.

Question mapping establishes implementation traceability, not evidence that a test passed. Current command results are recorded separately in TEST_RESULTS.md.
