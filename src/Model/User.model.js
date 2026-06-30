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
    fullname: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    Resettoken: String,
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("UserModel", UserSchema);
