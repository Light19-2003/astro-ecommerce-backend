import express from "express";
import { CreateCategory, DeleteCategory, UpdateCategory } from "../controllers/category.controller.js";
import image from "../../middlewares/image.middleware.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";

const router = express.Router();
router.post("/create", isAdmin, image.single("User_image"), CreateCategory);
router.put("/update/:categoryId", isAdmin, image.single("User_image"), UpdateCategory);
router.delete("/delete/:categoryId", isAdmin, DeleteCategory);
export default router;
