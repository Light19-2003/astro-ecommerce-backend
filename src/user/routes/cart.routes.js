import express from "express";
import { addToCart, clearCart, decrementedQuantity, deletecartproduct, getCart, incrementQuantity, singleProduct, updateQuantity } from "../controllers/cart.controller.js";
import { TokenVerify } from "../../middlewares/auth.middleware.js";

const router = express.Router();
router.get("/", (req, res) => res.send("hello world"));
router.post("/bulk", TokenVerify, addToCart);
router.post("/single-add", TokenVerify, singleProduct);
router.post("/add", TokenVerify, singleProduct);
router.patch("/quantity", TokenVerify, updateQuantity);
router.patch("/increment-quantity", TokenVerify, incrementQuantity);
router.patch("/decrement-quantity", TokenVerify, decrementedQuantity);
router.get("/get-all", TokenVerify, getCart);
router.get("/me", TokenVerify, getCart);
router.delete("/delete", TokenVerify, deletecartproduct);
router.delete("/clear", TokenVerify, clearCart);
export default router;
