// src/components/admin/ProductFormModal.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import api from "../../utils/api";

export default function ProductFormModal({ product, onClose, onSave }) {
  const initial = {
    name: "",
    category: "",
    price: "",
    images: "",
    rating: "",
    sizes: "",
    color: "",
    originalPrice: "",
    description: "",
    subcategory: "",
    stock: "",
  };

  const [form, setForm] = useState(product || initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Sync form with new product prop when editing
  useEffect(() => {
    setForm(product || initial);
    setError(null);
  }, [product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const normalizePayload = (f) => ({
    ...f,
    price: f.price === "" ? 0 : Number(f.price),
    originalPrice: f.originalPrice === "" ? 0 : Number(f.originalPrice),
    rating: f.rating === "" ? 0 : Number(f.rating),
    stock: f.stock === "" ? 0 : Number(f.stock),
    images: f.images ? String(f.images).trim() : "",
    sizes: f.sizes ? String(f.sizes).trim() : "",
    color: f.color ? String(f.color).trim() : "",
    description: f.description ? String(f.description).trim() : "",
    category: f.category ? String(f.category).trim() : "",
    subcategory: f.subcategory ? String(f.subcategory).trim() : "",
    name: f.name ? String(f.name).trim() : "",
  });

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = normalizePayload(form);
      let res;

      if (product && product.id) {
        res = await api.put(`/api/admin/products/${product.id}`, payload, true);
      } else {
        res = await api.post(`/api/admin/products`, payload, true);
      }

      if (onSave) {
        onSave(res?.data || res); // trust backend's updated/created product row
      }
      onClose();
    } catch (err) {
      console.error("Error saving product:", err);
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl max-h-[90vh] rounded-xl shadow-lg bg-white dark:bg-gray-900 flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {product ? "Edit Product" : "Add Product"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          id="product-form"
          onSubmit={handleSubmit}
          className="overflow-y-auto p-6 space-y-4 flex-1"
        >
          {[
            { label: "Name", name: "name" },
            { label: "Category", name: "category" },
            { label: "Subcategory", name: "subcategory" },
            { label: "Price", name: "price", type: "number" },
            { label: "Original Price", name: "originalPrice", type: "number" },
            { label: "Stock", name: "stock", type: "number" },
            { label: "Rating", name: "rating", type: "number", step: "0.1" },
            { label: "Sizes (comma separated)", name: "sizes" },
            { label: "Color", name: "color" },
            { label: "Images (comma separated URLs)", name: "images" },
            { label: "Description", name: "description", textarea: true },
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label}
              </label>
              {field.textarea ? (
                <textarea
                  name={field.name}
                  value={form[field.name] ?? ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2 
                             focus:ring-2 focus:ring-black dark:focus:ring-white transition"
                  rows="3"
                />
              ) : (
                <input
                  type={field.type || "text"}
                  step={field.step}
                  name={field.name}
                  value={form[field.name] ?? ""}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-2 
                             focus:ring-2 focus:ring-black dark:focus:ring-white transition"
                />
              )}
            </div>
          ))}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                       text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black 
                       hover:scale-105 transition-transform disabled:opacity-50"
          >
            {saving ? "Saving..." : product ? "Update" : "Add"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
