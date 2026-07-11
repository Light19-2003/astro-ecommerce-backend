import fs from "node:fs";

const json = (value) => ({
  mode: "raw",
  raw: JSON.stringify(value, null, 2),
  options: { raw: { language: "json" } },
});

const bearer = { type: "bearer", bearer: [{ key: "token", value: "{{accessToken}}", type: "string" }] };
const noAuth = { type: "noauth" };

const request = (name, method, path, options = {}) => ({
  name,
  ...(options.saveTokens ? {
    event: [{
      listen: "test",
      script: {
        type: "text/javascript",
        exec: [
          "const response = pm.response.json();",
          "if (response.token?.accessToken) pm.collectionVariables.set('accessToken', response.token.accessToken);",
          "if (response.token?.refreshToken) pm.collectionVariables.set('refreshToken', response.token.refreshToken);",
        ],
      },
    }],
  } : {}),
  request: {
    method,
    header: options.body ? [{ key: "Content-Type", value: "application/json" }] : [],
    auth: options.public ? noAuth : bearer,
    ...(options.body ? { body: json(options.body) } : {}),
    url: `{{baseUrl}}${path}`,
    description: options.description || "See docs/API.md for usage details.",
  },
});

const multipart = (name, method, path, fields, publicRequest = false) => ({
  name,
  request: {
    method,
    header: [],
    auth: publicRequest ? noAuth : bearer,
    body: {
      mode: "formdata",
      formdata: fields.map(([key, value, type = "text"]) => ({ key, value, type })),
    },
    url: `{{baseUrl}}${path}`,
    description: "Choose a local file for file-type fields before sending.",
  },
});

const folders = [
  {
    name: "User - Authentication",
    item: [
      request("Health", "GET", "/user/auth/", { public: true }),
      request("Register", "POST", "/user/auth/create", { public: true, body: { Email: "customer@example.com", Password: "StrongPassword123!", role: "user" } }),
      request("Verify Email", "POST", "/user/auth/email-verify", { public: true, body: { email: "customer@example.com", token: "verification-token" } }),
      request("Login", "POST", "/user/auth/login", { public: true, saveTokens: true, body: { Email: "customer@example.com", Password: "StrongPassword123!" } }),
      request("Forgot Password", "POST", "/user/auth/forgot-password", { public: true, body: { email: "customer@example.com" } }),
      request("Reset Password", "POST", "/user/auth/reset-password", { public: true, body: { resetToken: "reset-token", password: "NewStrongPassword123!" } }),
      request("Refresh Token - POST", "POST", "/user/auth/refresh-token", { public: true, body: { refreshToken: "{{refreshToken}}" } }),
      request("Refresh Token - GET", "GET", "/user/auth/refresh-token?refreshToken={{refreshToken}}", { public: true }),
    ],
  },
  {
    name: "User - Profile",
    item: [
      multipart("Create Profile", "POST", "/user/profile/create", [["fullName", "Example Customer"], ["phoneNumber", "9876543210"], ["addressLine1", "12 Market Road"], ["city", "Jaipur"], ["state", "Rajasthan"], ["pincode", "302001"], ["country", "India"], ["User_image", "", "file"]]),
      request("Get Profile", "GET", "/user/profile/get-profile"),
      multipart("Replace Profile", "PUT", "/user/profile/update-profile", [["fullName", "Example Customer"], ["bio", "Customer profile"], ["User_image", "", "file"]]),
      multipart("Patch Profile", "PATCH", "/user/profile/update-profile", [["bio", "Updated biography"]]),
    ],
  },
  {
    name: "User - Catalog",
    item: [
      request("List Products", "GET", "/user/products/all-product", { public: true }),
      request("Get Product", "GET", "/user/products/product-id/{{productId}}", { public: true }),
      request("Products by Category", "GET", "/user/products/category/{{categoryId}}", { public: true }),
      request("List Categories", "GET", "/user/categories/get-all", { public: true }),
      request("List Banners", "GET", "/user/banners/all-banners", { public: true }),
      request("Get Banner", "GET", "/user/banners/{{bannerId}}", { public: true }),
      request("List Policies", "GET", "/user/policies/all-policies", { public: true }),
      request("Get Policy", "GET", "/user/policies/{{policySlug}}", { public: true }),
    ],
  },
  {
    name: "User - Cart and Wishlist",
    item: [
      request("Get Cart", "GET", "/user/cart/me"),
      request("Get Cart - Legacy Alias", "GET", "/user/cart/get-all"),
      request("Add Product", "POST", "/user/cart/add", { body: { productId: "{{productId}}", quantity: 1, selectedVariants: {} } }),
      request("Add Product - Alias", "POST", "/user/cart/single-add", { body: { productId: "{{productId}}", quantity: 1, selectedVariants: {} } }),
      request("Bulk Add", "POST", "/user/cart/bulk", { body: { items: [{ productId: "{{productId}}", quantity: 1, selectedVariants: {} }] } }),
      request("Set Quantity", "PATCH", "/user/cart/quantity", { body: { cartItemId: "{{cartItemId}}", productId: "{{productId}}", quantity: 2, selectedVariants: {} } }),
      request("Increment Quantity", "PATCH", "/user/cart/increment-quantity", { body: { cartItemId: "{{cartItemId}}", productId: "{{productId}}", quantity: 1, selectedVariants: {} } }),
      request("Decrement Quantity", "PATCH", "/user/cart/decrement-quantity", { body: { cartItemId: "{{cartItemId}}", productId: "{{productId}}", selectedVariants: {} } }),
      request("Delete Cart Item", "DELETE", "/user/cart/delete", { body: { cartItemId: "{{cartItemId}}", productId: "{{productId}}", selectedVariants: {} } }),
      request("Clear Cart", "DELETE", "/user/cart/clear"),
      request("Get Wishlist", "GET", "/user/wishlist/me"),
      request("Add to Wishlist", "POST", "/user/wishlist/add/{{productId}}"),
      request("Remove from Wishlist", "DELETE", "/user/wishlist/remove/{{productId}}"),
    ],
  },
  {
    name: "User - Orders and Coupons",
    item: [
      request("Place Order", "POST", "/user/orders/place-order", { body: { items: [{ productId: "{{productId}}", quantity: 1 }], shippingAddress: { fullName: "Example Customer", phone: "9876543210", address: "12 Market Road", city: "Jaipur", state: "Rajasthan", pincode: "302001", country: "India" }, paymentMethod: "COD", coupon: null } }),
      request("Place Order - Alias", "POST", "/user/orders/create", { body: { items: [{ productId: "{{productId}}", quantity: 1 }], shippingAddress: { fullName: "Example Customer", phone: "9876543210", address: "12 Market Road", city: "Jaipur", state: "Rajasthan", pincode: "302001", country: "India" }, paymentMethod: "COD", coupon: null } }),
      request("Verify Payment", "POST", "/user/orders/verify-payment", { body: { orderId: "{{orderId}}", razorpay_order_id: "order_...", razorpay_payment_id: "pay_...", razorpay_signature: "signature" } }),
      request("My Orders", "GET", "/user/orders/my-orders"),
      request("Get Order", "GET", "/user/orders/{{orderId}}"),
      request("Cancel Order", "PATCH", "/user/orders/{{orderId}}/cancel"),
      request("Available Coupons", "GET", "/user/coupons/active?productIds={{productId}}"),
      request("Apply Coupon", "POST", "/user/coupons/apply", { body: { couponId: "WELCOME10", items: [{ productId: "{{productId}}", quantity: 1 }] } }),
    ],
  },
  {
    name: "User - Reviews",
    item: [
      request("Product Reviews", "GET", "/user/reviews/product/{{productId}}", { public: true }),
      request("Review Eligibility", "GET", "/user/reviews/product/{{productId}}/eligibility"),
      request("Create or Update Review", "POST", "/user/reviews/product/{{productId}}", { body: { rating: 5, comment: "Excellent product." } }),
      request("My Reviews", "GET", "/user/reviews/my-reviews"),
      request("Update Review", "PUT", "/user/reviews/{{reviewId}}", { body: { rating: 4, comment: "Updated review." } }),
      request("Delete Review", "DELETE", "/user/reviews/{{reviewId}}"),
    ],
  },
  {
    name: "Admin - Dashboard and Users",
    item: [
      request("Dashboard", "GET", "/admin/dashboard"),
      request("List Users", "GET", "/admin/all-users?search=&role=all&status=all"),
      request("Block User", "PUT", "/admin/block/{{userId}}"),
      request("Unblock User", "PUT", "/admin/unblock/{{userId}}"),
      request("Audit Logs", "GET", "/admin/audit-logs?action=&module=&search="),
    ],
  },
  {
    name: "Admin - Products and Categories",
    item: [
      multipart("Create Product", "POST", "/admin/products/create", [["name", "Example Product"], ["description", "Product description"], ["price", "999"], ["mrp", "1299"], ["category_id", "{{categoryId}}"], ["size", "Standard"], ["brand", "Example Brand"], ["stock", "10"], ["producthightlight", "Product highlights"], ["User_image", "", "file"]]),
      multipart("Update Product", "PUT", "/admin/products/update/{{productId}}", [["name", "Updated Product"], ["price", "1099"], ["stock", "20"], ["User_image", "", "file"]]),
      request("Delete Product", "DELETE", "/admin/products/delete/{{productId}}"),
      multipart("Create Category", "POST", "/admin/categories/create", [["name", "Example Category"], ["tagline", "Category tagline"], ["themecolor", "#000000"], ["User_image", "", "file"]]),
      multipart("Update Category", "PUT", "/admin/categories/update/{{categoryId}}", [["name", "Updated Category"], ["tagline", "Updated tagline"], ["themecolor", "#333333"], ["User_image", "", "file"]]),
      request("Delete Category", "DELETE", "/admin/categories/delete/{{categoryId}}"),
    ],
  },
  {
    name: "Admin - Orders and Inventory",
    item: [
      request("All Orders", "GET", "/admin/orders/all"),
      request("Update Order Status", "PATCH", "/admin/orders/{{orderId}}/status", { body: { orderStatus: "Shipped" } }),
      request("Create Inventory", "POST", "/admin/inventory/create", { body: { product_id: "{{productId}}", stock: 10, note: "Initial stock" } }),
      request("Insert Missing Inventory", "POST", "/admin/inventory/insert-missing"),
      request("List Inventory", "GET", "/admin/inventory/get-inventory?search=&category_id="),
      request("Product Inventory", "GET", "/admin/inventory/{{productId}}"),
      request("Update Stock", "PUT", "/admin/inventory/{{productId}}", { body: { stock: 25, note: "Restocked" } }),
    ],
  },
  {
    name: "Admin - Banners, Coupons, Reviews and Policies",
    item: [
      multipart("Create Banner", "POST", "/admin/banners/create", [["title", "Summer Sale"], ["subtitle", "Limited time offer"], ["to", "/products"], ["isActive", "true"], ["order", "1"], ["banner_image", "", "file"]]),
      multipart("Update Banner", "PUT", "/admin/banners/update/{{bannerId}}", [["title", "Updated Banner"], ["isActive", "true"], ["banner_image", "", "file"]]),
      request("Delete Banner", "DELETE", "/admin/banners/delete/{{bannerId}}"),
      request("List Coupons", "GET", "/admin/coupons"),
      request("Create Coupon", "POST", "/admin/coupons", { body: { targetType: "all", discountType: "percentage", discountValue: 10, startDate: "2026-07-11", expireDate: "2026-12-31", maxLimit: 1, minPurchaseAmount: 500, isActive: true } }),
      request("Update Coupon", "PUT", "/admin/coupons/{{couponId}}", { body: { discountValue: 15, isActive: true } }),
      request("Delete Coupon", "DELETE", "/admin/coupons/{{couponId}}"),
      request("Admin Reviews", "GET", "/admin/reviews/all?productId=&status=&search="),
      request("Moderate Review", "PATCH", "/admin/reviews/{{reviewId}}/status", { body: { status: "hidden" } }),
      request("Create Policy", "POST", "/admin/policies/create", { body: { title: "Privacy Policy", slug: "privacy-policy", heading: "Privacy Policy", content: "Policy content...", position: 1 } }),
      request("Update Policy", "PUT", "/admin/policies/update/{{policyId}}", { body: { title: "Updated Privacy Policy", content: "Updated content..." } }),
      request("Delete Policy", "DELETE", "/admin/policies/delete/{{policyId}}"),
    ],
  },
];

const collection = {
  info: {
    _postman_id: "ac34e1d0-10bd-47ab-aec4-gameengine-backend",
    name: "GameENGINE E-commerce Backend",
    description: "Admin and User API collection. Full usage notes are in docs/API.md.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "baseUrl", value: "http://localhost:3000/api/v1" },
    { key: "accessToken", value: "" },
    { key: "refreshToken", value: "" },
    ...["userId", "productId", "categoryId", "cartItemId", "orderId", "bannerId", "couponId", "reviewId", "policyId"].map((key) => ({ key, value: "" })),
    { key: "policySlug", value: "privacy-policy" },
  ],
  item: folders,
};

fs.writeFileSync(new URL("./ecommerce-backend.postman_collection.json", import.meta.url), `${JSON.stringify(collection, null, 2)}\n`);
console.log("Generated docs/ecommerce-backend.postman_collection.json");
