# Origin frontend

Responsive Next.js and TypeScript frontend for the Origin product-verification platform.

## Run locally

1. Install Node.js 20.9 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_BASE_URL`.
4. Start the development server with `npm run dev`.

The default API base is `/api/v1`, so the frontend expects the API to be available from the same origin. For a separate API origin, set `NEXT_PUBLIC_API_BASE_URL` to its `/api/v1` URL and configure the API for credentialed CORS requests from the frontend origin. The server must issue the session cookie with appropriate `HttpOnly`, `Secure`, and `SameSite` attributes.

## Checks

- `npm test` runs the focused API-session, role-access, and user-payload tests.
- `npm run lint` checks the source with ESLint.
- `npm run typecheck` runs the TypeScript compiler.
- `npm run build` creates the production build.

## Integration notes

- The client uses only endpoints in the supplied API contract and sends browser credentials with each request.
- The session cookie is never read by JavaScript. CSRF data is held in module memory and is not persisted. A reload calls `GET /auth/me` and accepts a CSRF token there if the response includes one; otherwise, the supplied contract provides no way to recover the login-only token, so the API needs a documented refresh mechanism if protected mutations must work immediately after a reload. No undocumented endpoint is called here.
- API response collections support either a bare array or an object containing an array. Single-resource data can be returned directly or in a `data` envelope. Field names and validation details are surfaced from API responses where provided.
- Company and platform permissions are reflected in navigation and controls, but API authorization remains authoritative. The active company ID comes only from the signed-in user’s memberships; company IDs are never submitted as request-body tenant selectors.
- Product and batch IDs can be chosen from their list views. For policy and batch-item endpoints, their identifiers are carried in the workspace URL so the selected resource can be reopened. Verification codes, session cookies, and CSRF tokens are not written to browser storage. Print export downloads are requested as authenticated one-time responses.
- A dedicated API schema or running backend was not present in the workspace. Resource fields not specified by the contract (for example policy and plan definitions) are submitted as JSON objects so the backend’s actual schema remains authoritative. The UI displays no fabricated platform metrics.

## Main routes

- `/` public marketing; `/register-company` submits company-only registration through `POST /auth/register-company` and does not create a user account
- `/login`, `/forgot-password`, `/reset-password`, `/verify-email`, `/resend-verification`, `/invitations/accept`
- `/verify` and `/verify/[publicToken]` public product verification
- `/workspace` and `/workspace/[section]` company areas
- `/platform` and `/platform/[section]` platform administration; `/platform/companies/new` is platform-authorized company onboarding
- `/account` account summary and logout-all

Public user registration is intentionally not offered. Public company registration submits only `companyName`; the platform-authorized onboarding page remains available to create a company and its first Admin.
