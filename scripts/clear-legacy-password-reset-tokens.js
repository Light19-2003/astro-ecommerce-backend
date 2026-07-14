import dotenv from "dotenv";
import mongoose from "mongoose";

import UserModel from "../src/models/User.model.js";

dotenv.config();

const clearLegacyPasswordResetTokens = async () => {
  if (!process.env.mango_url) {
    throw new Error("mango_url is required");
  }

  await mongoose.connect(process.env.mango_url);

  try {
    const result = await UserModel.collection.updateMany(
      { Resettoken: { $exists: true } },
      { $unset: { Resettoken: "" } },
    );

    console.log(
      `Removed legacy plaintext password-reset tokens from ${result.modifiedCount} user record(s).`,
    );
  } finally {
    await mongoose.disconnect();
  }
};

clearLegacyPasswordResetTokens().catch((error) => {
  console.error("Password-reset token migration failed:", error.message);
  process.exitCode = 1;
});
