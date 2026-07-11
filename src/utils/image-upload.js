import fs from "fs";
import path from "path";
import sharp from "sharp";
import cloudinary, {
  assertCloudinaryConfig,
  shouldUseCloudinary,
} from "../config/image.config.js";

const uploadDir = "uploads";

export const slugify = (value = "image") => {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");

  return slug || "image";
};

export const saveImageAsset = async ({
  file,
  folder = "uploads",
  name = "image",
  width = 500,
  height = 500,
  fit = "cover",
  quality = 80,
}) => {
  if (!file) return null;

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  const slug = slugify(name);
  const assetId = `${slug}-${Date.now()}`;
  const fileName = `${assetId}.webp`;
  const filePath = path.join(uploadDir, fileName);

  await sharp(file.buffer)
    .resize(width, height, { fit })
    .webp({ quality })
    .toFile(filePath);

  const result = {
    image: filePath,
    localimage: filePath,
    public_id: null,
  };

  if (shouldUseCloudinary()) {
    assertCloudinaryConfig();

    const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
      folder,
      public_id: assetId,
      resource_type: "image",
    });

    result.image = cloudinaryResult.secure_url;
    result.public_id = cloudinaryResult.public_id;
  }

  return result;
};

export const deleteImageAsset = async (publicId) => {
  if (!publicId || !shouldUseCloudinary()) return;

  try {
    assertCloudinaryConfig();
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    console.error("Cloudinary image cleanup failed:", error.message);
  }
};
