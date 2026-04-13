// src/components/Footer.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaInstagram,
  FaWhatsapp,
  FaYoutube,
  FaFacebookF,
} from "react-icons/fa";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // theme detection for mobile-only logo + mobile theme-friendly styles
  const [isDark, setIsDark] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);

    // watch html.class for `dark` changes
    const el = document.documentElement;
    const mo = new MutationObserver(() => {
      setIsDark(el.classList.contains("dark"));
    });
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });

    // fallback: listen to storage changes for theme toggles
    const onStorage = (e) => {
      if (e.key === "theme") setIsDark((e.newValue || "") === "dark");
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("resize", handleResize);
      mo.disconnect();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const handleGoToSection = (id) => {
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 250);
    }
  };

  // container classes adapt to theme (mobile-friendly)
  const containerBg = isDark ? "bg-black text-white" : "bg-white text-gray-900";
  const borderColor = isDark ? "border-gray-800" : "border-gray-200";
  const linkHover = isDark ? "hover:text-white" : "hover:text-black";
  const subtleBg = isDark ? "bg-gray-900/40" : "bg-gray-50/60";

  return (
    <footer className={`${containerBg} px-6 py-14`}>
      <div className="max-w-7xl mx-auto">
        {/* DESKTOP / TABLET */}
        {isDesktop ? (
          <div className="grid grid-cols-4 gap-10 items-start">
            {/* LOGO — LARGE */}
            <div className="col-span-1 flex items-start">
              <img
                src="/logo-dark.png"
                alt="Dripzoid"
                className="h-28 w-auto object-contain"
              />
            </div>

            {/* SHOP */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Shop</h3>
              <ul className={`space-y-3 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                <li>
                  <Link to="/shop" className={`${linkHover}`}>
                    All Products
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => handleGoToSection("featured")}
                    className={`${linkHover} text-left`}
                  >
                    Featured
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleGoToSection("trending")}
                    className={`${linkHover} text-left`}
                  >
                    Trending
                  </button>
                </li>
              </ul>
            </div>

            {/* COMPANY */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className={`space-y-3 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                <li>
                  <Link to="/about-us" className={`${linkHover}`}>
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className={`${linkHover}`}>
                    Contact
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-policy" className={`${linkHover}`}>
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* FOLLOW US (icons + names aligned) */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
              <ul className={`space-y-3 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                <li>
                  <a
                    href="https://www.instagram.com/dripzoidofficial"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 hover:text-white"
                  >
                    <FaInstagram className="w-5 h-5" />
                    <span>Instagram</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/message/NSIW5WOQRBDFG1"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 hover:text-white"
                  >
                    <FaWhatsapp className="w-5 h-5" />
                    <span>WhatsApp</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://youtube.com/@dripzoidofficial"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 hover:text-white"
                  >
                    <FaYoutube className="w-5 h-5" />
                    <span>YouTube</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.facebook.com/share/1Begozxt9S/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 hover:text-white"
                  >
                    <FaFacebookF className="w-5 h-5" />
                    <span>Facebook</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* MOBILE: logo on top + three links horizontal centered */
          <div className="flex flex-col items-center">
            <div className="flex justify-center mb-4">
              {/* Mobile-only logo switches based on theme */}
              <img
                src={isDark ? "/logo-dark.png" : "/logo-light.png"}
                alt="Dripzoid"
                className="h-20 w-auto object-contain"
              />
            </div>

            <div className="w-full max-w-md">
              <div
                className={`mx-auto flex items-center justify-center gap-3 rounded-lg ${subtleBg} px-2 py-2`}
                role="navigation"
                aria-label="Footer quick links"
              >
                <Link
                  to="/about-us"
                  className="px-3 py-2 text-sm rounded-md text-center w-full hover:bg-gray-200/10"
                >
                  About Us
                </Link>

                <Link
                  to="/contact"
                  className="px-3 py-2 text-sm rounded-md text-center w-full hover:bg-gray-200/10"
                >
                  Contact
                </Link>

                <Link
                  to="/privacy-policy"
                  className="px-3 py-2 text-sm rounded-md text-center w-full hover:bg-gray-200/10"
                >
                  Privacy
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM COPYRIGHT (move slightly up on mobile and avoid overlap with fixed mobile footer) */}
      <div
        className={`mt-6 md:mt-12 border-t ${borderColor} pt-4 text-center text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
        // add extra bottom padding on mobile so a fixed mobile-footer won't cover this area
        style={{ paddingBottom: isDesktop ? undefined : "72px" }}
      >
        © {new Date().getFullYear()} DRIPZOID. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
