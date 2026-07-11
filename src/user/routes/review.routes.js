import express from "express";
import { CreateOrUpdateReview, DeleteReview, GetMyReviews, GetProductReviews, GetReviewEligibility, UpdateReview } from "../controllers/review.controller.js";
import { TokenVerify } from "../../middlewares/auth.middleware.js";

const router = express.Router();
router.get("/product/:productId", GetProductReviews);
router.get("/product/:productId/eligibility", TokenVerify, GetReviewEligibility);
router.post("/product/:productId", TokenVerify, CreateOrUpdateReview);
router.get("/my-reviews", TokenVerify, GetMyReviews);
router.put("/:reviewId", TokenVerify, UpdateReview);
router.delete("/:reviewId", TokenVerify, DeleteReview);
export default router;
