import express from "express";
import { CancelOrder, GetMyOrders, GetSingleOrder, PlaceOrder, VerifyPayment } from "../controllers/order.controller.js";
import { TokenVerify } from "../../middlewares/auth.middleware.js";

const router = express.Router();
router.post("/create", TokenVerify, PlaceOrder);
router.post("/place-order", TokenVerify, PlaceOrder);
router.post("/verify-payment", TokenVerify, VerifyPayment);
router.get("/my-orders", TokenVerify, GetMyOrders);
router.get("/:orderId", TokenVerify, GetSingleOrder);
router.patch("/:orderId/cancel", TokenVerify, CancelOrder);
export default router;
