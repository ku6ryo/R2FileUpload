"use client";

import { useState } from "react";

// Format bytes as TB, GB, MB, KB, or B
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    setFiles(selectedFiles);
    setResults([]);
  };

  const handleUpload = async () => {
    if (!files.length) {
      alert("Please select at least one file");
      return;
    }
    setUploading(true);
    setResults([]);
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("file", file);
      });
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.results) {
        setResults(data.results);
        setFiles([]); // Clear selected files after successful upload
      } else {
        setResults([{ error: data.error || "Unknown error" }]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setResults([{ error: "Upload failed" }]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="font-sans min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            File Upload Demo
          </h1>

          <div className="space-y-6">
            {/* File Selection */}
            <div>
              <label
                htmlFor="file-upload"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Choose files to upload
              </label>
              <div className="relative">
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    dark:file:bg-blue-900 dark:file:text-blue-300
                    dark:hover:file:bg-blue-800"
                />
              </div>
            </div>

            {/* File Info */}
            {files.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Selected Files:
                </h3>
                <ul className="list-disc pl-5">
                  {files.map((file, idx) => (
                    <li key={idx} className="mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {file.name} ({formatBytes(file.size)}, {file.type})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!files.length || uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                text-white font-semibold py-3 px-4 rounded-md
                transition-colors duration-200
                disabled:cursor-not-allowed"
            >
              {uploading ? "Uploading..." : `Upload ${files.length > 1 ? 'Files' : 'File'}`}
            </button>

            {/* Result Display */}
            {results.length > 0 && (
              <div className="space-y-4">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`rounded-md p-4 ${
                      result.success
                        ? "bg-green-50 border border-green-200 dark:bg-green-900 dark:border-green-700"
                        : "bg-red-50 border border-red-200 dark:bg-red-900 dark:border-red-700"
                    }`}
                  >
                    <h3
                      className={`text-sm font-medium mb-2 ${
                        result.success
                          ? "text-green-800 dark:text-green-200"
                          : "text-red-800 dark:text-red-200"
                      }`}
                    >
                      {result.success ? `Upload Successful!` : `Upload Failed`}
                    </h3>
                    {result.success && result.fileInfo && (
                      <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                        <p>Original Name: {result.fileInfo.originalName}</p>
                        <p>Stored As: {result.fileInfo.filename}</p>
                        <p>Size: {formatBytes(result.fileInfo.size)}</p>
                        <p>Type: {result.fileInfo.type}</p>
                        <p>
                          Uploaded At: {" "}
                          {new Date(result.fileInfo.uploadedAt).toLocaleString()}
                        </p>
                        {result.fileInfo.url && (
                          <p>
                            URL: {" "}
                            <a
                              href={result.fileInfo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline text-blue-600 dark:text-blue-400"
                            >
                              {result.fileInfo.url}
                            </a>
                          </p>
                        )}
                        {!result.fileInfo.url && result.fileInfo.r2Configured && (
                          <p className="text-yellow-600 dark:text-yellow-400">
                            ⚠️ No public URL available - Custom domain not configured
                          </p>
                        )}
                        {result.fileInfo.uploadMetadata && (
                          <div className="mt-2">
                            <p className="font-semibold">Upload Metadata:</p>
                            <p>ETag: {result.fileInfo.uploadMetadata.etag}</p>
                            {result.fileInfo.uploadMetadata.versionId && (
                              <p>
                                Version ID: {" "}
                                {result.fileInfo.uploadMetadata.versionId}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {result.error && (
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {result.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* API Info */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              API Information
            </h2>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-md p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <strong>Endpoint:</strong> POST /api/upload
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <strong>Max File Size:</strong> 10MB
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <strong>Allowed Types:</strong> Images (JPEG, PNG, GIF, WebP),
                PDF, Text, Word documents
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Custom Domain:</strong> test250826.kaminari-cloud.com
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
