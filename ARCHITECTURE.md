# Backend architecture

## Module boundaries

- `src/admin`: Admin controllers, Admin-only middleware, feature routes, and the central Admin router.
- `src/user`: User controllers, feature routes, and the central User router.
- `src/models`: Shared Mongoose models.
- `src/middlewares`: Shared authentication and upload middleware.
- `src/services`: Single-source feature logic used by both Admin and User controllers.
- `src/utils`, `src/config`, `src/database`, `src/templates`: Shared infrastructure.

Return and Login Activity modules are not present in the original codebase. Add them under the appropriate Admin/User module when their business logic and models are implemented; no placeholder behavior was invented during this refactor.

## Canonical route prefixes

| Area | Prefixes |
| --- | --- |
| Admin | `/api/v1/admin/products`, `/categories`, `/orders`, `/banners`, `/audit-logs`, `/coupons`, `/inventory`, `/policies`, `/reviews` |
| User | `/api/v1/user/auth`, `/profile`, `/products`, `/categories`, `/cart`, `/orders`, `/banners`, `/coupons`, `/policies`, `/reviews`, `/wishlist` |

Legacy prefixes remain registered as compatibility aliases during client migration.

## Migration map

| Old path | New path |
| --- | --- |
| `src/controller/admin.controller.js` | `src/admin/controllers/admin.controller.js` |
| `src/controller/audit.controller.js` | `src/admin/controllers/audit.controller.js` |
| `src/controller/auth.controller.js` | `src/user/controllers/auth.controller.js` |
| `src/controller/cart.controller.js` | `src/user/controllers/cart.controller.js` |
| `src/controller/profile.controller.js` | `src/user/controllers/profile.controller.js` |
| `src/controller/wishlist.controller.js` | `src/user/controllers/wishlist.controller.js` |
| `src/controller/{banner,category,coupon,inventory,order,policy,product,review}.controller.js` | `src/services/{feature}.service.js`, exposed through role-specific controllers |
| `src/router/*.routes.js` | `src/admin/routes/*.routes.js` and `src/user/routes/*.routes.js` |
| `src/router/admin.routes.js` | `src/admin/admin.routes.js` plus Admin feature routes |
| all former User route files | `src/user/user.routes.js` plus User feature routes |
| `src/Model/*` | `src/models/*` |
| `src/middlewere/auth.middlewere.js` | `src/middlewares/auth.middleware.js` |
| `src/middlewere/image.middlewere.js` | `src/middlewares/image.middleware.js` |
| `src/middlewere/is-admin.middlewere.js` | `src/admin/middlewares/is-admin.middleware.js` |
| inline order-management middleware | `src/admin/middlewares/order.middleware.js` |
| `src/Database/*` | `src/database/*` |
| `src/PasswordHash/password.js` | `src/utils/password.js` |

## Compatibility and security notes

- Existing endpoint suffixes and middleware order are preserved.
- Existing legacy base paths remain aliases, so current clients can migrate gradually.
- Inventory create/read/update endpoints were already unprotected. They remain unchanged here to avoid silently changing authentication behavior; secure them in a separate reviewed security change.
- The old mixed order router evaluated `/all` before `/:orderId`. The central app registers the Admin router before the User router to preserve that precedence for `/api/v1/order/all`.
