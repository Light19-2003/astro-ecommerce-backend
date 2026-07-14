import express from "express";
import { TokenVerify } from "../../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";
import {
  getReferralSettings,
  updateReferralSettings,
  getReferralStats,
  getReferralDetails,
  deleteReferrerRecord,
  deleteDiscountRecord,
} from "../controllers/referral.controller.js";

const router = express.Router();

router.get("/settings", TokenVerify, isAdmin, getReferralSettings);
router.put("/settings", TokenVerify, isAdmin, updateReferralSettings);
router.get("/stats", TokenVerify, isAdmin, getReferralStats);
router.get("/details", TokenVerify, isAdmin, getReferralDetails);
router.delete(
  "/referrer/:id",
  TokenVerify,
  isAdmin,
  deleteReferrerRecord,
);
router.delete(
  "/discount/:id",
  TokenVerify,
  isAdmin,
  deleteDiscountRecord,
);

export default router;
