"use client";
import { useState, useRef } from "react";

// Simple toast component
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  // Auto close after 2 seconds
  useEffect(() => {
    const t = setTimeout(onClose, 2000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2 rounded shadow-lg text-sm animate-fade-in">
      {message}
    </div>
  );
}

// ErrorPopupButton component
import { useEffect } from "react";
function ErrorPopupButton({ message }: { message?: string }) {
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <span className="inline-flex items-center gap-1 relative">
      <span className="text-red-600 dark:text-red-400">error</span>
      <button
        type="button"
        className="p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900"
        onClick={() => setOpen((v) => !v)}
        title="エラー内容を表示"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 20 20"
          className="w-4 h-4 text-red-500"
          aria-hidden="true"
        >
          <circle
            cx="10"
            cy="10"
            r="9"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="#fff"
          />
          <text
            x="10"
            y="15"
            textAnchor="middle"
            fontSize="12"
            fill="currentColor"
          >
            i
          </text>
        </svg>
      </button>
      {open && (
        <div
          ref={popupRef}
          className="absolute z-10 left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded shadow-lg p-3 text-xs text-red-700 dark:text-red-300"
        >
          <div className="mb-1 font-bold">エラー内容</div>
          <div>{message || "Unknown error"}</div>
        </div>
      )}
    </span>
  );
}

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Format bytes as TB, GB, MB, KB, or B
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [fileTable, setFileTable] = useState<any[]>([]); // { name, size, type, status, url, originalSize, ... }
  const [toast, setToast] = useState<string | null>(null);
  const [compressImages, setCompressImages] = useState(true); // Default compression is on

  // Drag and drop & file select logic
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>,
  ) => {
    let selectedFiles: File[] = [];
    if ("dataTransfer" in e) {
      selectedFiles = Array.from(e.dataTransfer.files);
    } else {
      selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    }
    if (!selectedFiles.length) return;
    setFileTable((prev) => [
      ...prev,
      ...selectedFiles.map((f) => ({
        name: f.name,
        size: f.size,
        originalSize: f.size, // Store original size for comparison
        type: f.type,
        status: "Being uploaded",
        file: f,
      })),
    ]);
    setFiles(selectedFiles);
    setTimeout(() => handleUpload(selectedFiles), 0);
    // Reset input value so selecting the same files again will trigger onChange
    if ("target" in e && e.target instanceof HTMLInputElement) {
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileChange(e);
  };
  const handleAreaClick = () => {
    fileInputRef.current?.click();
  };

  // Upload files and update their status in the table
  const handleUpload = async (uploadFiles?: File[]) => {
    const filesToUpload = uploadFiles || files;
    if (!filesToUpload.length) return;
    try {
      const formData = new FormData();
      filesToUpload.forEach((file) => {
        formData.append("file", file);
      });
      const response = await fetch(
        `/api/upload${compressImages ? "?compress=true" : ""}`,
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await response.json();
      if (data.results) {
        setFileTable((prev) => {
          let updated = [...prev];
          filesToUpload.forEach((file, idx) => {
            const i = updated.findIndex(
              (row) =>
                row.name === file.name &&
                row.size === file.size &&
                row.status === "Being uploaded",
            );
            if (i !== -1) {
              const result = data.results[idx];
              if (result && result.success && result.fileInfo) {
                updated[i] = {
                  ...updated[i],
                  status: "Uploaded",
                  size: result.fileInfo.size, // Update with actual compressed size
                  url: result.fileInfo.url || "",
                  uploadedAt: result.fileInfo.uploadedAt,
                  r2Configured: result.fileInfo.r2Configured,
                  uploadMetadata: result.fileInfo.uploadMetadata,
                  errorMessage: undefined,
                };
              } else {
                updated[i] = {
                  ...updated[i],
                  status: "error",
                  errorMessage:
                    result && result.error ? result.error : "Upload failed",
                };
              }
            }
          });
          return updated;
        });
        setFiles([]); // Clear selected files after upload
      }
    } catch (error) {
      setFileTable((prev) =>
        prev.map((row) =>
          row.status === "Being uploaded"
            ? { ...row, status: "error", errorMessage: "Upload failed" }
            : row,
        ),
      );
    }
  };

  return (
    <div className="font-sans min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="max-w-[1200px] mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            File Upload to Cloudflare R2
          </h1>

          <div className="space-y-6">
            {/* Image Compression Option */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="compress-images"
                checked={compressImages}
                onChange={(e) => setCompressImages(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label
                htmlFor="compress-images"
                className="text-sm font-medium text-gray-900 dark:text-gray-300"
              >
                Compress images (JPEG, PNG, WebP) to reduce file size
              </label>
            </div>

            {/* Drag and Drop File Selection */}
            <div>
              <div
                onClick={handleAreaClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer transition-colors h-32 mb-2 ${dragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30" : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-blue-400"}`}
                tabIndex={0}
                role="button"
                aria-label="ファイルをドラッグ＆ドロップ、またはクリックして選択"
              >
                <svg
                  className="w-8 h-8 text-gray-400 mb-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M4 16V8a2 2 0 012-2h3m10 10V8a2 2 0 00-2-2h-3"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-300 select-none">
                  ファイルをドラッグ＆ドロップ、またはクリックして選択
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Max {formatBytes(MAX_FILE_SIZE)}
                </span>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* File Table Display */}
            {fileTable.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        URL
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {fileTable.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {row.name}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                          {row.originalSize !== row.size &&
                          compressImages &&
                          row.status === "Uploaded" ? (
                            <div>
                              <div className="text-xs text-gray-500 line-through">
                                {formatBytes(row.originalSize)}
                              </div>
                              <div>{formatBytes(row.size)}</div>
                              <div className="text-xs text-green-600">
                                -
                                {Math.round(
                                  (1 - row.size / row.originalSize) * 100,
                                )}
                                %
                              </div>
                            </div>
                          ) : (
                            formatBytes(row.size)
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                          {row.type}
                        </td>
                        <td
                          className={`px-4 py-2 text-sm font-semibold ${row.status === "Uploaded" ? "text-green-600 dark:text-green-400" : row.status === "Being uploaded" ? "text-blue-600 dark:text-blue-400" : row.status === "error" ? "text-red-600 dark:text-red-400" : ""}`}
                        >
                          {row.status === "Being uploaded" ? (
                            <span className="inline-flex items-center gap-2">
                              <svg
                                className="animate-spin h-4 w-4 text-blue-500"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                ></path>
                              </svg>
                              Uploading
                            </span>
                          ) : row.status === "error" ? (
                            <ErrorPopupButton message={row.errorMessage} />
                          ) : (
                            row.status
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {row.url ? (
                            <span className="inline-flex items-center gap-2">
                              <a
                                href={row.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline text-blue-600 dark:text-blue-400"
                              >
                                Link
                              </a>
                              <button
                                type="button"
                                title="Copy URL"
                                className="ml-1 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                onClick={() => {
                                  navigator.clipboard.writeText(row.url);
                                  setToast("URL copied!");
                                }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 20 20"
                                  className="w-4 h-4 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                                  aria-hidden="true"
                                >
                                  <rect
                                    x="7"
                                    y="7"
                                    width="9"
                                    height="9"
                                    rx="2"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                  />
                                  <rect
                                    x="4"
                                    y="4"
                                    width="9"
                                    height="9"
                                    rx="2"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                  />
                                </svg>
                              </button>
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        {/* Toast notification */}
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </main>
    </div>
  );
}
