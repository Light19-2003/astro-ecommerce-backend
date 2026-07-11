import express from "express";
import { GetAllBanners, GetBannerById } from "../controllers/banner.controller.js";

const router = express.Router();
router.get("/all-banners", GetAllBanners);
router.get("/:id", GetBannerById);
export default router;
