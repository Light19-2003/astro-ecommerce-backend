import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

/* =====================================================
   CLOUDINARY CONFIGURATION
===================================================== */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* =====================================================
   CLOUDINARY VALIDATION
===================================================== */

export const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );

export const assertCloudinaryConfig = () => {
  if (!hasCloudinaryConfig()) {
    throw new Error(
      "Cloudinary is enabled but CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET is missing",
    );
  }
};

export default cloudinary;
