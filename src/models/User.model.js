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
    passwordResetTokenHash: {
      type: String,
      select: false,
      index: true,
    },
    passwordResetTokenExpiresAt: {
      type: Date,
      select: false,
    },

    isVerified: Boolean,
    isActive: Boolean,
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("UserAuthenticationModel", UserSchema);
