import express from "express";
import dotenv from "dotenv";
import cros from "cors";

import auth from "./router/auth.routes.js";

import db from "./Database/mongo.db.js";
import cate from "./router/categoty.routes.js";
import product from "./router/product.routes.js";
import addtocart from "./router/cart.routes.js";

import dashboard from "./router/admin.dashboard.routes.js";

// import db from "./Database/db.js";

import userprofile from "../src/router/User_profile.routes.js";
import wishlist from "./router/wishlist.routes.js";

dotenv.config();

db();

const app = express();

app.use(express.json());
app.use(
  cros({
    origin: "*",
  }),
);
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  return res.status(200).json({
    message: "Astro ecommerce backend is running",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1/auth", auth);

app.use("/api/v1/user/profile", userprofile);

app.use("/api/v1/category", cate);

app.use("/api/v1/product", product);

app.use("/api/v1/cart", addtocart);

app.use("/api/v1/wishlist", wishlist);

app.use("/api/v1/dashboard", dashboard);

app.listen(process.env.port, () =>
  console.log(`Server is running on port ${process.env.port}`),
);
