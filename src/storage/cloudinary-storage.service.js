import { Readable } from "node:stream";
import cloudinary, { assertCloudinaryConfig } from "../config/image.config.js";

export const uploadToCloudinary = async ({ buffer, folder, assetId }) => {
  assertCloudinaryConfig();

  if (!buffer) throw new Error("Image buffer is required for Cloudinary upload");

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: assetId,
        resource_type: "image",
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          image: result.secure_url,
          public_id: result.public_id,
          storageProvider: "cloudinary",
        });
      },
    );

    Readable.from(buffer).pipe(upload);
  });
};

export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return false;
  assertCloudinaryConfig();
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
  return true;
};
