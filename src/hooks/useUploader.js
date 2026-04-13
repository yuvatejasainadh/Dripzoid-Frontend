// src/hooks/useUploader.js
import { useState } from "react";

const DEFAULT_API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function useUploader(apiBaseParam, opts = {}) {
  const apiBase = apiBaseParam || DEFAULT_API_BASE;
  const CLOUDINARY_CLOUD_NAME = opts.cloudName || process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const CLOUDINARY_UPLOAD_PRESET = opts.uploadPreset || process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  async function upload(files) {
    if (!files || files.length === 0) return [];

    setIsUploading(true);
    setError(null);

    // helper to normalize urls returned by various backends
    function extractUrl(json) {
      if (!json) return "";
      return json.url || json.secure_url || json.fileUrl || (json.data && (json.data.url || json.data.secure_url)) || (json.result && json.result.secure_url) || "";
    }

    try {
      // 1) Preferred: your backend /api/upload (match ImageUpload.jsx)
      const backendUploaded = [];
      for (const file of files) {
        const fd = new FormData();
        // include both keys for compatibility; backend usually expects "image"
        fd.append("image", file);

        const res = await fetch(`${apiBase}/api/upload`, { method: "POST", body: fd });
        if (!res.ok) {
          // throw to try fallbacks
          throw new Error(`/api/upload failed with status ${res.status}`);
        }
        const json = await res.json();
        let url = extractUrl(json);
        if (url && !/^https?:\/\//i.test(url)) {
          // make absolute if backend returned relative path
          url = url.startsWith("/") ? `${apiBase}${url}` : `${apiBase}/${url}`;
        }
        if (!url) throw new Error("Backend /api/upload returned no url");
        backendUploaded.push({ url, type: file.type.startsWith("video/") ? "video" : "image" });
      }
      return backendUploaded;
    } catch (backendErr) {
      // continue to fallbacks
      // 2) unsigned direct Cloudinary (if configured)
      try {
        if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET) {
          const cloudUploaded = [];
          for (const file of files) {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

            const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
            const res = await fetch(uploadUrl, { method: "POST", body: fd });
            if (!res.ok) throw new Error("Cloudinary unsigned upload failed");
            const json = await res.json();
            const url = json.secure_url || json.url || "";
            if (!url) throw new Error("Cloudinary returned no url");
            cloudUploaded.push({ url, type: (json.resource_type === "video" || file.type.startsWith("video/")) ? "video" : "image" });
          }
          return cloudUploaded;
        }
      } catch (cloudErr) {
        // try next fallback
      }

      // 3) optional local helper module './cloudinary' (if you have one)
      try {
        const mod = await import("../cloudinary").catch(() => null);
        if (mod && typeof mod.uploadFile === "function") {
          const results = await Promise.all(files.map((f) => mod.uploadFile(f)));
          return results.map((r) =>
            typeof r === "string"
              ? { url: r, type: r.includes(".mp4") || r.includes("/video/") ? "video" : "image" }
              : { url: r.url, type: r.resource_type === "video" ? "video" : "image" }
          );
        }
      } catch (localErr) {
        // ignore
      }

      // if we reach here, none of the upload strategies worked
      setError(backendErr.message || "Upload failed");
      throw backendErr;
    } finally {
      setIsUploading(false);
    }
  }

  return { upload, isUploading, error };
}
