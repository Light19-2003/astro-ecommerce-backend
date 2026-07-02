import mongoose from "mongoose";
import { type } from "node:os";

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    fullname: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    Resettoken: String,

    isVerified: Boolean,
    isActive: Boolean,
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("UserAuthenticationModel", UserSchema);
