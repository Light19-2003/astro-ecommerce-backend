import express from "express";
import {
  AdminGetReturns,
  AdminUpdateReturnStatus,
} from "../controllers/return.controller.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";

const router = express.Router();
router.get("/", isAdmin, AdminGetReturns);
router.patch("/:id/status", isAdmin, AdminUpdateReturnStatus);
export default router;
