import mongoose from "mongoose";

const PolicySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    heading: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    position: {
      type: Number,
      default: 0,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserAuthenticationModel",
    },
    lastEditedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserAuthenticationModel",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Policy", PolicySchema);
