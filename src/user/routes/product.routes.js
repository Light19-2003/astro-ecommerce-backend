import express from "express";
import { GetAllProduct, GetProductById, GetProductsByCategory } from "../controllers/product.controller.js";

const router = express.Router();
router.get("/all-product", GetAllProduct);
router.get("/product-id/:id", GetProductById);
router.get("/category/:categoryId", GetProductsByCategory);
export default router;
