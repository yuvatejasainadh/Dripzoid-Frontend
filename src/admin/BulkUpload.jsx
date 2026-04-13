// src/admin/BulkUpload.jsx
import React, { useState } from "react";
import { Upload } from "lucide-react";
import api from "../utils/api";

export default function BulkUpload({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Please select a CSV file first");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

   try {
  const res = await api.formPost("/api/admin/products/bulk-upload", formData, true);
  
  // Always call callback (if parent wants to refresh list)
  onUploadComplete && onUploadComplete();

  alert(res.message || "✅ Bulk upload complete!");
  setFile(null);
} catch (err) {
  console.error(err);
  alert("❌ Upload failed: " + (err.message || JSON.stringify(err)));
} finally {
  setUploading(false);
}

  };

  return (
    <div className="p-6 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow space-y-4">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Bulk Upload Products</h2>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files[0])}
        className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0 file:text-sm file:font-semibold
          file:bg-black file:text-white dark:file:bg-white dark:file:text-black
          hover:file:opacity-80 transition"
      />
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="flex items-center gap-2 px-5 py-3 bg-black text-white dark:bg-white dark:text-black rounded-lg shadow hover:scale-105 transition-transform disabled:opacity-50"
      >
        <Upload className="w-5 h-5" />
        {uploading ? "Uploading..." : "Upload CSV"}
      </button>
    </div>
  );
}
