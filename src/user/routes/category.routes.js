import express from "express";
import { GetAllCategory } from "../controllers/category.controller.js";

const router = express.Router();
router.get("/get-all", GetAllCategory);
export default router;
