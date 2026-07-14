import { jest, describe, test, expect, beforeAll, afterAll, afterEach } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import sharp from "sharp";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.acess_token = "test-access-secret-at-least-32-characters";
process.env.refresh_token = "test-refresh-secret-at-least-32-characters";
process.env.SECRET_KEY = "test-password-secret";
process.env.IMAGE_STORAGE_PROVIDER = "local";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.RESET_PASSWORD_FRONTEND_URL = "http://localhost:3000/reset-password";

const sendMail = jest.fn().mockResolvedValue({ messageId: "test-message" });
jest.unstable_mockModule("nodemailer", () => ({
  default: {
    createTransport: jest.fn(() => ({ sendMail })),
  },
}));

let mongod;
let app;
let User;
let UserProfile;
let EmailVerification;
let Category;
let Product;
let Banner;
let Order;

const accessToken = (user, expiresIn = "15m") =>
  jwt.sign({ id: String(user._id), role: user.role }, process.env.acess_token, { expiresIn });
const refreshToken = (user, expiresIn = "7d") =>
  jwt.sign({ id: String(user._id), role: user.role }, process.env.refresh_token, { expiresIn });
const bearer = (token) => `Bearer ${token}`;

const createUser = async ({ email = "user@example.com", password = "Password123!", role = "user", verified = true, active = true } = {}) =>
  User.create({ email, password: await bcrypt.hash(password, 10), role, isVerified: verified, isActive: active });

const png = async (width = 4, height = 4) =>
  sharp({ create: { width, height, channels: 3, background: "red" } }).png().toBuffer();

const createCategory = async (overrides = {}) => Category.create({
  name: "Gemstones",
  tagline: "Natural stones",
  themecolor: "#112233",
  image: "/uploads/category.webp",
  localimage: "",
  public_id: "category.webp",
  storageProvider: "local",
  ...overrides,
});

const createProduct = async (category, overrides = {}) => Product.create({
  category_id: category._id,
  name: "Ruby",
  description: "Natural ruby gemstone",
  price: 1000,
  mrp: 1200,
  size: "Standard",
  producthightlight: "Certified",
  stock: 10,
  brand: "AstroMart",
  localimage: "/uploads/ruby.webp",
  image: "/uploads/ruby.webp",
  public_id: "ruby.webp",
  storageProvider: "local",
  ...overrides,
});

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.mango_url = mongod.getUri();
  await mongoose.connect(process.env.mango_url);

  [
    { default: User },
    { default: UserProfile },
    { default: EmailVerification },
    { default: Category },
    { default: Product },
    { default: Banner },
    { default: Order },
  ] = await Promise.all([
    import("../src/models/User.model.js"),
    import("../src/models/userprofile.model.js"),
    import("../src/models/emailverification.model.js"),
    import("../src/models/Category.model.js"),
    import("../src/models/product.model.js"),
    import("../src/models/Banner.model.js"),
    import("../src/models/order.model.js"),
  ]);

  ({ createTestApp: app } = { createTestApp: await import("./test-app.js").then((module) => module.createTestApp()) });
});

afterEach(async () => {
  sendMail.mockClear();
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

describe("safe isolated startup", () => {
  test("uses only the MongoDB Memory Server database", () => {
    expect(mongoose.connection.host).toBe("127.0.0.1");
    expect(mongoose.connection.name).toMatch(/^test/);
  });

  test("serves the API health route", async () => {
    const response = await request(app).get("/api/v1/user/auth/");
    expect(response.status).toBe(200);
  });
});

describe("registration and email verification", () => {
  test("registers a user without returning a password", async () => {
    const response = await request(app).post("/api/v1/user/auth/create").send({ Email: "new@example.com", Password: "Password123!" });
    expect(response.status).toBe(201);
    expect(response.body.user.password).toBeUndefined();
    expect(await User.countDocuments()).toBe(1);
  });

  test("rejects empty registration", async () => {
    expect((await request(app).post("/api/v1/user/auth/create").send({})).status).toBe(400);
  });

  test("rejects duplicate email", async () => {
    await request(app).post("/api/v1/user/auth/create").send({ Email: "dup@example.com", Password: "Password123!" });
    expect((await request(app).post("/api/v1/user/auth/create").send({ Email: "dup@example.com", Password: "Password123!" })).status).toBe(400);
  });

  test("does not allow public registration to choose admin role", async () => {
    const response = await request(app).post("/api/v1/user/auth/create").send({ Email: "role@example.com", Password: "Password123!", role: "admin" });
    expect(response.status).toBe(201);
    expect((await User.findOne({ email: "role@example.com" })).role).toBe("user");
  });

  test("rejects email verification without token", async () => {
    expect((await request(app).post("/api/v1/user/auth/email-verify").send({})).status).toBe(400);
  });

  test("verifies a valid email token", async () => {
    await request(app).post("/api/v1/user/auth/create").send({ Email: "verify@example.com", Password: "Password123!" });
    const verification = await EmailVerification.findOne({ email: "verify@example.com" });
    const response = await request(app).post("/api/v1/user/auth/email-verify").set("x-verification-token", verification.token);
    expect(response.status).toBe(200);
    expect((await User.findOne({ email: "verify@example.com" })).isVerified).toBe(true);
  });

  test("rejects an invalid verification token", async () => {
    expect((await request(app).post("/api/v1/user/auth/email-verify").set("x-verification-token", "invalid")).status).toBe(400);
  });
});

describe("login and access-token authentication", () => {
  test("logs in a verified active user", async () => {
    await createUser();
    const response = await request(app).post("/api/v1/user/auth/login").send({ Email: "user@example.com", Password: "Password123!" });
    expect(response.status).toBe(200);
    expect(response.body.token.accessToken).toBeTruthy();
    expect(response.body.token.refreshToken).toBeTruthy();
  });

  test("rejects empty login", async () => {
    expect((await request(app).post("/api/v1/user/auth/login").send({})).status).toBe(400);
  });

  test("rejects unknown email", async () => {
    expect((await request(app).post("/api/v1/user/auth/login").send({ Email: "missing@example.com", Password: "Password123!" })).status).toBe(400);
  });

  test("rejects incorrect password", async () => {
    await createUser();
    expect((await request(app).post("/api/v1/user/auth/login").send({ Email: "user@example.com", Password: "wrong" })).status).toBe(401);
  });

  test("rejects unverified user", async () => {
    await createUser({ verified: false });
    expect((await request(app).post("/api/v1/user/auth/login").send({ Email: "user@example.com", Password: "Password123!" })).status).toBe(401);
  });

  test("rejects blocked user", async () => {
    await createUser({ active: false });
    expect((await request(app).post("/api/v1/user/auth/login").send({ Email: "user@example.com", Password: "Password123!" })).status).toBe(403);
  });

  test("rejects missing token", async () => {
    expect((await request(app).get("/api/v1/user/profile/get-profile")).status).toBe(401);
  });

  test("rejects invalid access token", async () => {
    expect((await request(app).get("/api/v1/user/profile/get-profile").set("Authorization", "Bearer invalid")).status).toBe(401);
  });

  test("rejects expired access token", async () => {
    const user = await createUser();
    const expired = accessToken(user, -1);
    expect((await request(app).get("/api/v1/user/profile/get-profile").set("Authorization", bearer(expired))).status).toBe(401);
  });

  test("does not log bearer tokens", async () => {
    const user = await createUser();
    const token = accessToken(user);
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    await request(app).get("/api/v1/user/profile/get-profile").set("Authorization", bearer(token));
    const serialized = JSON.stringify(spy.mock.calls);
    spy.mockRestore();
    expect(serialized).not.toContain(token);
  });
});

describe("refresh and logout", () => {
  test("refreshes a valid refresh token", async () => {
    const user = await createUser();
    const response = await request(app).post("/api/v1/user/auth/refresh-token").send({ refreshToken: refreshToken(user) });
    expect(response.status).toBe(200);
    expect(response.body.token.accessToken).toBeTruthy();
  });

  test("rejects missing refresh token", async () => {
    expect((await request(app).post("/api/v1/user/auth/refresh-token").send({})).status).toBe(400);
  });

  test("rejects invalid refresh token", async () => {
    expect((await request(app).post("/api/v1/user/auth/refresh-token").send({ refreshToken: "invalid" })).status).toBe(401);
  });

  test("rejects expired refresh token", async () => {
    const user = await createUser();
    expect((await request(app).post("/api/v1/user/auth/refresh-token").send({ refreshToken: refreshToken(user, -1) })).status).toBe(401);
  });

  test("rotates and revokes the previous refresh token", async () => {
    const user = await createUser();
    const oldToken = refreshToken(user);
    expect((await request(app).post("/api/v1/user/auth/refresh-token").send({ refreshToken: oldToken })).status).toBe(200);
    expect((await request(app).post("/api/v1/user/auth/refresh-token").send({ refreshToken: oldToken })).status).toBe(401);
  });

  test("allows only one simultaneous refresh request", async () => {
    const user = await createUser();
    const token = refreshToken(user);
    const responses = await Promise.all(Array.from({ length: 5 }, () => request(app).post("/api/v1/user/auth/refresh-token").send({ refreshToken: token })));
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
  });

  test("logout revokes the current access token", async () => {
    const user = await createUser();
    const token = accessToken(user);
    const logout = await request(app).post("/api/v1/user/auth/logout").set("Authorization", bearer(token)).send({});
    expect(logout.status).toBe(200);
    expect((await request(app).get("/api/v1/user/profile/get-profile").set("Authorization", bearer(token))).status).toBe(401);
  });
});

describe("forgot and reset password", () => {
  test("rejects missing forgot-password email", async () => {
    expect((await request(app).post("/api/v1/user/auth/forgot-password").send({})).status).toBe(400);
  });

  test("rejects unknown forgot-password email", async () => {
    expect((await request(app).post("/api/v1/user/auth/forgot-password").send({ email: "none@example.com" })).status).toBe(404);
  });

  test("stores only a hashed, expiring password reset token", async () => {
    await createUser();
    expect((await request(app).post("/api/v1/user/auth/forgot-password").send({ email: "user@example.com" })).status).toBe(200);
    const storedUser = await User.collection.findOne({ email: "user@example.com" });
    expect(storedUser.Resettoken).toBeUndefined();
    expect(storedUser.passwordResetTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedUser.passwordResetTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  test("rejects empty reset-password payload", async () => {
    expect((await request(app).post("/api/v1/user/auth/reset-password").send({})).status).toBe(400);
  });

  test("rejects invalid reset token", async () => {
    expect((await request(app).post("/api/v1/user/auth/reset-password").send({ resetToken: "invalid", password: "NewPassword123!" })).status).toBe(404);
  });

  test("resets password once", async () => {
    const user = await createUser();
    const resetToken = "valid-reset-token";
    user.passwordResetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetTokenExpiresAt = new Date(Date.now() + 60_000);
    await user.save();
    expect((await request(app).post("/api/v1/user/auth/reset-password").send({ resetToken, password: "NewPassword123!" })).status).toBe(200);
    expect((await request(app).post("/api/v1/user/auth/reset-password").send({ resetToken, password: "Again123!" })).status).toBe(404);
  });

  test("rejects an expired password reset token", async () => {
    const user = await createUser();
    const resetToken = "expired-reset-token";
    user.passwordResetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetTokenExpiresAt = new Date(Date.now() - 1_000);
    await user.save();
    expect((await request(app).post("/api/v1/user/auth/reset-password").send({ resetToken, password: "NewPassword123!" })).status).toBe(404);
  });
});

describe("admin authorization", () => {
  test("rejects missing admin token", async () => {
    expect((await request(app).get("/api/v1/admin/dashboard")).status).toBe(401);
  });

  test("rejects normal user on admin API", async () => {
    const user = await createUser();
    expect((await request(app).get("/api/v1/admin/dashboard").set("Authorization", bearer(accessToken(user)))).status).toBe(403);
  });

  test("allows active admin", async () => {
    const admin = await createUser({ email: "admin@example.com", role: "admin" });
    expect((await request(app).get("/api/v1/admin/dashboard").set("Authorization", bearer(accessToken(admin)))).status).toBe(200);
  });

  test("allows superAdmin on admin API", async () => {
    const admin = await createUser({ email: "super@example.com", role: "superAdmin" });
    expect((await request(app).get("/api/v1/admin/dashboard").set("Authorization", bearer(accessToken(admin)))).status).toBe(200);
  });

  test("rejects blocked admin", async () => {
    const admin = await createUser({ email: "admin@example.com", role: "admin", active: false });
    expect((await request(app).get("/api/v1/admin/dashboard").set("Authorization", bearer(accessToken(admin)))).status).toBe(403);
  });
});

describe("categories and products", () => {
  test("lists categories publicly", async () => {
    await createCategory();
    const response = await request(app).get("/api/v1/user/categories/get-all");
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  test("rejects category creation by normal user", async () => {
    const user = await createUser();
    expect((await request(app).post("/api/v1/admin/categories/create").set("Authorization", bearer(accessToken(user))).field("name", "X")).status).toBe(403);
  });

  test("rejects category missing fields", async () => {
    const admin = await createUser({ role: "admin" });
    expect((await request(app).post("/api/v1/admin/categories/create").set("Authorization", bearer(accessToken(admin))).field("name", "Only name")).status).toBe(400);
  });

  test("creates a category with image", async () => {
    const admin = await createUser({ role: "admin" });
    const response = await request(app).post("/api/v1/admin/categories/create").set("Authorization", bearer(accessToken(admin))).field("name", "New Category").field("tagline", "Tagline").field("themecolor", "#000000").attach("User_image", await png(), "category.png");
    expect(response.status).toBe(201);
  });

  test("rejects invalid category file type with 400", async () => {
    const admin = await createUser({ role: "admin" });
    const response = await request(app).post("/api/v1/admin/categories/create").set("Authorization", bearer(accessToken(admin))).field("name", "Bad File").field("tagline", "Tagline").field("themecolor", "#000000").attach("User_image", Buffer.from("not an image"), "payload.txt");
    expect(response.status).toBe(400);
  });

  test("rejects oversized category upload with 413", async () => {
    const admin = await createUser({ role: "admin" });
    const response = await request(app).post("/api/v1/admin/categories/create").set("Authorization", bearer(accessToken(admin))).field("name", "Large File").field("tagline", "Tagline").field("themecolor", "#000000").attach("User_image", Buffer.alloc(6 * 1024 * 1024, 1), "large.png");
    expect(response.status).toBe(413);
  });

  test("lists and fetches products", async () => {
    const category = await createCategory();
    const product = await createProduct(category);
    expect((await request(app).get("/api/v1/user/products/all-product")).status).toBe(200);
    expect((await request(app).get(`/api/v1/user/products/product-id/${product._id}`)).status).toBe(200);
  });

  test("returns 400 for invalid product ObjectId", async () => {
    expect((await request(app).get("/api/v1/user/products/product-id/not-an-id")).status).toBe(400);
  });

  test("returns 404 for missing product", async () => {
    expect((await request(app).get(`/api/v1/user/products/product-id/${new mongoose.Types.ObjectId()}`)).status).toBe(404);
  });
});

describe("cart", () => {
  test("requires authentication", async () => {
    expect((await request(app).get("/api/v1/user/cart/me")).status).toBe(401);
  });

  test("rejects empty add payload", async () => {
    const user = await createUser();
    expect((await request(app).post("/api/v1/user/cart/add").set("Authorization", bearer(accessToken(user))).send({})).status).toBe(400);
  });

  test("rejects invalid product ObjectId", async () => {
    const user = await createUser();
    expect((await request(app).post("/api/v1/user/cart/add").set("Authorization", bearer(accessToken(user))).send({ productId: "bad", quantity: 1 })).status).toBe(400);
  });

  test("adds and retrieves a product", async () => {
    const user = await createUser();
    const category = await createCategory();
    const product = await createProduct(category);
    expect((await request(app).post("/api/v1/user/cart/add").set("Authorization", bearer(accessToken(user))).send({ productId: product._id, quantity: 2 })).status).toBe(200);
    const cart = await request(app).get("/api/v1/user/cart/me").set("Authorization", bearer(accessToken(user)));
    expect(cart.status).toBe(200);
    expect(cart.body.data.items).toHaveLength(1);
  });
});

describe("banners", () => {
  test("lists active banners publicly", async () => {
    await Banner.create({ bg: "/banner.webp", title: "Sale", isActive: true, public_id: "banner.webp", storageProvider: "local" });
    const response = await request(app).get("/api/v1/user/banners/all-banners");
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  test("returns 404 for missing banner", async () => {
    expect((await request(app).get(`/api/v1/user/banners/${new mongoose.Types.ObjectId()}`)).status).toBe(404);
  });

  test("requires admin for banner creation", async () => {
    expect((await request(app).post("/api/v1/admin/banners/create")).status).toBe(401);
  });

  test("creates banner with valid image", async () => {
    const admin = await createUser({ role: "admin" });
    const response = await request(app).post("/api/v1/admin/banners/create").set("Authorization", bearer(accessToken(admin))).field("title", "Sale").attach("banner_image", await png(20, 10), "banner.png");
    expect(response.status).toBe(201);
  });
});

describe("orders and checkout", () => {
  const address = { fullName: "Test User", phone: "9876543210", address: "Street 1", city: "Jaipur", state: "Rajasthan", pincode: "302001", country: "India" };

  test("requires authentication", async () => {
    expect((await request(app).get("/api/v1/user/orders/my-orders")).status).toBe(401);
  });

  test("rejects empty order", async () => {
    const user = await createUser();
    expect((await request(app).post("/api/v1/user/orders/place-order").set("Authorization", bearer(accessToken(user))).send({})).status).toBe(400);
  });

  test("rejects invalid product id", async () => {
    const user = await createUser();
    const response = await request(app).post("/api/v1/user/orders/place-order").set("Authorization", bearer(accessToken(user))).send({ items: [{ productId: "bad", quantity: 1 }], shippingAddress: address, paymentMethod: "COD" });
    expect(response.status).toBe(400);
  });

  test("places COD order and decrements stock", async () => {
    const user = await createUser();
    const category = await createCategory();
    const product = await createProduct(category, { stock: 5 });
    const response = await request(app).post("/api/v1/user/orders/place-order").set("Authorization", bearer(accessToken(user))).send({ items: [{ productId: product._id, quantity: 2 }], shippingAddress: address, paymentMethod: "COD" });
    expect(response.status).toBe(201);
    expect((await Product.findById(product._id)).stock).toBe(3);
  });

  test("returns 400 for invalid order ObjectId", async () => {
    const user = await createUser();
    expect((await request(app).get("/api/v1/user/orders/not-an-id").set("Authorization", bearer(accessToken(user)))).status).toBe(400);
  });

  test("admin lists orders", async () => {
    const admin = await createUser({ role: "admin" });
    expect((await request(app).get("/api/v1/admin/orders/all").set("Authorization", bearer(accessToken(admin)))).status).toBe(200);
  });
});

describe("query validation and external integrations", () => {
  test("rejects invalid login-activity pagination", async () => {
    const admin = await createUser({ role: "admin" });
    const response = await request(app).get("/api/v1/admin/login-activities?page=-10&limit=invalid").set("Authorization", bearer(accessToken(admin)));
    expect(response.status).toBe(400);
  });

  test.skip("performs real Razorpay checkout", () => {});
  test.skip("uploads and deletes a real S3 object", () => {});
  test.skip("uploads and deletes a real Cloudinary asset", () => {});
  test.skip("sends real verification and reset emails", () => {});
});
