import express from "express";
import { GetAllPolicies, GetPolicyBySlug } from "../controllers/policy.controller.js";

const router = express.Router();
router.get("/all-policies", GetAllPolicies);
router.get("/:slug", GetPolicyBySlug);
export default router;
