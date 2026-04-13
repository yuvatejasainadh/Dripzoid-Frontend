// src/components/Navbar.jsx
import React, { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "../contexts/UserContext.js";
import { useCart } from "../contexts/CartContext.jsx";
import { useWishlist } from "../contexts/WishlistContext.jsx";
import {
  Heart,
  ShoppingCart,
  Sun,
  Moon,
  User,
  Menu,
  X,
} from "lucide-react";
import GlobalSearchBar from "./GlobalSearch.jsx";

export default function Navbar() {
  const { user } = useContext(UserContext);
  const { cart = [] } = useCart();
  const { wishlist = [] } = useWishlist();

  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  /* ================= THEME ================= */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  /* ================= RESPONSIVE ================= */
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const navLinks = [
    { name: "Men", path: "/men" },
    { name: "Women", path: "/women" },
    { name: "Kids", path: "/kids" },
  ];

  return (
    <>
      {/* ================= NAVBAR ================= */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-[96px]">

            {/* LEFT — LOGO */}
            <Link to="/" className="flex items-center h-full">
              <img
                src={theme === "light" ? "/logo-light.png" : "/logo-dark.png"}
                alt="Dripzoid"
                className="h-[85%] w-auto object-contain"
              />
            </Link>

            {/* CENTER — DESKTOP NAV */}
            {isDesktop && (
              <div className="flex items-center space-x-10">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            )}

            {/* RIGHT — ACTIONS */}
            <div className="flex items-center gap-3">

              {/* GLOBAL SEARCH — DESKTOP (FULL) & MOBILE (ICON) */}
              <GlobalSearchBar />

              {/* THEME TOGGLE */}
              <button
                onClick={() =>
                  setTheme((t) => (t === "light" ? "dark" : "light"))
                }
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Toggle theme"
              >
                {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </button>

              {/* ================= AUTH ================= */}
              {isDesktop ? (
                user ? (
                  <>
                    {/* Wishlist */}
                    <Link
                      to="/account/wishlist"
                      className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Heart size={20} />
                      {wishlist.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                          {wishlist.length}
                        </span>
                      )}
                    </Link>

                    {/* Cart */}
                    <Link
                      to="/cart"
                      className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <ShoppingCart size={20} />
                      {cart.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                          {cart.length}
                        </span>
                      )}
                    </Link>

                    {/* User */}
                    <Link
                      to="/account"
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <User size={22} />
                    </Link>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="px-5 py-2 text-sm font-medium rounded-full ring-2 ring-black dark:ring-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
                  >
                    Login
                  </Link>
                )
              ) : (
                user ? (
                  <button
                    onClick={() => setMobileMenu((m) => !m)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Menu"
                  >
                    {mobileMenu ? <X size={26} /> : <Menu size={26} />}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium rounded-full ring-2 ring-black dark:ring-white"
                  >
                    Login
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ================= MOBILE DROPDOWN ================= */}
      {!isDesktop && mobileMenu && (
        <div className="fixed top-[96px] left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t shadow-lg">
          <div className="flex flex-col p-5 space-y-5">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenu(false)}
                className="text-lg font-medium text-gray-800 dark:text-gray-200"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
