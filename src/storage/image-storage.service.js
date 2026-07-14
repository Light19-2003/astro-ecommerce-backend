import fs from "fs";
import path from "path";
import sharp from "sharp";

import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "./cloudinary-storage.service.js";

import { uploadToS3, deleteFromS3 } from "./s3-storage.service.js";

const uploadDir = path.resolve("uploads");

export const getStorageProvider = () => {
  const configured = process.env.IMAGE_STORAGE_PROVIDER;
  if (configured) return String(configured).trim().toLowerCase();

  // Backward compatibility for deployments that used the old flag.
  return String(process.env.USE_CLOUDINARY || "false").toLowerCase() === "true"
    ? "cloudinary"
    : "local";
};

export const slugify = (value = "image") => {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "image";
};

const ensureUploadDirectory = async () => {
  await fs.promises.mkdir(uploadDir, {
    recursive: true,
  });
};

const buildProcessedImage = async ({ file, width, height, fit, quality }) => {
  if (!file?.buffer) {
    throw new Error(
      "Uploaded file buffer is missing. Make sure Multer uses memoryStorage().",
    );
  }

  const imageProcessor = sharp(file.buffer).rotate();

  if (width || height) {
    imageProcessor.resize({
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      fit,
      withoutEnlargement: true,
    });
  }

  return imageProcessor
    .webp({
      quality: Number(quality),
    })
    .toBuffer();
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

  const supportedProviders = ["local", "cloudinary", "s3"];
  const storageProvider = getStorageProvider();

  if (!supportedProviders.includes(storageProvider)) {
    throw new Error(
      `Invalid IMAGE_STORAGE_PROVIDER: ${storageProvider}. Use local, cloudinary, or s3.`,
    );
  }

  await ensureUploadDirectory();

  const slug = slugify(name);
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

  const assetId = `${slug}-${uniqueSuffix}`;
  const fileName = `${assetId}.webp`;
  const filePath = path.join(uploadDir, fileName);

  const processedBuffer = await buildProcessedImage({
    file,
    width,
    height,
    fit,
    quality,
  });

  if (storageProvider === "cloudinary") {
    const cloudinaryResult = await uploadToCloudinary({
      buffer: processedBuffer,
      folder,
      assetId,
    });

    return {
      ...cloudinaryResult,
      localimage: null,
    };
  }

  if (storageProvider === "s3") {
    const objectKey = `${folder}/${fileName}`.replace(/\\/g, "/");

    const s3Result = await uploadToS3({
      buffer: processedBuffer,
      key: objectKey,
      contentType: "image/webp",
    });

    return {
      ...s3Result,
      localimage: null,
    };
  }

  await fs.promises.writeFile(filePath, processedBuffer);

  return {
    image: `/uploads/${fileName}`,
    localimage: filePath,
    public_id: fileName,
    storageProvider: "local",
  };
};

const deleteLocalImage = async (localImagePath, publicId) => {
  const possiblePath =
    localImagePath ||
    (publicId ? path.join(uploadDir, path.basename(publicId)) : null);

  if (!possiblePath) return false;

  try {
    await fs.promises.unlink(possiblePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return true;
    }

    throw error;
  }
};

export const deleteImageAsset = async ({
  publicId,
  storageProvider = "local",
  localimage = null,
}) => {
  if (!publicId && !localimage) return false;

  const normalizedProvider = String(storageProvider || "local")
    .trim()
    .toLowerCase();

  try {
    if (normalizedProvider === "cloudinary") {
      return await deleteFromCloudinary(publicId);
    }

    if (normalizedProvider === "s3") {
      return await deleteFromS3(publicId);
    }

    return await deleteLocalImage(localimage, publicId);
  } catch (error) {
    console.error(
      `${normalizedProvider} image deletion failed:`,
      error.message,
    );

    return false;
  }
};

export const replaceImageAsset = async ({
  oldAsset,
  newFile,
  folder = "uploads",
  name = "image",
  width = 500,
  height = 500,
  fit = "cover",
  quality = 80,
}) => {
  if (!newFile) {
    return oldAsset || null;
  }

  const newAsset = await saveImageAsset({
    file: newFile,
    folder,
    name,
    width,
    height,
    fit,
    quality,
  });

  if (oldAsset?.public_id || oldAsset?.localimage) {
    await deleteImageAsset({
      publicId: oldAsset.public_id,
      localimage: oldAsset.localimage,
      storageProvider: oldAsset.storageProvider,
    });
  }

  return newAsset;
};
