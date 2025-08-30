"use client";

import { useState, useRef } from "react";


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
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" className="w-4 h-4 text-red-500" aria-hidden="true">
          <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" fill="#fff" />
          <text x="10" y="15" textAnchor="middle" fontSize="12" fill="currentColor">i</text>
        </svg>
      </button>
      {open && (
        <div ref={popupRef} className="absolute z-10 left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded shadow-lg p-3 text-xs text-red-700 dark:text-red-300">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold">エラー内容</span>
            <button className="text-xs text-gray-400 hover:text-gray-700" onClick={() => setOpen(false)} title="閉じる">×</button>
          </div>
          <div>{message || 'Unknown error'}</div>
        </div>
      )}
    </span>
  );
}


// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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
  const [fileTable, setFileTable] = useState<any[]>([]); // { name, size, type, status, url, ... }

  // Drag and drop & file select logic
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let selectedFiles: File[] = [];
    if ('dataTransfer' in e) {
      selectedFiles = Array.from(e.dataTransfer.files);
    } else {
      selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    }
    if (!selectedFiles.length) return;
    setFileTable(prev => [
      ...prev,
      ...selectedFiles.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        status: 'Being uploaded',
        file: f,
      }))
    ]);
    setFiles(selectedFiles);
    setTimeout(() => handleUpload(selectedFiles), 0);
    // Reset input value so selecting the same files again will trigger onChange
    if ('target' in e && e.target instanceof HTMLInputElement) {
      e.target.value = '';
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
    setUploading(true);
    try {
      const formData = new FormData();
      filesToUpload.forEach((file) => {
        formData.append("file", file);
      });
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.results) {
        setFileTable(prev => {
          let updated = [...prev];
          filesToUpload.forEach((file, idx) => {
            const i = updated.findIndex(row => row.name === file.name && row.size === file.size && row.status === 'Being uploaded');
            if (i !== -1) {
              const result = data.results[idx];
              if (result && result.success && result.fileInfo) {
                updated[i] = {
                  ...updated[i],
                  status: 'Uploaded',
                  url: result.fileInfo.url || '',
                  uploadedAt: result.fileInfo.uploadedAt,
                  r2Configured: result.fileInfo.r2Configured,
                  uploadMetadata: result.fileInfo.uploadMetadata,
                  errorMessage: undefined,
                };
              } else {
                updated[i] = {
                  ...updated[i],
                  status: 'error',
                  errorMessage: result && result.error ? result.error : 'Upload failed',
                };
              }
            }
          });
          return updated;
        });
        setFiles([]); // Clear selected files after upload
      }
    } catch (error) {
  setFileTable(prev => prev.map(row => row.status === 'Being uploaded' ? { ...row, status: 'error', errorMessage: 'Upload failed' } : row));
    } finally {
      setUploading(false);
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
            {/* Drag and Drop File Selection */}
            <div>
              <div
                onClick={handleAreaClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer transition-colors h-32 mb-2 ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-blue-400'}`}
                tabIndex={0}
                role="button"
                aria-label="ファイルをドラッグ＆ドロップ、またはクリックして選択"
              >
                <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M4 16V8a2 2 0 012-2h3m10 10V8a2 2 0 00-2-2h-3" />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-300 select-none">ファイルをドラッグ＆ドロップ、またはクリックして選択</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">Max {formatBytes(MAX_FILE_SIZE)}</span>
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
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">File Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Size</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">URL</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {fileTable.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{row.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{formatBytes(row.size)}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{row.type}</td>
                        <td className={`px-4 py-2 text-sm font-semibold ${row.status === 'Uploaded' ? 'text-green-600 dark:text-green-400' : row.status === 'Being uploaded' ? 'text-blue-600 dark:text-blue-400' : row.status === 'error' ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {row.status === 'Being uploaded' ? (
                            <span className="inline-flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                              </svg>
                              Uploading
                            </span>
                          ) : row.status === 'error' ? (
                            <ErrorPopupButton message={row.errorMessage} />
                          ) : row.status}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {row.url ? (
                            <span className="inline-flex items-center gap-2">
                              <a href={row.url} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">Link</a>
                              <button
                                type="button"
                                title="Copy URL"
                                className="ml-1 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                onClick={() => navigator.clipboard.writeText(row.url)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" className="w-4 h-4 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400" aria-hidden="true">
                                  <rect x="7" y="7" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                                  <rect x="4" y="4" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
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
      </main>
    </div>
  );
}
