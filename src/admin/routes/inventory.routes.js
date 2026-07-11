import express from "express";
import { CreateInventory, GetAllInventory, GetInventoryByProduct, InsertMissingInventoryFromProducts, UpdateStock } from "../controllers/inventory.controller.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";

const router = express.Router();
router.post("/create", CreateInventory);
router.post("/insert-missing", isAdmin, InsertMissingInventoryFromProducts);
router.get("/get-inventory", GetAllInventory);
router.get("/:productId", GetInventoryByProduct);
router.put("/:productId", UpdateStock);
export default router;
