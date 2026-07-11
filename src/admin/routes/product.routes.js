import express from "express";
import { CreateProduct, DeleteProduct, UpdateProduct } from "../controllers/product.controller.js";
import image from "../../middlewares/image.middleware.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";

const router = express.Router();
router.post("/create", isAdmin, image.single("User_image"), CreateProduct);
router.delete("/delete/:id", isAdmin, DeleteProduct);
router.put("/update/:id", isAdmin, image.single("User_image"), UpdateProduct);
export default router;
