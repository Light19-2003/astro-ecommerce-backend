import express from "express";
import { AdminCreateCoupon, AdminDeleteCoupon, AdminGetCoupons, AdminUpdateCoupon } from "../controllers/coupon.controller.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";

const router = express.Router();
router.get("/", isAdmin, AdminGetCoupons);
router.post("/", isAdmin, AdminCreateCoupon);
router.put("/:id", isAdmin, AdminUpdateCoupon);
router.delete("/:id", isAdmin, AdminDeleteCoupon);
export default router;
