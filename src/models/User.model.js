import mongoose from "mongoose";

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

    role: {
      type: String,
      enum: ["user", "admin", "superAdmin", "orderManager"],
      required: true,
      default: "user",
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
