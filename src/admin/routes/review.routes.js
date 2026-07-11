import express from "express";
import { GetAdminReviews, UpdateAdminReviewStatus } from "../controllers/review.controller.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";

const router = express.Router();
router.get("/all", isAdmin, GetAdminReviews);
router.patch("/:reviewId/status", isAdmin, UpdateAdminReviewStatus);
export default router;
