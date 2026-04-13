import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Image as ImageIcon,
  Download,
  Tag,
  Megaphone
} from "lucide-react"; // Added icons for new sections

export default function AdminLayout() {
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", path: "/admin/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "Products", path: "/admin/products", icon: <Package className="w-5 h-5" /> },
    { label: "Orders", path: "/admin/orders", icon: <ShoppingBag className="w-5 h-5" /> },
    { label: "Users", path: "/admin/users", icon: <Users className="w-5 h-5" /> },
    { label: "Image Upload", path: "/admin/upload", icon: <ImageIcon className="w-5 h-5" /> },
    { label: "Labels Download", path: "/admin/labels", icon: <Download className="w-5 h-5" /> },
    { label: "Coupons ", path: "/admin/coupons", icon: <Tag className="w-5 h-5" /> },
    { label: "Sales & Slides", path: "/admin/salesandslides", icon: <Megaphone className="w-5 h-5" /> },
  ];

  const isActive = (path) => {
    if (path === "/admin/dashboard") {
      return location.pathname === "/admin" || location.pathname === "/admin/dashboard";
    }
    return location.pathname === path;
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <aside
        className="w-64 border-r border-gray-200 dark:border-gray-800 p-5 flex flex-col gap-6
                   bg-white dark:bg-gray-950 transition-colors duration-200"
        aria-label="Admin sidebar"
      >
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Admin Panel</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage products, users & orders
          </p>
        </div>

        <nav className="flex-1 mt-4 space-y-2" role="navigation" aria-labelledby="admin-nav">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? "page" : undefined}
                onClick={(e) => active && e.preventDefault()}
                className={`
                  group flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-all duration-150 transform
                  hover:-translate-y-0.5 active:scale-[0.99]
                  focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-black/40 dark:focus-visible:ring-white/40
                  focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black
                  ${active
                    ? "bg-black text-white dark:bg-white dark:text-black pointer-events-none shadow-lg"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  }
                `}
              >
                <span
                  className={`
                    flex items-center justify-center w-9 h-9 rounded-md transition
                    ${active
                      ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                      : "text-gray-600 dark:text-gray-300"
                    }
                  `}
                >
                  {item.icon}
                </span>

                <span className="truncate">{item.label}</span>

                {active && (
                  <span
                    className={`
                      ml-auto px-2 py-0.5 text-xs rounded-full font-semibold
                      ${active
                        ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                        : ""
                      }
                    `}
                    aria-hidden
                  >
                    Active
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Logged in as admin</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header
          className="flex items-center justify-between gap-4 p-4 border-b border-gray-200 dark:border-gray-800
                           bg-white dark:bg-gray-950 transition-colors duration-150"
        >
          <div>
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Overview & quick actions</p>
          </div>
          <div className="flex items-center gap-3" />
        </header>

        <main className="p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
