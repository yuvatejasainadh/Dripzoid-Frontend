import React, { useState, useContext, useEffect } from "react";
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  User as UserIcon,
  Mail,
  Phone,
  Edit3,
  Save,
  XCircle,
} from "lucide-react";

export default function ProfileOverview() {
  const { user, updateUser } = useContext(UserContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [editMode, setEditMode] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email format";
    if (!form.phone.trim()) errs.phone = "Phone is required";
    else if (!/^\d{10}$/.test(form.phone)) errs.phone = "Phone must be 10 digits";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await updateUser(form);
      alert("Profile updated successfully");
      setEditMode(false);
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-black p-10 rounded-2xl shadow-xl transition-colors duration-500">
      <h2 className="text-3xl font-extrabold mb-8 text-black dark:text-white select-none flex items-center gap-2">
        <UserIcon size={28} /> Profile Overview
      </h2>

      <div className="space-y-8">
        {/* Name */}
        <div>
          <label className="block mb-2 font-semibold text-gray-900 dark:text-gray-300 select-none flex items-center gap-2">
            <UserIcon size={18} /> Full Name
          </label>
          {editMode ? (
            <>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className={`w-full rounded-lg p-3 border-2 transition-colors duration-300 focus:outline-none focus:ring-2 ${errors.name
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 dark:border-gray-600 focus:ring-black dark:focus:ring-white"
                  } bg-transparent text-black dark:text-white placeholder-gray-400`}
                placeholder="Enter your full name"
                disabled={loading}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1 select-none">{errors.name}</p>
              )}
            </>
          ) : (
            <p className="text-lg text-black dark:text-white select-text">
              {form.name || "-"}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block mb-2 font-semibold text-gray-900 dark:text-gray-300 select-none flex items-center gap-2">
            <Mail size={18} /> Email
          </label>
          {editMode ? (
            <>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={`w-full rounded-lg p-3 border-2 transition-colors duration-300 focus:outline-none focus:ring-2 ${errors.email
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 dark:border-gray-600 focus:ring-black dark:focus:ring-white"
                  } bg-transparent text-black dark:text-white placeholder-gray-400`}
                placeholder="Enter your email"
                disabled={loading}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1 select-none">{errors.email}</p>
              )}
            </>
          ) : (
            <p className="text-lg text-black dark:text-white select-text">
              {form.email || "-"}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block mb-2 font-semibold text-gray-900 dark:text-gray-300 select-none flex items-center gap-2">
            <Phone size={18} /> Phone Number
          </label>
          {editMode ? (
            <>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className={`w-full rounded-lg p-3 border-2 transition-colors duration-300 focus:outline-none focus:ring-2 ${errors.phone
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 dark:border-gray-600 focus:ring-black dark:focus:ring-white"
                  } bg-transparent text-black dark:text-white placeholder-gray-400`}
                placeholder="Enter your phone number"
                disabled={loading}
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1 select-none">{errors.phone}</p>
              )}
            </>
          ) : (
            <p className="text-lg text-black dark:text-white select-text">
              {form.phone || "-"}
            </p>
          )}
        </div>
      </div>

      <div className="mt-10 flex gap-4">
        {editMode ? (
          <>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-black dark:bg-white dark:text-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-900 dark:hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-700 dark:focus:ring-gray-400 transition"
            >
              <Save size={18} /> {loading ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setEditMode(false);
                setErrors({});
                if (user) {
                  setForm({
                    name: user.name || "",
                    email: user.email || "",
                    phone: user.phone || "",
                  });
                }
              }}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-black dark:border-white text-black dark:text-white font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600 transition"
            >
              <XCircle size={18} /> Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 px-8 py-3 bg-black dark:bg-white dark:text-black text-white rounded-xl font-extrabold shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-black dark:focus:ring-black"
          >
            <Edit3 size={18} /> Edit Profile
          </button>
        )}
      </div>

      {/* ✅ Admin Dashboard Button */}
      {/* ✅ Admin Dashboard Button */}
      {user?.is_admin && (
        <div className="mt-8 flex justify-center">
          <motion.button
            onClick={() => navigate("/admin/dashboard")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cssbuttons-io shadow-neon-black flex items-center gap-2 px-6 py-3 rounded-full transition"
          >
            {/* Dashboard Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z"
              />
            </svg>
            <span className="label">Switch to Admin Dashboard</span>
          </motion.button>
        </div>
      )}
    </div>
  );
}
