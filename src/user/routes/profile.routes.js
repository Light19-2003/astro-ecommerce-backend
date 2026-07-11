import express from "express";
import image from "../../middlewares/image.middleware.js";
import { GetProfile, SingleFieldProfileUpdate, UpdateProfile, UserProfileController } from "../controllers/profile.controller.js";
import { TokenVerify } from "../../middlewares/auth.middleware.js";

const router = express.Router();
router.post("/create", TokenVerify, image.single("User_image"), UserProfileController);
router.get("/get-profile", TokenVerify, GetProfile);
router.put("/update-profile", TokenVerify, image.single("User_image"), UpdateProfile);
router.patch("/update-profile", TokenVerify, image.single("User_image"), SingleFieldProfileUpdate);
export default router;
