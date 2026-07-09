import mongoose from "mongoose";

const Categoty = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    tagline: {
      type: String,
      required: true,
    },
    themecolor: {
      type: String,
      required: true,
      default: "#000000",
    },

    image: {
      type: String,
      required: true,
    },
  },

  {
    timestamps: true,
  },
);

export default mongoose.model("Category", Categoty);

// name;
// tagline;

// themecolore;

// image;
