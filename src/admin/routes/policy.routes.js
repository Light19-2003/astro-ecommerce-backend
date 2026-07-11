import express from "express";
import { CreatePolicy, DeletePolicy, UpdatePolicy } from "../controllers/policy.controller.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";

const router = express.Router();
router.post("/create", isAdmin, CreatePolicy);
router.put("/update/:id", isAdmin, UpdatePolicy);
router.delete("/delete/:id", isAdmin, DeletePolicy);
export default router;
