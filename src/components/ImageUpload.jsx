import React, { useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE; // ✅ use .env value

export default function ImageUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState([]); // ✅ store multiple links

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first!");

    const formData = new FormData();
    formData.append("image", file); // must match backend multer key

    try {
      setUploading(true);
      const res = await axios.post(`${API_BASE}/api/upload`, formData); // ✅ updated
      setUploadedUrls((prev) => [...prev, res.data.url]); // ✅ append to list
      setFile(null); // clear file
    } catch (err) {
      console.error("Upload failed:", err.response ? err.response.data : err.message);
      alert("Upload failed: " + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const copySingle = (url) => {
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  };

  const copyAll = () => {
    const allLinks = uploadedUrls.join(","); // ✅ comma separated
    navigator.clipboard.writeText(allLinks);
    alert("All links copied to clipboard!");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload Image</h2>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {uploadedUrls.length > 0 && (
        <div style={{ marginTop: 20 }}>
          {uploadedUrls.map((url, idx) => (
            <div key={idx} style={{ marginBottom: 10 }}>
              <img
                src={url}
                alt={`Uploaded ${idx + 1}`}
                style={{ maxWidth: "300px", display: "block" }}
              />
              <input type="text" value={url} readOnly style={{ width: "100%", marginTop: 5 }} />
              <button onClick={() => copySingle(url)}>Copy This</button>
            </div>
          ))}

          {/* ✅ Copy all links at once */}
          <button
            style={{ marginTop: 15, backgroundColor: "#333", color: "#fff", padding: "5px 10px" }}
            onClick={copyAll}
          >
            Copy All Links
          </button>
        </div>
      )}
    </div>
  );
}
