# E-commerce Backend API Guide

## Quick start

The default API root is:

```text
http://localhost:<PORT>/api/v1
```

Replace `<PORT>` with the value of `port` in `.env`.

Protected User APIs require a customer access token. Admin APIs require an access token whose account role is `admin`, `superAdmin`, or (for order management) `orderManager`.

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

Image endpoints use `multipart/form-data`; do not manually set the multipart boundary. Product, category, and profile uploads use the field name `User_image`. Banner uploads use `banner_image`.

## Authentication workflow

1. Register with `POST /user/auth/create`.
2. Verify the account with `POST /user/auth/email-verify` using the verification data sent by the backend.
3. Log in with `POST /user/auth/login`.
4. Copy the access token from the login response and send it as `Authorization: Bearer <token>`.
5. When the access token expires, call `/user/auth/refresh-token` with the refresh token.

Register:

```bash
curl -X POST "http://localhost:3000/api/v1/user/auth/create" \
  -H "Content-Type: application/json" \
  -d '{"Email":"customer@example.com","Password":"StrongPassword123!","role":"user"}'
```

Login:

```bash
curl -X POST "http://localhost:3000/api/v1/user/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"Email":"customer@example.com","Password":"StrongPassword123!"}'
```

Refresh token:

```json
{ "refreshToken": "<refresh-token>" }
```

## User API collection

### Authentication

| Method | Endpoint | Authentication | Input |
| --- | --- | --- | --- |
| GET | `/user/auth/` | No | Health/welcome response |
| POST | `/user/auth/create` | No | `{ "Email", "Password", "role": "user" }` |
| POST | `/user/auth/email-verify` | No | Verification payload returned/sent by registration flow |
| POST | `/user/auth/login` | No | `{ "Email", "Password" }` |
| POST | `/user/auth/forgot-password` | No | `{ "email" }` |
| POST | `/user/auth/reset-password` | No | `{ "resetToken", "password" }` |
| GET | `/user/auth/refresh-token?refreshToken=...` | No | Refresh token query parameter |
| POST | `/user/auth/refresh-token` | No | `{ "refreshToken" }` |

### Profile

| Method | Endpoint | Authentication | Input |
| --- | --- | --- | --- |
| POST | `/user/profile/create` | User | Multipart profile fields; optional `User_image` |
| GET | `/user/profile/get-profile` | User | None |
| PUT | `/user/profile/update-profile` | User | Multipart profile fields; optional `User_image` |
| PATCH | `/user/profile/update-profile` | User | One or more multipart profile fields |

Accepted profile fields: `fullName`, `firstName`, `middleName`, `lastName`, `phoneNumber`, `dob`, `bio`, `gender` (`Male`, `Female`, `Other`), `addressLine1`, `addressLine2`, `city`, `state`, `pincode`, and `country`.

```bash
curl -X POST "http://localhost:3000/api/v1/user/profile/create" \
  -H "Authorization: Bearer $TOKEN" \
  -F "fullName=Example Customer" \
  -F "phoneNumber=9876543210" \
  -F "addressLine1=12 Market Road" \
  -F "city=Jaipur" \
  -F "state=Rajasthan" \
  -F "pincode=302001" \
  -F "country=India" \
  -F "User_image=@/path/to/avatar.jpg"
```

### Products and categories

| Method | Endpoint | Authentication | Description |
| --- | --- | --- | --- |
| GET | `/user/products/all-product` | No | List products with review summaries |
| GET | `/user/products/product-id/:id` | No | Get one product |
| GET | `/user/products/category/:categoryId` | No | List products in a category |
| GET | `/user/categories/get-all` | No | List categories |

### Cart

| Method | Endpoint | Authentication | Input |
| --- | --- | --- | --- |
| GET | `/user/cart/me` | User | None |
| GET | `/user/cart/get-all` | User | Alias of `me` |
| POST | `/user/cart/add` | User | Single product payload |
| POST | `/user/cart/single-add` | User | Alias of `add` |
| POST | `/user/cart/bulk` | User | `{ "items": [...] }` |
| PATCH | `/user/cart/quantity` | User | Cart item/product selector and quantity |
| PATCH | `/user/cart/increment-quantity` | User | Cart item/product selector and current quantity |
| PATCH | `/user/cart/decrement-quantity` | User | Cart item/product selector |
| DELETE | `/user/cart/delete` | User | Cart item/product selector |
| DELETE | `/user/cart/clear` | User | None |

Single item:

```json
{
  "productId": "<product-id>",
  "quantity": 2,
  "selectedVariants": {}
}
```

Bulk items:

```json
{
  "items": [
    { "productId": "<product-id>", "quantity": 2, "selectedVariants": {} }
  ]
}
```

Update or delete selector:

```json
{
  "cartItemId": "<cart-item-id>",
  "productId": "<product-id>",
  "quantity": 3,
  "selectedVariants": {}
}
```

### Orders

| Method | Endpoint | Authentication | Description |
| --- | --- | --- | --- |
| POST | `/user/orders/create` | User | Place an order |
| POST | `/user/orders/place-order` | User | Alias of `create` |
| POST | `/user/orders/verify-payment` | User | Verify Razorpay payment signature |
| GET | `/user/orders/my-orders` | User | List current user's orders |
| GET | `/user/orders/:orderId` | User | Get an owned order (admins may also inspect) |
| PATCH | `/user/orders/:orderId/cancel` | User | Cancel an owned order |

Place order:

```json
{
  "items": [
    { "productId": "<product-id>", "quantity": 1 }
  ],
  "shippingAddress": {
    "fullName": "Example Customer",
    "phone": "9876543210",
    "address": "12 Market Road",
    "city": "Jaipur",
    "state": "Rajasthan",
    "pincode": "302001",
    "country": "India"
  },
  "paymentMethod": "COD",
  "coupon": null
}
```

`paymentMethod` accepts `COD`, `UPI`, or `CARD`. For a non-COD order, submit the payment provider result:

```json
{
  "orderId": "<mongodb-order-id>",
  "razorpay_order_id": "order_...",
  "razorpay_payment_id": "pay_...",
  "razorpay_signature": "..."
}
```

### Wishlist

| Method | Endpoint | Authentication | Description |
| --- | --- | --- | --- |
| GET | `/user/wishlist/me` | User | Get wishlist |
| GET | `/user/wishlist/get-wishlist` | User | Alias of `me` |
| POST | `/user/wishlist/add/:productId` | User | Add product |
| POST | `/user/wishlist/add-wishlist/:productId` | User | Alias of `add` |
| DELETE | `/user/wishlist/remove/:productId` | User | Remove product |
| DELETE | `/user/wishlist/remove-wishlist/:productId` | User | Alias of `remove` |

### Coupons

| Method | Endpoint | Authentication | Input |
| --- | --- | --- | --- |
| GET | `/user/coupons/active?productIds=id1,id2` | User | Optional product IDs |
| POST | `/user/coupons/apply` | User | Coupon and cart items |

```json
{
  "couponId": "WELCOME10",
  "items": [
    { "productId": "<product-id>", "quantity": 1 }
  ]
}
```

### Banners and policies

| Method | Endpoint | Authentication | Description |
| --- | --- | --- | --- |
| GET | `/user/banners/all-banners` | No | Active banners; use `?includeInactive=true` when appropriate |
| GET | `/user/banners/:id` | No | Banner details |
| GET | `/user/policies/all-policies` | No | List policies |
| GET | `/user/policies/:slug` | No | Get policy by slug |

### Reviews

| Method | Endpoint | Authentication | Input |
| --- | --- | --- | --- |
| GET | `/user/reviews/product/:productId` | No | None |
| GET | `/user/reviews/product/:productId/eligibility` | User | None |
| POST | `/user/reviews/product/:productId` | User | `{ "rating": 5, "comment": "..." }` |
| GET | `/user/reviews/my-reviews` | User | None |
| PUT | `/user/reviews/:reviewId` | User | `{ "rating": 4, "comment": "..." }` |
| DELETE | `/user/reviews/:reviewId` | User | None |

The rating must be from 1 to 5 and the comment must contain 3–1000 characters.

## Admin API collection

Use an Admin access token in the Bearer header.

### Dashboard and users

| Method | Endpoint | Input |
| --- | --- | --- |
| GET | `/admin/dashboard` | None |
| GET | `/admin/all-users?search=&role=all&status=all` | Optional filters |
| PUT | `/admin/block/:id` | None |
| PUT | `/admin/unblock/:id` | None |

### Products

| Method | Endpoint | Input |
| --- | --- | --- |
| POST | `/admin/products/create` | Multipart fields and required `User_image` |
| PUT | `/admin/products/update/:id` | Multipart product fields; optional `User_image` |
| DELETE | `/admin/products/delete/:id` | None |

Product multipart fields:

```text
name                 required
description          required
price                required
mrp                  optional (defaults to price)
category_id          required
size                 optional
brand                required
stock                required
producthightlight    required (spelling matches current API)
User_image           required when creating
```

### Categories

| Method | Endpoint | Input |
| --- | --- | --- |
| POST | `/admin/categories/create` | Multipart: `name`, `tagline`, `themecolor`, `User_image` |
| PUT | `/admin/categories/update/:categoryId` | Multipart fields; image optional |
| DELETE | `/admin/categories/delete/:categoryId` | None |

### Orders

| Method | Endpoint | Input |
| --- | --- | --- |
| GET | `/admin/orders/all` | None |
| PATCH | `/admin/orders/:orderId/status` | `{ "orderStatus": "Shipped" }` |

Supported statuses are defined by the order model: `Pending`, `Confirmed`, `Packed`, `Shipped`, `Out For Delivery`, `Delivered`, and `Cancelled`.

### Banners

| Method | Endpoint | Input |
| --- | --- | --- |
| POST | `/admin/banners/create` | Multipart banner fields and required `banner_image` |
| PUT | `/admin/banners/update/:id` | Multipart fields; image optional |
| DELETE | `/admin/banners/delete/:id` | None |

Banner fields: `title`, `titleColor`, `subtitle`, `subtitleColor`, `cta`, `ctaBg`, `ctaText`, `overlayOpacity`, `alignment`, `to`, `isActive`, and `order`.

### Coupons

| Method | Endpoint | Input |
| --- | --- | --- |
| GET | `/admin/coupons` | None |
| POST | `/admin/coupons` | Coupon JSON |
| PUT | `/admin/coupons/:id` | Partial coupon JSON |
| DELETE | `/admin/coupons/:id` | None |

```json
{
  "targetType": "all",
  "discountType": "percentage",
  "discountValue": 10,
  "startDate": "2026-07-11",
  "expireDate": "2026-12-31",
  "maxLimit": 1,
  "minPurchaseAmount": 500,
  "isActive": true
}
```

`targetType` accepts `all`, `category`, or `product`. Supply `category_id` or `product_id` for the corresponding target. `discountType` accepts `percentage` or `fixed`. `customerEmail` can restrict the coupon to an existing user.

### Inventory

| Method | Endpoint | Input |
| --- | --- | --- |
| POST | `/admin/inventory/create` | `{ "product_id", "stock", "note" }` |
| POST | `/admin/inventory/insert-missing` | None |
| GET | `/admin/inventory/get-inventory?search=&category_id=` | Optional filters |
| GET | `/admin/inventory/:productId` | None |
| PUT | `/admin/inventory/:productId` | `{ "stock": 25, "note": "Restocked" }` |

Important: the existing implementation only protects `insert-missing`; the other inventory routes currently have no Admin middleware. This documentation does not treat that as recommended behavior.

### Reviews, policies, and audit logs

| Method | Endpoint | Input |
| --- | --- | --- |
| GET | `/admin/reviews/all?productId=&status=&search=` | Optional filters |
| PATCH | `/admin/reviews/:reviewId/status` | `{ "status": "hidden" }` or `published` |
| POST | `/admin/policies/create` | Policy JSON |
| PUT | `/admin/policies/update/:id` | Partial policy JSON |
| DELETE | `/admin/policies/delete/:id` | None |
| GET | `/admin/audit-logs?action=&module=&search=` | Optional filters |

Policy payload:

```json
{
  "title": "Privacy Policy",
  "slug": "privacy-policy",
  "heading": "Privacy Policy",
  "content": "Policy content...",
  "position": 1
}
```

## Common HTTP responses

- `200`: successful read/update/delete.
- `201`: resource created.
- `400`: invalid or missing input.
- `401`: missing, invalid, or expired access token.
- `403`: authenticated account lacks permission or is blocked.
- `404`: resource not found.
- `500`: server/database/provider error.

## Missing modules

Return and Login Activity endpoints are not implemented in the current source code, so they are intentionally absent from this collection.
