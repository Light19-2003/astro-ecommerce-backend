import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import s3Client, { assertAwsConfig } from "../config/aws.config.js";

const removeTrailingSlash = (value = "") => String(value).replace(/\/+$/, "");

const removeLeadingSlash = (value = "") => String(value).replace(/^\/+/, "");

export const buildS3ImageUrl = (key) => {
  const normalizedKey = removeLeadingSlash(key);

  if (process.env.AWS_CLOUDFRONT_URL) {
    const cloudFrontUrl = removeTrailingSlash(process.env.AWS_CLOUDFRONT_URL);

    return `${cloudFrontUrl}/${normalizedKey}`;
  }

  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${normalizedKey}`;
};

export const uploadToS3 = async ({
  buffer,
  key,
  contentType = "image/webp",
}) => {
  assertAwsConfig();

  if (!buffer) {
    throw new Error("Image buffer is required for S3 upload");
  }

  if (!key) {
    throw new Error("S3 object key is required");
  }

  const normalizedKey = removeLeadingSlash(key);

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: normalizedKey,
    Body: buffer,
    ContentType: contentType,

    // Do not add ACL: "public-read" unless your bucket explicitly
    // supports object ACLs. CloudFront is recommended for delivery.
  });

  await s3Client.send(command);

  return {
    image: buildS3ImageUrl(normalizedKey),
    public_id: normalizedKey,
    storageProvider: "s3",
  };
};

export const deleteFromS3 = async (key) => {
  if (!key) return false;

  assertAwsConfig();

  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: removeLeadingSlash(key),
  });

  await s3Client.send(command);

  return true;
};
