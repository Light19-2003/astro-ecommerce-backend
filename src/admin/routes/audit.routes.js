import express from "express";
import { GetAuditLogs } from "../controllers/audit.controller.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";

const router = express.Router();
router.get("/", isAdmin, GetAuditLogs);
export default router;
