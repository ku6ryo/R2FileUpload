import { S3Client } from "@aws-sdk/client-s3";

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_CUSTOM_DOMAIN = process.env.R2_CUSTOM_DOMAIN;

if (
  !R2_ACCOUNT_ID ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !R2_BUCKET_NAME
) {
  console.warn(
    "R2 environment variables are not configured. File uploads will return metadata only.",
  );
}

if (!R2_CUSTOM_DOMAIN) {
  console.warn(
    "R2_CUSTOM_DOMAIN is not configured. File URLs will not be generated.",
  );
}

// Create S3 client configured for Cloudflare R2
export const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ACCOUNT_ID
    ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined,
  credentials:
    R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
      ? {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export const R2_CONFIG = {
  BUCKET_NAME: R2_BUCKET_NAME,
  ACCOUNT_ID: R2_ACCOUNT_ID,
  ACCESS_KEY_ID: R2_ACCESS_KEY_ID,
  SECRET_ACCESS_KEY: R2_SECRET_ACCESS_KEY,
  CUSTOM_DOMAIN: R2_CUSTOM_DOMAIN,
};

// Check if R2 is properly configured
export const isR2Configured = () => {
  return !!(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME
  );
};

// Generate public URL using custom domain
export const generatePublicUrl = (filename: string) => {
  if (!R2_CUSTOM_DOMAIN) {
    return null;
  }
  // Ensure the domain starts with https://
  const domain = R2_CUSTOM_DOMAIN.startsWith("http")
    ? R2_CUSTOM_DOMAIN
    : `https://${R2_CUSTOM_DOMAIN}`;

  return `${domain}/${filename}`;
};
