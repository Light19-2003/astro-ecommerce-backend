import express from "express";
import { GetAllOrders, UpdateOrderStatus } from "../controllers/order.controller.js";
import { TokenVerify } from "../../middlewares/auth.middleware.js";
import { canManageOrders } from "../middlewares/order.middleware.js";

const router = express.Router();
router.get("/all", TokenVerify, canManageOrders, GetAllOrders);
router.patch("/:orderId/status", TokenVerify, canManageOrders, UpdateOrderStatus);
export default router;
