import express from "express";
import {
  BlockUser,
  GetAllUsers,
  GetDashboard,
  UnBlockUser,
} from "../controllers/admin.controller.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";

import { GetLoginActivities } from "../controllers/login-activity.controller.js";

const router = express.Router();
router.get("/dashboard", isAdmin, GetDashboard);
router.get("/all-users", isAdmin, GetAllUsers);
router.put("/block/:id", isAdmin, BlockUser);
router.put("/unblock/:id", isAdmin, UnBlockUser);
router.get("/login-activities", isAdmin, GetLoginActivities);
export default router;
