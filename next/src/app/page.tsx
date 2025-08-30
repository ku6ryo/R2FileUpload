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
  const [fileTable, setFileTable] = useState<any[]>([]); // { name, size, type, status, url, ... }

  // Add new files to the table and trigger upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (!selectedFiles.length) return;
    // Add new files to the table with status 'Being uploaded'
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
                };
              } else {
                updated[i] = {
                  ...updated[i],
                  status: result && result.error ? result.error : 'Failed',
                };
              }
            }
          });
          return updated;
        });
        setFiles([]); // Clear selected files after upload
      }
    } catch (error) {
      setFileTable(prev => prev.map(row => row.status === 'Being uploaded' ? { ...row, status: 'Failed' } : row));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="font-sans min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            File Upload
          </h1>

          <div className="bg-gray-100 dark:bg-gray-700 rounded-md p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              <strong>Max File Size:</strong> 10MB
            </p>
          </div>

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
                        <td className={`px-4 py-2 text-sm font-semibold ${row.status === 'Uploaded' ? 'text-green-600 dark:text-green-400' : row.status === 'Being uploaded' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                          {row.status === 'Being uploaded' ? (
                            <span className="inline-flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                              </svg>
                              Uploading
                            </span>
                          ) : row.status}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {row.url ? (
                            <a href={row.url} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">Link</a>
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
