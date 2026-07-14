import express from "express";
import { TrackPageView } from "../controllers/analytics.controller.js";
// import { TokenVerify } from "../middlewere/auth.middlewere.js";
// import { isAdmin } from "../middlewere/is-admin.middlewere.js";

const routes = express.Router();

routes.post("/track-page", TrackPageView);

export default routes;
