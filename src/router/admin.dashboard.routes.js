import express from "express";
import { GetDashboard } from "../controller/admin.controller.js";
import { isAdmin } from "../middlewere/is-admin.middlewere.js"; // Change path according to your project

const router = express.Router();

/**
 * Admin Dashboard
 */
router.get("/dashboard", isAdmin, GetDashboard);

export default router;
