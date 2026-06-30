import express from "express";
import {
  login,
  RefreshToken,
  CreateUser,
  ForgetPassword,
  ResetPassword,
  EmailVerfily,
} from "../controller/auth.controller.js";

import { TokenVerify } from "../middlewere/auth.middlewere.js";
const router = express.Router();

router.get("/", (req, res) => {
  res.send("hello world");
});

router.post("/Create-user", CreateUser);

router.post("/emailverify", EmailVerfily);

router.post("/login", login);

router.post("/forget-password", ForgetPassword);

router.post("/reset-password", ResetPassword);
// router.post("/Token-testing", TokenVerify, (req, res) => {
//   res.send(req.user.id);
// });

router.get("/Refresh-token", RefreshToken);

export default router;
