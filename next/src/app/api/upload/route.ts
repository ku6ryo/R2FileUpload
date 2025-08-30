import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import {
  r2Client,
  R2_CONFIG,
  isR2Configured,
  generatePublicUrl,
} from "@/lib/r2";

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(request: NextRequest) {
  // Check for compression flag in query (?compress=true)
  const { searchParams } = new URL(request.url);
  const compressImages = searchParams.get("compress") === "true";
  try {
    const formData = await request.formData();
    // Get all files (support multiple)
    const files = formData.getAll("file").filter(f => f instanceof File) as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results = await Promise.all(files.map(async (file) => {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return { error: `File '${file.name}' size exceeds 5MB limit` };
      }
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return { error: `File '${file.name}' type not allowed` };
      }
      // Generate unique filename
      const timestamp = Date.now();
      const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filename = `${timestamp}_${originalName}`;
      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      // Always convert to Buffer using Uint8Array for sharp compatibility
      let buffer: Buffer<ArrayBuffer> | Buffer<ArrayBufferLike> = Buffer.from(new Uint8Array(bytes));
      // If compression is enabled and file is an image, compress it
      if (compressImages && sharp && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        try {
          // Use sharp to compress image (TinyPNG-like: quality 70, strip metadata)
          const nodeBuffer = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
          if (file.type === "image/jpeg") {
            buffer = (await sharp(nodeBuffer).jpeg({ quality: 70, mozjpeg: true }).toBuffer()) as Buffer;
          } else if (file.type === "image/png") {
            buffer = (await sharp(nodeBuffer).png({ quality: 70, compressionLevel: 9 }).toBuffer()) as Buffer;
          } else if (file.type === "image/webp") {
            buffer = (await sharp(nodeBuffer).webp({ quality: 70 }).toBuffer()) as Buffer;
          }
        } catch (err) {
          return { error: `Failed to compress image '${file.name}'` };
        }
      }
      let uploadResult = null;
      let fileUrl = null;
      if (isR2Configured()) {
        try {
          const uploadParams = {
            Bucket: R2_CONFIG.BUCKET_NAME,
            Key: filename,
            Body: buffer,
            ContentType: file.type,
            ContentLength: buffer.length,
          };
          const command = new PutObjectCommand(uploadParams);
          uploadResult = await r2Client.send(command);
          fileUrl = generatePublicUrl(filename);
        } catch (r2Error) {
          return { error: `Failed to upload '${file.name}' to R2` };
        }
      }
      return {
        success: true,
        fileInfo: {
          originalName: file.name,
          filename: filename,
          size: buffer.length,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          url: fileUrl,
          uploadMetadata: uploadResult
            ? {
              etag: uploadResult.ETag,
              versionId: uploadResult.VersionId,
            }
            : null,
        },
      };
    }));
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
