import express from "express";
import adminRoutes from "./routes/admin.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import bannerRoutes from "./routes/banner.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import orderRoutes from "./routes/order.routes.js";
import policyRoutes from "./routes/policy.routes.js";
import productRoutes from "./routes/product.routes.js";
import reviewRoutes from "./routes/review.routes.js";

const router = express.Router();

// Canonical Admin API.
router.use("/admin", adminRoutes);
router.use("/admin/audit-logs", auditRoutes);
router.use("/admin/banners", bannerRoutes);
router.use("/admin/categories", categoryRoutes);
router.use("/admin/coupons", couponRoutes);
router.use("/admin/inventory", inventoryRoutes);
router.use("/admin/orders", orderRoutes);
router.use("/admin/policies", policyRoutes);
router.use("/admin/products", productRoutes);
router.use("/admin/reviews", reviewRoutes);

// Backward-compatible aliases for existing clients.
router.use("/banner", bannerRoutes);
router.use("/category", categoryRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/order", orderRoutes);
router.use("/policy", policyRoutes);
router.use("/product", productRoutes);
router.use("/review/admin", reviewRoutes);

export default router;
