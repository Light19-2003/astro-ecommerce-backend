import express from "express";
import { TokenVerify } from "../../middlewares/auth.middleware.js";
import { ApplyCoupon, GetAvailableCoupons } from "../controllers/coupon.controller.js";

const router = express.Router();
router.get("/active", TokenVerify, GetAvailableCoupons);
router.post("/apply", TokenVerify, ApplyCoupon);
export default router;
