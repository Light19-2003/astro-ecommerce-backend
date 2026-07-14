import mongoose from "mongoose";

const BannerSchema = new mongoose.Schema(
  {
    bg: {
      type: String,
      required: true,
    },
    public_id: {
      type: String,
    },
    localimage: {
      type: String,
      default: null,
    },
    storageProvider: {
      type: String,
      enum: ["local", "cloudinary", "s3"],
      default: "cloudinary",
    },
    title: {
      type: String,
      default: "",
    },
    titleColor: String,
    subtitle: String,
    subtitleColor: String,
    cta: String,
    ctaBg: String,
    ctaText: String,
    overlayOpacity: Number,
    alignment: String,
    to: {
      type: String,
      default: "/",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Banner", BannerSchema);
