import express from "express";
import {
  GetHomepageSettings,
  UpdateHomepageSettings,
} from "../controllers/homepage.controller.js";

import { isAdmin } from "../middlewares/is-admin.middleware.js";

const router = express.Router();

router.get("/settings", isAdmin, GetHomepageSettings);
router.put("/Update-settings", isAdmin, UpdateHomepageSettings);

export default router;
