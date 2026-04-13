// src/admin/pages/ImageUpload.jsx
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  UploadCloud,
  Trash2,
  Star,
  Image as ImageIcon,
  X,
  Loader2,
  Clipboard,
  Check,
} from "lucide-react";

// ✅ Use .env base URL
const API_BASE = process.env.REACT_APP_API_BASE;

/**
 * Advanced Image Upload Component (polished + fixes)
 * - Normalizes Cloudinary response (uses data.url || data.secure_url)
 * - Star button toggles primary ON/OFF
 * - Keeps features: drag/drop, resize, reorder, per-file upload & progress, copy links
 */

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;

function bytesToSize(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function resizeImage(file, maxDim = MAX_DIMENSION, quality = JPEG_QUALITY) {
  if (!file || !file.type.startsWith("image/")) return file;
  const imgBitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxDim / Math.max(imgBitmap.width, imgBitmap.height));
  if (ratio === 1) return file;

  const width = Math.round(imgBitmap.width * ratio);
  const height = Math.round(imgBitmap.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imgBitmap, 0, 0, width, height);

  return await new Promise((resolve) =>
    canvas.toBlob(
      (blob) => {
        if (!blob) return resolve(file);
        resolve(new File([blob], file.name, { type: blob.type }));
      },
      "image/jpeg",
      quality
    )
  );
}

export default function ImageUpload() {
  const [items, setItems] = useState([]); // {id,file,preview,name,size,width,height,alt,uploading,progress,uploadedData,isPrimary}
  const [uploadingAll, setUploadingAll] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef();
  const dragItemId = useRef(null);

  const showToast = (message, type = "success", ms = 2000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), ms);
  };

  // cleanup previews on unmount
  useEffect(() => {
    return () => {
      items.forEach((i) => {
        if (i.preview) URL.revokeObjectURL(i.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = async (fileList) => {
    if (!fileList || !fileList.length) return;
    const filesArray = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!filesArray.length) {
      showToast("No image files detected", "error");
      return;
    }

    const processed = await Promise.all(
      filesArray.map(async (file) => {
        const preview = URL.createObjectURL(file);
        const dims = await new Promise((res) => {
          const img = new Image();
          img.onload = () => res({ width: img.width, height: img.height });
          img.onerror = () => res({ width: 0, height: 0 });
          img.src = preview;
        });

        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          preview,
          name: file.name,
          size: file.size,
          width: dims.width,
          height: dims.height,
          alt: "",
          uploading: false,
          progress: 0,
          uploadedData: null,
          isPrimary: false,
        };
      })
    );

    setItems((prev) => [...prev, ...processed]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (uploadingAll) return;
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleFiles = (e) => {
    if (uploadingAll) return;
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  const openFileDialog = () => {
    if (uploadingAll) return;
    fileInputRef.current?.click();
  };

  const removeItem = async (id) => {
    const it = items.find((i) => i.id === id);
    if (!it) return;

    if (it.uploadedData?.public_id) {
      try {
        await axios.post(
          `${API_BASE}/api/upload/delete`, // ✅ use env
          { public_id: it.uploadedData.public_id },
          {
            headers: { "Content-Type": "application/json" },
          }
        );
        showToast("Deleted from cloud", "success");
      } catch (err) {
        console.warn("delete failed:", err?.response?.data || err.message);
        showToast("Removed locally (cloud delete failed)", "error");
      }
    }

    if (it.preview) URL.revokeObjectURL(it.preview);

    setItems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (it.isPrimary && next.length) {
        next[0].isPrimary = true;
      }
      return next;
    });
  };

  const setPrimary = (id) => {
    setItems((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const willBePrimary = !p.isPrimary;
          showToast(willBePrimary ? "Primary image set" : "Primary image removed", "success");
          return { ...p, isPrimary: willBePrimary };
        }
        return { ...p, isPrimary: false };
      })
    );
  };

  const setAlt = (id, alt) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, alt } : p)));

  const handleDragStart = (e, id) => {
    dragItemId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDropOrder = (e, overId) => {
    e.preventDefault();
    const fromId = dragItemId.current;
    if (!fromId || fromId === overId) return;
    setItems((prev) => {
      const fromIndex = prev.findIndex((p) => p.id === fromId);
      const toIndex = prev.findIndex((p) => p.id === overId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
    dragItemId.current = null;
  };

  const uploadItem = async (item) => {
    setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, uploading: true, progress: 0 } : p)));
    try {
      let fileToUpload = item.file;
      try {
        const resized = await resizeImage(item.file);
        if (resized) fileToUpload = resized;
      } catch (err) {
        console.warn("resize failed", err);
      }

      const formData = new FormData();
      formData.append("image", fileToUpload, fileToUpload.name);

      const { data } = await axios.post(
        `${API_BASE}/api/upload`, // ✅ use env
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            setItems((prev) =>
              prev.map((p) =>
                p.id === item.id ? { ...p, progress: percent } : p
              )
            );
          },
        }
      );

      const normalizedUrl =
        data?.url ||
        data?.secure_url ||
        data?.secureUrl ||
        (data && data.result && (data.result.secure_url || data.result.url)) ||
        null;
      const normalizedData = { ...(data || {}), url: normalizedUrl };

      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                uploading: false,
                progress: 100,
                uploadedData: normalizedData,
                isPrimary: prev.every((x) => !x.isPrimary) ? true : p.isPrimary,
              }
            : p
        )
      );

      showToast("Upload successful", "success");
      return { success: true, data: normalizedData };
    } catch (err) {
      console.error("upload error", err?.response?.data || err.message);
      setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, uploading: false } : p)));
      showToast("Upload failed", "error");
      return { success: false, error: err };
    }
  };

  const uploadAll = async () => {
    setUploadingAll(true);
    const toUpload = items.filter((i) => !i.uploadedData && !i.uploading);
    for (const it of toUpload) {
      await uploadItem(it);
    }
    setUploadingAll(false);
  };

  const overallProgress = (() => {
    if (!items.length) return 0;
    const total = items.reduce((acc, it) => acc + (it.progress || (it.uploadedData ? 100 : 0)), 0);
    return Math.round(total / items.length);
  })();

  // clipboard helpers
  const writeToClipboard = async (text) => {
    if (!text) return false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  };

  const copyLink = async (link, id) => {
    const ok = await writeToClipboard(link);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
      showToast("Link copied", "success");
    } else {
      showToast("Copy failed", "error");
    }
  };

  const copyAllLinks = async () => {
    const links = items.filter((i) => i.uploadedData?.url).map((i) => i.uploadedData.url);
    if (!links.length) {
      showToast("No uploaded links to copy", "error");
      return;
    }
    const ok = await writeToClipboard(links.join("\n"));
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
      showToast("All links copied", "success");
    } else {
      showToast("Copy failed", "error");
    }
  };

  const uploadedLinks = items.filter((i) => i.uploadedData?.url).map((i) => i.uploadedData.url);

  return (
    <div className="space-y-6 text-black dark:text-white">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Image Upload</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">Upload, organize and manage images (black & white theme)</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openFileDialog}
            disabled={uploadingAll}
            aria-disabled={uploadingAll}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-sm hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/30 disabled:opacity-50"
            aria-label="Add images"
            title={uploadingAll ? "Upload in progress" : "Add Images"}
          >
            <UploadCloud className="w-5 h-5" />
            <span className="text-sm font-medium">Add Images</span>
          </button>

          <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFiles} className="hidden" />

          <button
            onClick={uploadAll}
            disabled={uploadingAll || items.every((i) => i.uploadedData)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-black text-white dark:bg-white dark:text-black shadow-sm hover:opacity-95 disabled:opacity-50"
            title="Upload all pending images"
          >
            {uploadingAll ? <Loader2 className="animate-spin w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
            <span className="text-sm font-medium">{uploadingAll ? "Uploading..." : "Upload All"}</span>
          </button>

          {uploadedLinks.length > 0 && (
            <button
              onClick={copyAllLinks}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-sm hover:opacity-95 focus:outline-none"
              title="Copy all uploaded links"
            >
              {copiedAll ? <Check className="w-4 h-4 text-green-600" /> : <Clipboard className="w-4 h-4" />}
              <span className="text-sm font-medium">{copiedAll ? "Copied" : "Copy All"}</span>
            </button>
          )}
        </div>
      </header>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={openFileDialog}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openFileDialog()}
        aria-label="Drag and drop images here or click to select"
        className={`rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 text-center cursor-pointer bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-900 transition ${uploadingAll ? "opacity-60 pointer-events-none" : ""}`}
      >
        <ImageIcon className="mx-auto mb-3 w-10 h-10 text-gray-600 dark:text-gray-300" />
        <p className="font-medium">Drag & drop images here, or click to select files</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Supports multiple files — will be resized before upload</p>
      </div>

      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-40 text-xs text-gray-600 dark:text-gray-400">
                {items.length} image{items.length > 1 ? "s" : ""}
              </div>
              <div className="w-56">
                <div className="relative h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <div style={{ width: `${overallProgress}%` }} className="absolute left-0 top-0 h-2 rounded-full bg-black dark:bg-white transition-all" />
                </div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 w-12 text-right">{overallProgress}%</div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">Tip: Drag images to reorder</div>
          </div>

          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
            {items.map((it) => (
              <li
                key={it.id}
                draggable={!uploadingAll}
                onDragStart={(e) => handleDragStart(e, it.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOrder(e, it.id)}
                className="relative bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-2 flex flex-col gap-2"
              >
                <div className="relative">
                  <img
                    src={it.preview || it.uploadedData?.url}
                    alt={it.alt || it.name}
                    className="w-full h-36 object-cover rounded-md cursor-pointer"
                    onClick={() => setLightbox(it.preview || it.uploadedData?.url)}
                  />

                  <div className="absolute top-2 left-2 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrimary(it.id);
                      }}
                      aria-label="Set primary"
                      title={it.isPrimary ? "Unset primary" : "Set primary"}
                      className={`p-1 rounded-md text-sm focus:outline-none focus-visible:ring-2 ${it.isPrimary ? "bg-black text-white dark:bg-white dark:text-black" : "bg-white/60 dark:bg-black/60 text-black dark:text-white"}`}
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(it.id);
                      }}
                      title="Remove"
                      className="p-1 rounded-md bg-black/80 text-white hover:opacity-90 focus:outline-none focus-visible:ring-2"
                      aria-label={`Remove ${it.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="truncate text-sm font-medium">{it.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{bytesToSize(it.size)}</div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div>{it.width}×{it.height}</div>
                    <div>{it.uploadedData ? "Uploaded" : it.uploading ? "Uploading..." : "Pending"}</div>
                  </div>

                  <input
                    value={it.alt}
                    onChange={(e) => setAlt(it.id, e.target.value)}
                    placeholder="Alt text (for accessibility)"
                    className="mt-1 text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-800 bg-transparent focus:outline-none focus-visible:ring-2"
                    aria-label={`Alt text for ${it.name}`}
                  />

                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full mt-1">
                    <div style={{ width: `${it.progress}%` }} className="h-2 rounded-full bg-black dark:bg-white transition-all" />
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      {!it.uploadedData && !it.uploading && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            uploadItem(it);
                          }}
                          className="px-2 py-1 rounded-md border border-black/10 dark:border-white/10 bg-black text-white dark:bg-white dark:text-black text-sm"
                        >
                          Upload
                        </button>
                      )}

                      {it.uploading && (
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading {it.progress}%
                        </div>
                      )}

                      {it.uploadedData && (
                        <>
                          <a href={it.uploadedData.url} target="_blank" rel="noreferrer" className="text-xs underline text-gray-700 dark:text-gray-200">
                            Open
                          </a>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyLink(it.uploadedData.url, it.id);
                            }}
                            className="ml-2 px-2 py-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black text-sm"
                            aria-label="Copy image link"
                            title="Copy link"
                          >
                            {copiedId === it.id ? <Check className="w-4 h-4 inline text-green-600" /> : <Clipboard className="w-4 h-4 inline" />}
                          </button>
                        </>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400">{it.uploadedData?.public_id ? "Cloud" : "Local"}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {uploadedLinks.length > 0 && (
        <section className="mt-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Uploaded Links</h3>
            <div className="flex items-center gap-2">
              <button onClick={copyAllLinks} className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-black/10 dark:border-white/10 bg-black text-white dark:bg-white dark:text-black">
                {copiedAll ? <Check className="w-4 h-4 text-green-600" /> : <Clipboard className="w-4 h-4" />}
                <span className="text-sm">{copiedAll ? "Copied" : "Copy All"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {items.filter((i) => i.uploadedData?.url).map((i) => (
              <div key={i.id} className="flex gap-3 items-center border border-gray-100 dark:border-gray-800 p-2 rounded">
                <img src={i.uploadedData.url} alt={i.alt || i.name} className="w-20 h-14 object-cover rounded" />
                <div className="flex-1">
                  <div className="truncate text-sm">{i.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">{i.uploadedData.url}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => copyLink(i.uploadedData.url, i.id)} className="px-2 py-1 rounded-md bg-white dark:bg-black border border-black/10 dark:border-white/10">
                    {copiedId === i.id ? <Check className="w-4 h-4 text-green-600" /> : <Clipboard className="w-4 h-4" />}
                  </button>
                  <a href={i.uploadedData.url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-md border border-black/10 dark:border-white/10 text-xs">
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {lightbox && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-[90%] max-h-[90%]">
            <button onClick={() => setLightbox(null)} className="absolute top-2 right-2 p-2 rounded-full bg-white text-black" aria-label="Close preview">
              <X className="w-4 h-4" />
            </button>
            <img src={lightbox} alt="Preview" className="max-w-full max-h-[80vh] rounded-md" />
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed right-4 bottom-6 z-50 px-4 py-2 rounded-md shadow-md ${toast.type === "error" ? "bg-red-600 text-white" : "bg-black text-white"}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
