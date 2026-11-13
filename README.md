# Social App backend

TypeScript, Express 5 and MongoDB backend for registration and email verification, password login, rotating refresh sessions, password reset, Google sign-in, profiles, follow requests, search and privacy settings. Course examples accompany the backend; the [question map](docs/QUESTION_MAP.md) links all 43 assignment questions to implementation.

## Local setup

Use Node.js 24 and npm. From the project directory:

```powershell
npm ci
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Put the generated value in your local `JWT_SECRET`. Keep `.env` private. The example documents all application settings; SMTP authentication is not implemented. Default MongoDB and Mailpit settings target localhost.

Start your installed MongoDB service, or use Docker:

```powershell
docker run -d --name social-app-mongo -p 127.0.0.1:27017:27017 mongo:8
docker run -d --name social-app-mailpit -p 127.0.0.1:1025:1025 -p 127.0.0.1:8025:8025 axllent/mailpit
```

An installed Mailpit executable can instead be started with `mailpit`. Open http://localhost:8025 to retrieve verification/reset credentials. Use the database name `social_app_course`; the configuration deliberately rejects other application database names.

```powershell
npm run dev
# Or build and start:
npm run build
npm start
```

Health endpoint: http://localhost:3000/api/health. API responses use `{ success: true, data: ... }` or `{ success: false, error: { message: ... } }`.

## Checks and Postman

```powershell
npm run typecheck
npm run check:examples
npm run build
npm test
npm run validate:artifacts
npm run smoke
```

See [testing and setup](docs/SETUP_AND_TESTING.md) for database isolation and test limitations, and [Postman instructions](postman/README.md) for importing the collection, supplying local variables and running requests. No credentials or saved authenticated responses are included.

## Google sign-in

Create a Google OAuth client of type Web application in your Google Cloud project. Configure its consent screen and test users as needed. Add the exact authorized redirect URI `http://localhost:3000/api/auth/google/callback`. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI` in `.env`, then restart the backend. Open `/api/auth/google` in a browser to complete sign-in; preserve the flow cookie. The callback returns the session JSON. An existing account with the same email must use its original sign-in method. Automated Google tests mock the provider; they do not validate live credentials.
