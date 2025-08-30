# R2 File Upload with Next.js

A Next.js application for uploading files to Cloudflare R2 using the AWS S3 SDK.

## Features

- File upload to Cloudflare R2 storage
- File validation (size, type)
- Real-time upload progress
- File listing from R2 bucket
- R2 connection status checking
- Responsive UI with dark mode support

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Cloudflare R2

1. Go to your [Cloudflare dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage**
3. Create a new bucket or use an existing one
4. Go to **Manage R2 API tokens**
5. Create a new API token with R2 permissions
6. **Set up a custom domain** for your R2 bucket:
   - In your R2 bucket settings, go to "Settings"
   - Under "Public Access", click "Connect Domain"
   - Add your custom domain (e.g., `test250826.kaminari-cloud.com`)
   - Follow Cloudflare's instructions to configure DNS

> **Important:** Cloudflare R2 requires a custom domain for public file access. Direct R2 URLs are not publicly accessible.

### 3. Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Fill in your R2 credentials in `.env.local`:

```env
# Your Cloudflare Account ID (found in the right sidebar of your dashboard)
R2_ACCOUNT_ID=your_account_id_here

# R2 API Token credentials
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here

# Your R2 bucket name
R2_BUCKET_NAME=your_bucket_name_here

# Your custom domain for R2 bucket (REQUIRED for public file access)
R2_CUSTOM_DOMAIN=test250826.kaminari-cloud.com
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

### POST /api/upload

Upload a file to R2.

**Body:** `multipart/form-data` with a `file` field

**Response:**
```json
{
  "success": true,
  "message": "File uploaded to R2 successfully",
  "fileInfo": {
    "originalName": "example.jpg",
    "filename": "1693484400000_example.jpg",
    "size": 123456,
    "type": "image/jpeg",
    "uploadedAt": "2024-08-30T10:00:00.000Z",
    "url": "https://test250826.kaminari-cloud.com/1693484400000_example.jpg",
    "r2Configured": true,
    "uploadMetadata": {
      "etag": "\"d41d8cd98f00b204e9800998ecf8427e\"",
      "versionId": null
    }
  }
}
```

### GET /api/r2

Check R2 connection and list files.

**Query Parameters:**
- `action=list-buckets` - List all available buckets
- `action=list-objects` - List objects in the configured bucket

## Usage Examples

### JavaScript/TypeScript

```typescript
// Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

### cURL

```bash
# Upload file
curl -X POST -F "file=@path/to/your/file.jpg" http://localhost:3000/api/upload

# List buckets
curl "http://localhost:3000/api/r2?action=list-buckets"

# List objects
curl "http://localhost:3000/api/r2?action=list-objects"
```

## File Validation

- **Maximum file size:** 10MB
- **Allowed file types:**
  - Images: JPEG, PNG, GIF, WebP
  - Documents: PDF, TXT, DOC, DOCX

## Troubleshooting

### R2 Not Configured Error

If you see "R2 is not configured" errors:

1. Make sure all environment variables are set in `.env.local`
2. Restart the development server after adding environment variables
3. Check that your R2 API token has the correct permissions

### File Upload Fails

1. Check file size (must be under 10MB)
2. Verify file type is allowed
3. Check R2 bucket permissions
4. Check browser console for detailed error messages

## Development

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── upload/route.ts    # File upload endpoint
│   │   └── r2/route.ts        # R2 status and file listing
│   └── page.tsx               # Main upload interface
└── lib/
    └── r2.ts                  # R2 client configuration
```

### Adding New File Types

Edit the `ALLOWED_TYPES` array in `src/app/api/upload/route.ts`:

```typescript
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  // Add your MIME types here
  'application/zip',
  'text/csv',
];
```

## License

MIT
