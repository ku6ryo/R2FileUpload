'use client';

import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [r2Status, setR2Status] = useState<any>(null);
  const [r2Files, setR2Files] = useState<any>(null);
  const [loadingR2, setLoadingR2] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setFile(selectedFile || null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
      
      // Refresh file list if upload was successful
      if (data.success && data.fileInfo?.r2Configured) {
        await checkR2Files();
      }
    } catch (error) {
      console.error('Upload error:', error);
      setResult({ error: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const checkR2Status = async () => {
    setLoadingR2(true);
    try {
      const response = await fetch('/api/r2?action=list-buckets');
      const data = await response.json();
      setR2Status(data);
    } catch (error) {
      console.error('R2 status check error:', error);
      setR2Status({ error: 'Failed to check R2 status' });
    } finally {
      setLoadingR2(false);
    }
  };

  const checkR2Files = async () => {
    setLoadingR2(true);
    try {
      const response = await fetch('/api/r2?action=list-objects');
      const data = await response.json();
      setR2Files(data);
    } catch (error) {
      console.error('R2 files check error:', error);
      setR2Files({ error: 'Failed to list files' });
    } finally {
      setLoadingR2(false);
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
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Choose a file to upload
              </label>
              <div className="relative">
                <input
                  id="file-upload"
                  type="file"
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
            {file && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Selected File:</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Name: {file.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Size: {(file.size / 1024).toFixed(2)} KB</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Type: {file.type}</p>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                text-white font-semibold py-3 px-4 rounded-md
                transition-colors duration-200
                disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>

            {/* Result Display */}
            {result && (
              <div className={`rounded-md p-4 ${
                result.success 
                  ? 'bg-green-50 border border-green-200 dark:bg-green-900 dark:border-green-700' 
                  : 'bg-red-50 border border-red-200 dark:bg-red-900 dark:border-red-700'
              }`}>
                <h3 className={`text-sm font-medium mb-2 ${
                  result.success 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {result.success ? 'Upload Successful!' : 'Upload Failed'}
                </h3>
                
                {result.success && result.fileInfo && (
                  <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <p>Original Name: {result.fileInfo.originalName}</p>
                    <p>Stored As: {result.fileInfo.filename}</p>
                    <p>Size: {result.fileInfo.size} bytes</p>
                    <p>Type: {result.fileInfo.type}</p>
                    <p>Uploaded At: {new Date(result.fileInfo.uploadedAt).toLocaleString()}</p>
                    {result.fileInfo.url && (
                      <p>
                        URL: <a href={result.fileInfo.url} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">
                          {result.fileInfo.url}
                        </a>
                      </p>
                    )}
                    {!result.fileInfo.url && result.fileInfo.r2Configured && (
                      <p className="text-yellow-600 dark:text-yellow-400">
                        ⚠️ No public URL available - Custom domain not configured
                      </p>
                    )}
                    <p>R2 Status: {result.fileInfo.r2Configured ? 'Configured' : 'Not Configured'}</p>
                    {result.fileInfo.uploadMetadata && (
                      <div className="mt-2">
                        <p className="font-semibold">Upload Metadata:</p>
                        <p>ETag: {result.fileInfo.uploadMetadata.etag}</p>
                        {result.fileInfo.uploadMetadata.versionId && (
                          <p>Version ID: {result.fileInfo.uploadMetadata.versionId}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {result.error && (
                  <p className="text-sm text-red-700 dark:text-red-300">{result.error}</p>
                )}
              </div>
            )}
          </div>

          {/* API Info */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Information</h2>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-md p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <strong>Endpoint:</strong> POST /api/upload
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <strong>Max File Size:</strong> 10MB
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <strong>Allowed Types:</strong> Images (JPEG, PNG, GIF, WebP), PDF, Text, Word documents
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Custom Domain:</strong> test250826.kaminari-cloud.com
              </p>
            </div>
          </div>

          {/* R2 Configuration */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-600">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cloudflare R2 Status</h2>
            
            <div className="space-y-4">
              {/* R2 Status Check */}
              <div className="flex gap-4">
                <button
                  onClick={checkR2Status}
                  disabled={loadingR2}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 
                    text-white font-semibold py-2 px-4 rounded-md
                    transition-colors duration-200 disabled:cursor-not-allowed"
                >
                  {loadingR2 ? 'Checking...' : 'Check R2 Connection'}
                </button>
                
                <button
                  onClick={checkR2Files}
                  disabled={loadingR2}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 
                    text-white font-semibold py-2 px-4 rounded-md
                    transition-colors duration-200 disabled:cursor-not-allowed"
                >
                  {loadingR2 ? 'Loading...' : 'List Files'}
                </button>
              </div>

              {/* R2 Status Display */}
              {r2Status && (
                <div className={`rounded-md p-4 ${
                  r2Status.success 
                    ? 'bg-green-50 border border-green-200 dark:bg-green-900 dark:border-green-700' 
                    : 'bg-red-50 border border-red-200 dark:bg-red-900 dark:border-red-700'
                }`}>
                  <h3 className={`text-sm font-medium mb-2 ${
                    r2Status.success 
                      ? 'text-green-800 dark:text-green-200' 
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {r2Status.success ? 'R2 Connection Successful!' : 'R2 Connection Failed'}
                  </h3>
                  
                  {r2Status.success && r2Status.buckets && (
                    <div className="text-sm text-green-700 dark:text-green-300">
                      <p className="font-semibold">Available Buckets:</p>
                      {r2Status.buckets.map((bucket: any, index: number) => (
                        <p key={index}>• {bucket.Name} (Created: {new Date(bucket.CreationDate).toLocaleDateString()})</p>
                      ))}
                      {r2Status.customDomainConfigured ? (
                        <p className="mt-2 font-semibold text-green-800 dark:text-green-200">
                          ✅ Custom Domain: {r2Status.customDomain}
                        </p>
                      ) : (
                        <p className="mt-2 font-semibold text-yellow-600 dark:text-yellow-400">
                          ⚠️ Custom Domain not configured - Files will not be publicly accessible
                        </p>
                      )}
                    </div>
                  )}
                  
                  {r2Status.error && (
                    <div className="text-sm text-red-700 dark:text-red-300">
                      <p>{r2Status.error}</p>
                      {r2Status.requiredEnvVars && (
                        <div className="mt-2">
                          <p className="font-semibold">Required Environment Variables:</p>
                          {r2Status.requiredEnvVars.map((envVar: string, index: number) => (
                            <p key={index}>• {envVar}</p>
                          ))}
                          <p className="mt-2 text-xs">Copy .env.local.example to .env.local and fill in your R2 credentials.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* R2 Files Display */}
              {r2Files && (
                <div className={`rounded-md p-4 ${
                  r2Files.success 
                    ? 'bg-blue-50 border border-blue-200 dark:bg-blue-900 dark:border-blue-700' 
                    : 'bg-red-50 border border-red-200 dark:bg-red-900 dark:border-red-700'
                }`}>
                  <h3 className={`text-sm font-medium mb-2 ${
                    r2Files.success 
                      ? 'text-blue-800 dark:text-blue-200' 
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {r2Files.success ? `Files in ${r2Files.bucket} (${r2Files.keyCount} files)` : 'Failed to List Files'}
                  </h3>
                  
                  {r2Files.success && r2Files.objects && (
                    <div className="text-sm text-blue-700 dark:text-blue-300 max-h-40 overflow-y-auto">
                      {r2Files.objects.length === 0 ? (
                        <p>No files found in bucket.</p>
                      ) : (
                        r2Files.objects.map((obj: any, index: number) => (
                          <div key={index} className="py-1 border-b border-blue-200 dark:border-blue-700 last:border-b-0">
                            <p className="font-medium">{obj.Key}</p>
                            <p className="text-xs">Size: {(obj.Size / 1024).toFixed(2)} KB | Modified: {new Date(obj.LastModified).toLocaleString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  {r2Files.error && (
                    <p className="text-sm text-red-700 dark:text-red-300">{r2Files.error}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
