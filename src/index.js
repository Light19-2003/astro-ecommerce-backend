import express from "express";
import dotenv from "dotenv";
import cros from "cors";

import db from "./database/mongo.db.js";
import adminRouter from "./admin/admin.routes.js";
import userRouter from "./user/user.routes.js";

dotenv.config();

await db();

const app = express();

app.use(express.json());
app.use(
	cros({
		origin: "*",
	})
);
app.use("/uploads", express.static("uploads"));

app.use("/api/v1", adminRouter);
app.use("/api/v1", userRouter);

app.listen(process.env.port, () =>
	console.log(`Server is running on port ${process.env.port}`)
);
