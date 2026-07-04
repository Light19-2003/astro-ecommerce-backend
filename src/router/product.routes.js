import express from "express";
import {
  CreateProduct,
  GetAllProduct,
  DeleteProduct,
  GetProductById,
  UpdateProduct,
} from "../controller/product.controller.js";
import image from "../middlewere/image.middlewere.js";

import { TokenVerify } from "../middlewere/auth.middlewere.js";
const routes = express.Router();

routes.post("/create", TokenVerify, image.single("User_image"), CreateProduct);

routes.get("/all-product", TokenVerify, GetAllProduct);

routes.get("/product-id/:id", TokenVerify, GetProductById);

routes.delete("/delete/:id", TokenVerify, DeleteProduct);

routes.put(
  "/update/:id",
  TokenVerify,
  image.single("User_image"),
  UpdateProduct,
);

export default routes;
