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
    // Get all files (support multiple)
    const files = formData.getAll("file").filter(f => f instanceof File) as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results = await Promise.all(files.map(async (file) => {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return { error: `File '${file.name}' size exceeds 10MB limit` };
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
      const buffer = Buffer.from(bytes);
      let uploadResult = null;
      let fileUrl = null;
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
          size: file.size,
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
