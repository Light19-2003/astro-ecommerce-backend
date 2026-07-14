import express from "express";
import {
  CreateRazorpayOrder,
  VerifyRazorpayPayment,
} from "../controllers/payment.controller.js";
import { TokenVerify } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/razorpay/order", TokenVerify, CreateRazorpayOrder);
router.post("/razorpay/verify", TokenVerify, VerifyRazorpayPayment);

export default router;
