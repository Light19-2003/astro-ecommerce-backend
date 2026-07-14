import express from "express";
import cors from "cors";

export const createTestApp = async () => {
  const { default: adminRouter } = await import("../src/admin/admin.routes.js");
  const { default: userRouter } = await import("../src/user/user.routes.js");

  const app = express();
  app.use(express.json());
  app.use(cors({ origin: "*" }));
  app.use("/api/v1", adminRouter);
  app.use("/api/v1", userRouter);
  app.use((error, req, res, next) => {
    res.status(error.status || 500).json({ message: error.message });
  });
  return app;
};
