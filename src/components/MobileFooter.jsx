// src/components/MobileFooter.jsx
import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext.js";
import { Home, Heart, ShoppingCart, User } from "lucide-react";

/**
 * MobileFooter (theme-aware)
 * - Mobile-only (hidden on md+)
 * - Icons only: Home, Wishlist (/account/wishlist), Cart, User (/account or /login)
 * - Fixed to bottom with safe-area handling
 * - Detects theme by observing the <html> class list for "dark"
 */
export default function MobileFooter() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  // theme detection: watch <html class> for "dark"
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const el = document.documentElement;
    // callback when attributes change
    const mo = new MutationObserver(() => {
      setIsDark(el.classList.contains("dark"));
    });

    mo.observe(el, { attributes: true, attributeFilter: ["class"] });

    // fallback: also listen to storage (in case theme toggles write to localStorage)
    function onStorage(e) {
      if (e.key === "theme") {
        setIsDark((e.newValue || "") === "dark");
      }
    }
    window.addEventListener("storage", onStorage);

    return () => {
      mo.disconnect();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const handleUserClick = () => {
    if (user) navigate("/account");
    else navigate("/login");
  };

  // theme aware classes
  const containerBg = isDark ? "bg-gray-900 text-white border-t border-gray-800" : "bg-white text-gray-900 border-t border-gray-200";
  const iconColor = isDark ? "text-white" : "text-gray-800";
  const hoverBg = isDark ? "hover:bg-gray-800" : "hover:bg-gray-100";

  return (
    <footer
      aria-label="Mobile primary navigation"
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden ${containerBg}`}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 12px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Home */}
          <Link
            to="/"
            className={`flex-1 flex flex-col items-center justify-center p-2 ${hoverBg} transition`}
            aria-label="Home"
          >
            <Home size={22} className={`${iconColor}`} />
          </Link>

          {/* Wishlist -> /account/wishlist */}
          <Link
            to="/account/wishlist"
            className={`flex-1 flex flex-col items-center justify-center p-2 ${hoverBg} transition`}
            aria-label="Wishlist"
          >
            <Heart size={22} className={`${iconColor}`} />
          </Link>

          {/* Cart */}
          <Link
            to="/cart"
            className={`flex-1 flex flex-col items-center justify-center p-2 ${hoverBg} transition`}
            aria-label="Cart"
          >
            <ShoppingCart size={22} className={`${iconColor}`} />
          </Link>

          {/* User (go to /account or /login) */}
          <button
            type="button"
            onClick={handleUserClick}
            className={`flex-1 flex flex-col items-center justify-center p-2 ${hoverBg} transition`}
            aria-label={user ? "Account" : "Login"}
          >
            <User size={22} className={`${iconColor}`} />
          </button>
        </div>
      </div>
    </footer>
  );
}
