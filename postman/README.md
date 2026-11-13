# Postman collection

The collection was regenerated from implemented routes: 49 requests in eight folders, Collection v2.1 format. Import the collection and environment JSON files here. Select the imported environment; all values except `baseUrl` are intentionally empty. Do not publish your populated environment or authenticated responses.

Start MongoDB, Mailpit and the backend. Locally set unique disposable `email`, `username`, `otherEmail`, `otherUsername`, a `password` and a different `newPassword` (12–72 UTF-8 bytes each). Run requests in folder order. Session tokens, user IDs and follow request IDs are captured automatically into your local environment.

This is an interactive workflow, not an unattended passing suite:

1. In registration, pause after resend and copy Alice's latest Mailpit credential into `verificationCredential`. Pause after Bob's registration and set `otherVerificationCredential` from his email.
2. In password reset, pause after requesting reset and set `resetCredential` from Mailpit.
3. Google start expects 302 when configured or 503 when disabled; redirects are disabled for that request. Complete real OAuth separately in a browser, preserving cookies. The invalid callback request tests rejection only.
4. Profiles assume Bob is initially public. Follow requests then make Bob private, reject one request and accept another. Use fresh users for another full run; existing accounts and state intentionally cause different responses.

Each request asserts its expected status. The automated API tests provide deeper assertions and mocked OAuth coverage. No live Google success or Postman execution is implied by JSON validation.

`npm run postman:run` uses Newman with the example environment by default. To run a prepared local subset, set `POSTMAN_ENVIRONMENT` to a populated private environment file, and optionally `POSTMAN_FOLDER` to a folder name. Keep that file under ignored `local-run/`. Mailpit checkpoints still require manual preparation; the untouched example will not pass a full run.
