# API Test Report

Date: 2026-07-14  
Project: Node.js / Express / MongoDB e-commerce backend  
Result: **Partially working**

## 1. Executive summary

The main user flows work in an isolated test database: registration, email verification, login, access-token rejection, forgot/reset password, normal admin authorization, public category/product/banner reads, cart operations, banner creation, and COD order placement. The backend is **not ready for production** because refresh tokens can be replayed, concurrent refresh requests all succeed, logout does not revoke tokens, bearer/verification tokens are written to logs, upload limits/type validation are absent, and several malformed IDs produce HTTP 500 responses.

No production database was used. Supertest mounted the existing routers in-process and Mongoose connected only to MongoDB Memory Server (`127.0.0.1`, generated `test` database). Collections were cleared after every test and the memory database was destroyed after the suite. No production file under `src/` was changed during this test pass.

## 2. Test summary

| Metric | Result |
|---|---:|
| Test suites | 1 |
| Total tests | 66 |
| Passed | 51 |
| Failed | 11 |
| Skipped | 4 |
| Jest snapshots | 0 |
| Overall | Partially working |

The skipped tests require real third-party systems and credentials: Razorpay, AWS S3, Cloudinary, and SMTP. They were deliberately not called to avoid charges, external writes, and production side effects.

Post-report remediation: password-reset tokens are now stored only as SHA-256 hashes, expire after 15 minutes by default, are consumed atomically once, and are no longer printed as reset links. The focused password-reset suite passes all 7 tests, including expiry and reuse rejection.

A reviewable migration command, `npm run migrate:clear-legacy-reset-tokens`, was added to remove historical `Resettoken` values. It was not executed against any persistent database during testing.

## 3. Test environment and startup safety

- Production/inferred base URL: `http://localhost:3000/api/v1`
- User prefix: `http://localhost:3000/api/v1/user`
- Admin prefix: `http://localhost:3000/api/v1/admin`
- Test transport: Supertest in-process server; no public TCP listener was opened.
- Database: MongoDB Memory Server only.
- Storage during API tests: `IMAGE_STORAGE_PROVIDER=local`.
- Email: Nodemailer transport mocked; no email was sent.
- Test files: `jest.config.js`, `tests/test-app.js`, `tests/api.test.js`.
- Machine-readable result: `tests/jest-results.json`.

Installed test dependencies:

- `jest@30.4.2`
- `supertest@7.2.2`
- `mongodb-memory-server@11.2.0`

Run command:

```powershell
npm test
```

MongoDB Memory Server normally downloads its matching test binary automatically. In the restricted test environment, a temporary local `mongod` binary was supplied with `MONGOMS_SYSTEM_BINARY`; it was used only by the disposable test database.

## 4. Structure and configuration inspection

The project already has clear canonical router groups in `src/admin/admin.routes.js` and `src/user/user.routes.js`, shared models in `src/models`, shared middleware in `src/middlewares`, shared business logic in `src/services`, and pluggable image storage in `src/storage`.

Important structural findings:

1. `src/index.js` connects to MongoDB and starts listening at module import time and does not export the Express app. This makes safe integration testing difficult and required a test-only app factory that mounts the same routers.
2. Canonical routes coexist with many backward-compatible aliases (`/api/v1/product`, `/api/v1/cart`, and others). This doubles the exposed API surface and can cause documentation/security-policy drift.
3. Naming is inconsistent in some public paths (`all-product`, `get-all`, `Update-settings`) and environment variables contain legacy misspellings (`mango_url`, `acess_token`). Renaming requires a compatibility migration.
4. The production app has no final JSON 404/error middleware.
5. `cors({ origin: "*" })` is used globally.

Required/used environment variables found during inspection (values were not included in this report):

| Area | Variables |
|---|---|
| Server/database | `port`, `mango_url` |
| JWT/password | `acess_token`, `refresh_token`, `SECRET_KEY` |
| Frontend/password reset | `FRONTEND_URL`, `RESET_PASSWORD_FRONTEND_URL`, optional `PASSWORD_RESET_TOKEN_TTL_MINUTES` (default 15) |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `EMAIL`, `EMAIL_PASSWORD`, `EMAIL_FROM_NAME` |
| Image provider | `IMAGE_STORAGE_PROVIDER`, `USE_CLOUDINARY` |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| AWS S3 | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET_NAME`, optional `AWS_CLOUDFRONT_URL` |
| Payment | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |

The configured project port is **3000**, not 5000.

## 5. Endpoint test report

### Authentication and account lifecycle

| Method | Endpoint/scenario | Expected | Actual | Status |
|---|---|---:|---:|---|
| GET | `/api/v1/user/auth/` | 200 | 200 | Pass |
| POST | `/api/v1/user/auth/create` valid | 201, no password returned | 201, password omitted | Pass |
| POST | `/api/v1/user/auth/create` empty body | 400 | 400 | Pass |
| POST | `/api/v1/user/auth/create` duplicate | 400 | 400 | Pass |
| POST | `/api/v1/user/auth/create` with `role=admin` | force role `user` | role was `user` | Pass |
| POST | `/api/v1/user/auth/email-verify` missing token | 400 | 400 | Pass |
| POST | `/api/v1/user/auth/email-verify` valid token | 200 | 200 | Pass |
| POST | `/api/v1/user/auth/email-verify` invalid token | 400 | 400 | Pass |
| POST | `/api/v1/user/auth/login` valid | 200 + access/refresh tokens | 200 + tokens | Pass |
| POST | `/api/v1/user/auth/login` empty body | 400 | 400 | Pass |
| POST | `/api/v1/user/auth/login` unknown email | 400 | 400 | Pass |
| POST | `/api/v1/user/auth/login` wrong password | 401 | 401 | Pass |
| POST | `/api/v1/user/auth/login` unverified user | 401 | 401 | Pass |
| POST | `/api/v1/user/auth/login` blocked user | 403 | 403 | Pass |
| GET | `/api/v1/user/profile/get-profile` missing token | 401 | 401 | Pass |
| GET | `/api/v1/user/profile/get-profile` invalid token | 401 | 401 | Pass |
| GET | `/api/v1/user/profile/get-profile` expired token | 401 | 401 | Pass |
| GET | authenticated request logging | JWT absent from logs | full bearer JWT logged | **Fail** |
| POST | `/api/v1/user/auth/refresh-token` valid | 200 | 200 | Pass |
| POST | refresh missing token | 400 | 400 | Pass |
| POST | refresh invalid token | 401 | 401 | Pass |
| POST | refresh expired token | 401 | 401 | Pass |
| POST | reuse old refresh token after refresh | 401 | 200 | **Fail** |
| POST | five simultaneous refreshes | one 200 only | five 200 responses | **Fail** |
| POST | `/api/v1/user/auth/logout` then reuse access token | 401 on reuse | 200 on reuse | **Fail** |
| POST | `/api/v1/user/auth/forgot-password` missing email | 400 | 400 | Pass |
| POST | forgot password unknown email | current contract 404 | 404 | Pass; security concern |
| POST | forgot password known email | 200 + stored token hash/expiry | 200 + hash/expiry; no plaintext | Pass |
| POST | `/api/v1/user/auth/reset-password` empty | 400 | 400 | Pass |
| POST | reset invalid token | 404 | 404 | Pass |
| POST | reset valid token, then reuse | 200 then 404 | 200 then 404 | Pass |

### Admin authorization

| Method | Endpoint/scenario | Expected | Actual | Status |
|---|---|---:|---:|---|
| GET | `/api/v1/admin/dashboard` missing token | 401 | 401 | Pass |
| GET | dashboard as normal user | 403 | 403 | Pass |
| GET | dashboard as active admin | 200 | 200 | Pass |
| GET | dashboard as `superAdmin` | 200 | 403 | **Fail** |
| GET | dashboard as blocked admin | 403 | 403 | Pass |

### Categories, products, cart, banners, and orders

| Method | Endpoint/scenario | Expected | Actual | Status |
|---|---|---:|---:|---|
| GET | `/api/v1/user/categories/get-all` | 200 | 200 | Pass |
| POST | `/api/v1/admin/categories/create` normal user | 403 | 403 | Pass |
| POST | category missing fields | 400 | 400 | Pass |
| POST | category with valid PNG | 201 | 201 | Pass |
| POST | category with text file | 400 | 500 | **Fail** |
| POST | category with 6 MiB file | 413 | 500 | **Fail** |
| GET | `/api/v1/user/products/all-product` | 200 | 200 | Pass |
| GET | `/api/v1/user/products/product-id/:id` valid | 200 | 200 | Pass |
| GET | product with malformed ObjectId | 400 | 500 | **Fail** |
| GET | product with valid but absent ObjectId | 404 | 400 | **Fail** |
| GET | `/api/v1/user/cart/me` missing token | 401 | 401 | Pass |
| POST | `/api/v1/user/cart/add` empty | 400 | 400 | Pass |
| POST | cart add malformed product ID | 400 | 400 | Pass |
| POST/GET | cart add valid item, then fetch | 200/200 | 200/200 | Pass |
| GET | `/api/v1/user/banners/all-banners` | 200 | 200 | Pass |
| GET | banner valid but absent ID | 404 | 404 | Pass |
| POST | `/api/v1/admin/banners/create` missing admin | 401 | 401 | Pass |
| POST | banner with valid image | 201 | 201 | Pass |
| GET | `/api/v1/user/orders/my-orders` missing token | 401 | 401 | Pass |
| POST | `/api/v1/user/orders/place-order` empty | 400 | 400 | Pass |
| POST | order with malformed product ID | 400 | 400 | Pass |
| POST | valid COD order | 201 and stock -2 | 201 and stock -2 | Pass |
| GET | `/api/v1/user/orders/not-an-id` | 400 | 500 | **Fail** |
| GET | `/api/v1/admin/orders/all` as admin | 200 | 200 | Pass |
| GET | `/api/v1/admin/login-activities?page=-10&limit=invalid` | 400 | 200/defaulted values | **Fail** |

### External integration coverage

| Integration | Expected test | Actual | Status |
|---|---|---|---|
| Razorpay | Create/verify real payment | Not called | Skipped |
| AWS S3 | Upload/delete real object | Not called | Skipped |
| Cloudinary | Upload/delete real asset | Not called | Skipped |
| SMTP | Send verification/reset emails | Mocked only | Skipped |

The S3 code is wired through `IMAGE_STORAGE_PROVIDER=s3`, validates required AWS variables, uploads WebP buffers, stores the object key as `public_id`, and deletes by key. A real bucket test is still required. If the bucket is private and `AWS_CLOUDFRONT_URL` is absent, the generated direct S3 URL may not be publicly readable.

## 6. Failed test details

| # | Test and exact error | Cause | Related source | Reproduce |
|---:|---|---|---|---|
| 1 | `does not log bearer tokens`: expected logs not to contain JWT; received full Authorization header/JWT | Middleware prints all headers and authorization | `src/middlewares/auth.middleware.js`, `TokenVerify`, lines 12-13 | Call any protected user endpoint with `Authorization: Bearer <JWT>` and inspect stdout |
| 2 | `rotates and revokes the previous refresh token`: expected 401, received 200 | No refresh-token store, token family, `jti`, or consumed-token check | `src/user/controllers/auth.controller.js`, `RefreshToken`, lines 445-469 | Submit the same valid refresh token twice |
| 3 | `allows only one simultaneous refresh request`: expected 1 success, received 5 | Refresh is stateless and has no atomic rotation/replay control | Same function, lines 445-469 | Send five parallel refresh requests with one token |
| 4 | `logout revokes the current access token`: expected 401, received 200 | Logout only closes optional login activity; it does not revoke access/refresh tokens | `src/user/controllers/auth.controller.js`, `logout`, lines 268-280 | Login, logout, then reuse access token on profile endpoint |
| 5 | `allows superAdmin on admin API`: expected 200, received 403 | Middleware accepts only exact role `admin` even though model permits `superAdmin` | `src/admin/middlewares/is-admin.middleware.js`, `isAdmin`, lines 19 and 27 | Sign a JWT for an active `superAdmin`; call dashboard |
| 6 | `rejects invalid category file type with 400`: expected 400, received 500 | Multer has no `fileFilter`; invalid bytes reach Sharp and throw | `src/middlewares/image.middleware.js`, line 5; `src/storage/image-storage.service.js`, `buildProcessedImage` | Upload a `.txt` file as `User_image` |
| 7 | `rejects oversized category upload with 413`: expected 413, received 500 | Multer has no `limits.fileSize`; oversized bytes are accepted and processing fails/consumes memory | `src/middlewares/image.middleware.js`, line 5 | Upload a 6 MiB invalid image buffer |
| 8 | `returns 400 for invalid product ObjectId`: expected 400, received 500 | Mongoose CastError is caught as a generic server error | `src/services/product.service.js`, `GetProductById`, lines 167-184 | GET product ID `not-an-id` |
| 9 | `returns 404 for missing product`: expected 404, received 400 | Controller explicitly uses 400 for not found | `src/services/product.service.js`, `GetProductById`, lines 172-175 | GET a new valid ObjectId that is absent |
| 10 | `returns 400 for invalid order ObjectId`: expected 400, received 500 | Mongoose CastError is returned as a generic 500 | `src/services/order.service.js`, `GetSingleOrder`, lines 254-289 | Authenticated GET order ID `not-an-id` |
| 11 | `rejects invalid login-activity pagination`: expected 400, received 200 | Negative/invalid values are silently clamped/defaulted | `src/services/login-activity.service.js`, `GetLoginActivities`, lines 112-118 | Admin GET with `page=-10&limit=invalid` |

Jest assertion locations are in `tests/api.test.js` at lines 216, 245, 252, 260, 328, 364, 370, 381, 385, 467, and 480 respectively.

## 7. Security findings

| Severity | Finding | Affected endpoint(s) | Recommended fix |
|---|---|---|---|
| **High** | Bearer JWTs and complete request headers are logged | Every route using `TokenVerify` | Remove header/token logging; use structured logging with explicit redaction |
| **High** | User Mongoose documents, reset links, and verification links/tokens are logged | Login, forgot/reset password, registration email flow | Remove `console.log(user)` and link logging; redact secrets globally |
| **High** | Refresh tokens are replayable and all concurrent refresh requests succeed | `POST/GET /user/auth/refresh-token` | Store hashed refresh tokens with `jti`, family, expiry and revoked/used state; rotate atomically in a transaction or conditional update; revoke the whole family on replay |
| **High (resolved)** | Password-reset token was stored in plaintext without expiry | Forgot/reset password | Fixed: SHA-256 storage, expiry timestamp, atomic one-time consumption, and reset-link log removal |
| **Medium** | Logout does not revoke refresh or access tokens | `/user/auth/logout` | Revoke refresh family; use short access-token TTL plus token version/session ID or denylist for immediate invalidation |
| **Medium** | Refresh token is accepted in a GET query parameter | `GET /user/auth/refresh-token?refreshToken=...` | Remove GET/query-token support; accept POST body or secure HttpOnly cookie only |
| **Medium** | No file size or MIME/signature allowlist is configured | Profile/category/product/banner uploads | Add Multer `limits` and `fileFilter`; verify decoded image metadata/signature; return 400/413 |
| **Medium** | Forgot-password response reveals whether an account exists | `/user/auth/forgot-password` | Always return the same 200/202 message and comparable timing |
| **Medium** | No visible rate limiting for login, registration, password reset, refresh, or public analytics | Auth routes and `/user/analytics/track-page` | Add per-IP/account throttles and abuse monitoring |
| **Medium** | Wildcard CORS is enabled globally | Entire API | Restrict origins, methods, and headers by environment |
| **Medium** | Direct S3 URL assumes object delivery is public when CloudFront URL is absent | Image URLs with S3 provider | Use CloudFront/OAC or signed URLs; validate bucket delivery during deployment |
| **Low** | Express fingerprint header remains enabled and Helmet is absent | Entire API | Disable `x-powered-by` and add an appropriate Helmet policy |

Positive findings:

- Registration response omitted the password.
- Public registration could not assign the admin role.
- Invalid, expired, and missing access tokens were rejected.
- Invalid and expired refresh JWTs were rejected.
- Normal users were rejected by tested admin endpoints.
- Password-reset hash and expiry fields are excluded by default and explicitly excluded from admin user responses.

## 8. Authentication report

| Area | Result |
|---|---|
| Access-token issue/use | Works for verified, active users |
| Missing/invalid/expired access token | Correctly returns 401 in tested routes |
| Access-token expiry | JWT expiry is enforced by `jwt.verify` |
| Refresh-token issue/use | Basic valid/invalid/expired behavior works |
| Refresh-token rotation | **Broken**: newly generated token can be byte-identical in the same second and the old token remains valid |
| Refresh-token revocation | **Not implemented** |
| Concurrent refresh | **Broken**: 5 of 5 parallel requests succeeded |
| Logout | Records/closes optional login activity only; does not invalidate tokens |
| Token leakage | **Broken**: access and reset/verification secrets appear in logs |
| Unlimited 401-refresh-retry loop | A client retry loop cannot be tested because no frontend/interceptor code is in this backend. The API supplies no server-side replay protection; clients must enforce a single retry and single-flight refresh |

## 9. Code-quality findings

- Malformed ObjectIds are inconsistently handled: cart/order creation validates them, while product fetch and single-order fetch return 500.
- Resource-not-found semantics are inconsistent: missing products return 400 while missing banners/orders use 404.
- Upload middleware lacks validation and allows potentially large in-memory buffers.
- The production entry point combines configuration, DB connection, app construction, and listening, preventing straightforward isolated tests.
- Controllers/services expose raw `error.message` values in several 500 responses, potentially revealing internal details.
- There is extensive debug logging of users, headers, buffers, and errors.
- Invalid query parameters are silently normalized instead of producing a validation error.
- Registration checks only presence; no complete email-format/password-strength schema is visible.
- No confirmed double-response path was triggered by the suite.
- No unhandled promise rejection was observed in the completed test run, but the production app lacks a final centralized error handler.
- Backward-compatible aliases duplicate route exposure and must receive the same authorization and tests as canonical routes.
- Mongoose warns that the `new` option is deprecated in the installed version; use `returnDocument: "after"` during later maintenance.

## 10. Canonical endpoint inventory

The following routes were discovered. Routes marked “not fully exercised” need additional contract tests before claiming complete endpoint coverage.

### User APIs

- Auth: `GET /user/auth/`, `POST /user/auth/create`, `POST /user/auth/email-verify`, `POST /user/auth/login`, `POST /user/auth/logout`, `POST /user/auth/forgot-password`, `POST /user/auth/reset-password`, `GET|POST /user/auth/refresh-token`.
- Profile: `POST /user/profile/create`, `GET /user/profile/get-profile`, `PUT|PATCH /user/profile/update-profile`.
- Products/categories/banners: `GET /user/products/all-product`, `GET /user/products/product-id/:id`, `GET /user/products/category/:categoryId`, `GET /user/categories/get-all`, `GET /user/banners/all-banners`, `GET /user/banners/:id`.
- Cart: `GET /user/cart/`, `POST /user/cart/bulk`, `POST /user/cart/single-add`, `POST /user/cart/add`, `PATCH /user/cart/quantity`, `PATCH /user/cart/increment-quantity`, `PATCH /user/cart/decrement-quantity`, `GET /user/cart/get-all`, `GET /user/cart/me`, `DELETE /user/cart/delete`, `DELETE /user/cart/clear`.
- Orders/payment: `POST /user/orders/create`, `POST /user/orders/place-order`, `POST /user/orders/verify-payment`, `GET /user/orders/my-orders`, `GET /user/orders/:orderId`, `PATCH /user/orders/:orderId/cancel`, `POST /user/payment/razorpay/order`, `POST /user/payment/razorpay/verify`.
- Returns: `POST /user/returns/`, `GET /user/returns/my`, `GET /user/returns/:id`.
- Coupons: `GET /user/coupons/active`, `POST /user/coupons/apply`.
- Reviews: `GET /user/reviews/product/:productId`, `GET /user/reviews/product/:productId/eligibility`, `POST /user/reviews/product/:productId`, `GET /user/reviews/my-reviews`, `PUT|DELETE /user/reviews/:reviewId`.
- Wishlist: `GET /user/wishlist/get-wishlist`, `GET /user/wishlist/me`, `POST /user/wishlist/add-wishlist/:productId`, `POST /user/wishlist/add/:productId`, `DELETE /user/wishlist/remove-wishlist/:productId`, `DELETE /user/wishlist/remove/:productId`.
- Policies/analytics: `GET /user/policies/all-policies`, `GET /user/policies/:slug`, `POST /user/analytics/track-page`.

### Admin APIs

- Administration: `GET /admin/dashboard`, `GET /admin/all-users`, `PUT /admin/block/:id`, `PUT /admin/unblock/:id`, `GET /admin/login-activities`.
- Audit: `GET /admin/audit-logs/`.
- Categories/products/banners: `POST /admin/categories/create`, `PUT /admin/categories/update/:categoryId`, `DELETE /admin/categories/delete/:categoryId`, `POST /admin/products/create`, `PUT /admin/products/update/:id`, `DELETE /admin/products/delete/:id`, `POST /admin/banners/create`, `PUT /admin/banners/update/:id`, `DELETE /admin/banners/delete/:id`.
- Orders/returns: `GET /admin/orders/all`, `PATCH /admin/orders/:orderId/status`, `GET /admin/returns/`, `PATCH /admin/returns/:id/status`.
- Inventory: `POST /admin/inventory/create`, `POST /admin/inventory/insert-missing`, `GET /admin/inventory/get-inventory`, `GET|PUT /admin/inventory/:productId`.
- Coupons: `GET|POST /admin/coupons/`, `PUT|DELETE /admin/coupons/:id`.
- Policies: `POST /admin/policies/create`, `PUT /admin/policies/update/:id`, `DELETE /admin/policies/delete/:id`.
- Reviews: `GET /admin/reviews/all`, `PATCH /admin/reviews/:reviewId/status`.
- Analytics/homepage: `GET /admin/analytics/page-views`, `GET /admin/homepage/settings`, `PUT /admin/homepage/Update-settings`.
- Referrals: `GET|PUT /admin/referrals/settings`, `GET /admin/referrals/stats`, `GET /admin/referrals/details`, `DELETE /admin/referrals/referrer/:id`, `DELETE /admin/referrals/discount/:id`.

Legacy alias routers also expose many of the same handlers under `/api/v1/auth`, `/banner`, `/cart`, `/category`, `/coupon`, `/order`, `/policy`, `/product`, `/review`, `/wishlist`, `/analytics`, `/payment`, `/return`, plus older admin aliases. These aliases were discovered statically but were not separately re-tested because they invoke the same router instances.

## 11. Recommended fixes in priority order

1. **Implement stateful, atomic refresh-token rotation and replay detection.** Change `src/user/controllers/auth.controller.js`, `src/utils/token.js`, and add a shared refresh-session model/service. This blocks stolen-token replay and fixes simultaneous refresh races.
2. **Stop secret logging immediately.** Change `src/middlewares/auth.middleware.js`, `src/user/controllers/auth.controller.js`, and `src/utils/email.js`. Tokens, reset links, headers, and complete user documents must never reach logs.
3. **Completed: make password-reset tokens hashed, expiring, and one-time.** Updated `src/models/User.model.js`, `src/user/controllers/auth.controller.js`, and `src/utils/email.js`; added expiry/reuse/plaintext-storage tests.
4. **Revoke sessions during logout.** Change `src/user/controllers/auth.controller.js` and the new refresh-session service; decide whether immediate access-token invalidation uses a session/token version or denylist.
5. **Add strict upload validation and limits.** Change `src/middlewares/image.middleware.js`, and add centralized Multer/Sharp error mapping. Validate MIME plus decoded image signature and return 400/413.
6. **Validate route parameters before Mongoose calls.** Add shared ObjectId validation middleware and apply it in `src/user/routes/product.routes.js`, `src/user/routes/order.routes.js`, and other `:id` routes. Return 400 for malformed IDs and 404 for absent resources.
7. **Correct role policy.** Change `src/admin/middlewares/is-admin.middleware.js` to an explicit allowed-role/permission policy consistent with `superAdmin` and `orderManager` requirements.
8. **Add request schemas.** Validate email format, password policy, request bodies, enums, pagination, and query bounds with one consistent validation layer.
9. **Harden the application shell.** Refactor `src/index.js` later into exported `app` plus a separate server bootstrap, add centralized JSON 404/error handling, restricted CORS, Helmet, and rate limiting.
10. **Run controlled third-party integration tests.** Use dedicated Razorpay test credentials, a test S3 bucket/prefix with lifecycle cleanup, a Cloudinary test folder, and a sandbox SMTP inbox. Never use production resources.
11. **Add tests for currently unexercised feature contracts.** Profile updates, category/product/banner update/delete, inventory, coupons, reviews, wishlist, returns, policies, analytics, referrals, admin block/unblock, payment verification, and all legacy aliases still need success/failure coverage.

## 12. Final conclusion

### Working

- Core registration, verification, login, access-token expiry checks, password reset one-time use, normal admin authorization, categories/products reads, cart, banners, and COD orders.
- Canonical admin/user route separation and MongoDB models load successfully.
- Local image processing works for valid image uploads.
- The isolated test suite leaves no persistent database records.

### Not working or incomplete

- Secure refresh rotation, replay detection, concurrent refresh control, and logout revocation.
- Secret-safe logging.
- Upload type/size rejection.
- Consistent malformed-ID and not-found status handling.
- `superAdmin` access through the general admin middleware.
- Strict pagination validation.
- Live S3, Cloudinary, Razorpay, and SMTP verification was not performed.

### Must be fixed before production deployment

At minimum, complete the remaining unresolved recommendations, rerun this suite with zero failures, add coverage for the unexercised canonical routes, and run third-party tests against dedicated sandbox resources. Until then, deployment should be treated as unsafe.
