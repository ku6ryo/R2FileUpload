import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  r2Client,
  R2_CONFIG,
  isR2Configured,
  generatePublicUrl,
} from "@/lib/r2";

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 },
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}_${originalName}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let uploadResult = null;
    let fileUrl = null;

    // Upload to R2 if configured
    if (isR2Configured()) {
      try {
        const uploadParams = {
          Bucket: R2_CONFIG.BUCKET_NAME,
          Key: filename,
          Body: buffer,
          ContentType: file.type,
          ContentLength: file.size,
        };

        const command = new PutObjectCommand(uploadParams);
        uploadResult = await r2Client.send(command);

        // Generate the public URL using custom domain
        fileUrl = generatePublicUrl(filename);

        console.log("File uploaded to R2 successfully:", uploadResult);
      } catch (r2Error) {
        console.error("R2 upload error:", r2Error);
        return NextResponse.json(
          { error: "Failed to upload file to R2" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: isR2Configured()
        ? "File uploaded to R2 successfully"
        : "File processed successfully (R2 not configured)",
      fileInfo: {
        originalName: file.name,
        filename: filename,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        url: fileUrl,
        r2Configured: isR2Configured(),
        uploadMetadata: uploadResult
          ? {
              etag: uploadResult.ETag,
              versionId: uploadResult.VersionId,
            }
          : null,
      },
    });
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
