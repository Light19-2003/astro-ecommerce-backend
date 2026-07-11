import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

export const shouldUseCloudinary = () => {
  const setting = process.env.USE_CLOUDINARY;

  if (setting === undefined) {
    return hasCloudinaryConfig();
  }

  return String(setting).toLowerCase() === "true";
};

export const assertCloudinaryConfig = () => {
  if (shouldUseCloudinary() && !hasCloudinaryConfig()) {
    throw new Error(
      "Cloudinary is enabled but CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET is missing",
    );
  }
};

export default cloudinary;
