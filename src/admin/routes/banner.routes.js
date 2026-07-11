import express from "express";
import { CreateBanner, DeleteBanner, UpdateBanner } from "../controllers/banner.controller.js";
import image from "../../middlewares/image.middleware.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";

const router = express.Router();
router.post("/create", isAdmin, image.single("banner_image"), CreateBanner);
router.put("/update/:id", isAdmin, image.single("banner_image"), UpdateBanner);
router.delete("/delete/:id", isAdmin, DeleteBanner);
export default router;
