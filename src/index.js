import express from "express";
import dotenv from "dotenv";

import auth from "./router/auth.routes.js";

import db from "./Database/mongo.db.js";

// import db from "./Database/db.js";

import userprofile from "../src/router/User_profile.routes.js";

dotenv.config();

db();

const app = express();

app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/test", auth);

app.use("/api/user", userprofile);

app.listen(process.env.port, () =>
  console.log(`Server is running on port ${process.env.port}`),
);
