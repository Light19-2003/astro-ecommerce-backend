import express from "express";
import { CreateInventory, GetAllInventory, GetInventoryByProduct, InsertMissingInventoryFromProducts, UpdateStock } from "../controllers/inventory.controller.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";

const router = express.Router();
router.post("/create", isAdmin, CreateInventory);
router.post("/insert-missing", isAdmin, InsertMissingInventoryFromProducts);
router.get("/get-inventory", isAdmin, GetAllInventory);
router.get("/:productId", isAdmin, GetInventoryByProduct);
router.put("/:productId", isAdmin, UpdateStock);
export default router;
