import express from "express";
import authRoutes from "./routes/auth.routes.js";
import bannerRoutes from "./routes/banner.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import orderRoutes from "./routes/order.routes.js";
import policyRoutes from "./routes/policy.routes.js";
import productRoutes from "./routes/product.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";

import analyticsRoutes from "./routes/analytics.routes.js";

import payementRoutes from "./routes/payment.routes.js";
import returnRoutes from "./routes/return.routes.js";

const router = express.Router();

// Canonical User API.
router.use("/user/auth", authRoutes);
router.use("/user/banners", bannerRoutes);
router.use("/user/cart", cartRoutes);
router.use("/user/categories", categoryRoutes);
router.use("/user/coupons", couponRoutes);
router.use("/user/orders", orderRoutes);
router.use("/user/policies", policyRoutes);
router.use("/user/products", productRoutes);
router.use("/user/profile", profileRoutes);
router.use("/user/reviews", reviewRoutes);
router.use("/user/wishlist", wishlistRoutes);
router.use("/user/analytics", analyticsRoutes);
router.use("/user/payment", payementRoutes);
router.use("/user/returns", returnRoutes);

// Backward-compatible aliases for existing clients.
router.use("/auth", authRoutes);
router.use("/banner", bannerRoutes);
router.use("/cart", cartRoutes);
router.use("/category", categoryRoutes);
router.use("/coupon", couponRoutes);
router.use("/order", orderRoutes);
router.use("/policy", policyRoutes);
router.use("/product", productRoutes);
router.use("/review", reviewRoutes);
router.use("/wishlist", wishlistRoutes);

//  analytics routes

router.use("/analytics", analyticsRoutes);

// payment routes

router.use("/payment", payementRoutes);
// return routes

router.use("/return", returnRoutes);

export default router;
