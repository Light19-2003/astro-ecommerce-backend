import expres from "express";

import image from "../middlewere/image.middlewere.js";
import {
  UserProfile,
  GetProfile,
  UpdateProfile,
  SingleFieldProfileUpdate,
} from "../controller/profile.controller.js";
import { TokenVerify } from "../middlewere/auth.middlewere.js";

const routes = expres.Router();

//    post profile

routes.post(
  "/create-profile",
  TokenVerify,
  image.single("User_image"),
  UserProfile,
);

//  get profile

routes.get("/get-profile", TokenVerify, GetProfile);

//  put profile / patch

routes.put(
  "/update-profile",
  TokenVerify, 
  image.single("User_image"),
  UpdateProfile,
);

routes.patch(
  "/update-profile",
  TokenVerify,
  image.single("User_image"),
  SingleFieldProfileUpdate,
);

export default routes;
