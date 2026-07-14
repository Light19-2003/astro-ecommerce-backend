import express from "express";
import { CreateUser, EmailVerfily, ForgetPassword, login, logout, RefreshToken, ResetPassword } from "../controllers/auth.controller.js";
import { TokenVerify } from "../../middlewares/auth.middleware.js";

const router = express.Router();
router.get("/", (req, res) => res.send("hello world"));
router.post("/create", CreateUser);
router.post("/email-verify", EmailVerfily);
router.post("/login", login);
router.post("/logout", TokenVerify, logout);
router.post("/forgot-password", ForgetPassword);
router.post("/reset-password", ResetPassword);
router.get("/refresh-token", RefreshToken);
router.post("/refresh-token", RefreshToken);
export default router;
