// src/components/MobileNavbar.jsx
import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "../contexts/UserContext.js";
import { Moon, Sun, ChevronDown } from "lucide-react";
import GlobalSearchBar from "./GlobalSearch.jsx";

/**
 * MobileNavbar
 *
 * Props
 * - theme: "light" | "dark"
 * - setTheme: function to toggle theme
 * - mobileMenu: boolean (current mobile dropdown state)
 * - setMobileMenu: function to toggle mobile dropdown (keeps dropdown rendering in parent)
 *
 * Notes:
 * - This component is mobile-only (use `md:hidden`).
 * - It intentionally DOES NOT render cart/wishlist/profile icons (per POA).
 * - The parent (Navbar.jsx) should keep the mobile dropdown rendering (so behaviour remains unchanged).
 */
export default function MobileNavbar({ theme, setTheme, mobileMenu, setMobileMenu }) {
  const { user } = useContext(UserContext);

  const toggleTheme = () => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  };

  const handleMenuToggle = () => {
    setMobileMenu((m) => !m);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b md:hidden">
      <div className="flex items-center gap-3 px-3 h-14">
        {/* 1. Logo */}
        <Link to="/" className="flex-shrink-0 flex items-center h-full">
          <img
            src={theme === "light" ? "/logo-light.png" : "/logo-dark.png"}
            alt="Dripzoid"
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* 2. Global Search (always visible) */}
        <div className="flex-1">
          {/* Use your existing GlobalSearchBar component — it should be mobile friendly */}
          <GlobalSearchBar compact />
          {/* If GlobalSearchBar doesn't accept 'compact', it will still render. */}
        </div>

        {/* 3. Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* 4. Auth-based action (login button OR dropdown trigger) */}
        {user ? (
          <button
            onClick={handleMenuToggle}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={mobileMenu ? "Close menu" : "Open menu"}
          >
            <ChevronDown size={22} />
          </button>
        ) : (
          <Link
            to="/login"
            className="ml-1 px-3 py-1.5 text-sm font-medium rounded-full ring-2 ring-black dark:ring-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
            aria-label="Login"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
