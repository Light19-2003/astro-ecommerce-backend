import express from "express";
import { GetPageViews } from "../controllers/analytics.controller.js";
import { TokenVerify } from "../../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/is-admin.middleware.js";

const routes = express.Router();

routes.get("/page-views", TokenVerify, isAdmin, GetPageViews);

export default routes;
