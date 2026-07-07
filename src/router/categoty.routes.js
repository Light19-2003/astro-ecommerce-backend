import express from "express";
import {
  CreateCategory,
  GetAllCategory,
  UpdateCategory,
  DeleteCategory,
} from "../controller/category.controller.js";

import image from "../middlewere/image.middlewere.js";

import { TokenVerify } from "../middlewere/auth.middlewere.js";
import { isAdmin } from "../middlewere/is-admin.middlewere.js";

const routes = express.Router();

routes.post(
  "/create",
  isAdmin,
  image.single("User_image"),

  CreateCategory,
);

routes.get("/get-all", TokenVerify, GetAllCategory);

routes.put(
  "/update/:categoryId",
  TokenVerify,
  image.single("User_image"),
  UpdateCategory,
);

routes.delete("/delete/:categoryId", TokenVerify, DeleteCategory);

export default routes;
