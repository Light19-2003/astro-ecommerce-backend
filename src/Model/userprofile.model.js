import mongoose from "mongoose";

const userprofile = new mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },

    middleName: {
      type: String,
    },

    lastName: {
      type: String,
      required: true,
    },

    phoneNumber: {
      type: String,
      required: true,
    },

    avatar: String,
    bio: String,

    gender: String,
    dob: Date,
    address: {
      city: String,
      state: String,
      country: String,
    },
  },

  {
    timestamps: true,
  },
);

export default mongoose.model("userprofile", userprofile);
