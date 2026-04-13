import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Barcode from "react-barcode";
import {
  CheckCircle,
  DownloadCloud,
  MapPin,
  Printer,
  Package,
  ArrowRight,
  CreditCard,
} from "lucide-react";

/* --------------------------
   Helpers
   -------------------------- */
function generateOrderId() {
  const t = Date.now().toString(36).toUpperCase();
  return `ORD-${t.slice(-8)}`;
}

function fmtINR(n) {
  return typeof n === "number"
    ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : n;
}

function prettyDate(d) {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* --------------------------
   Lightweight monochrome confetti
   -------------------------- */
function useConfetti(duration = 2500) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);
    const particles = [];
    const colors = ["#000000", "#111111", "#222222", "#ffffff", "#bbbbbb"];

    const count = Math.min(80, Math.floor((w * h) / 5000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * -h,
        w: 4 + Math.random() * 10,
        h: 4 + Math.random() * 10,
        vx: -1 + Math.random() * 2,
        vy: 1 + Math.random() * 3,
        angle: Math.random() * Math.PI,
        spin: -0.05 + Math.random() * 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let raf = null;
    const start = performance.now();

    function draw(now) {
      const t = now - start;
      ctx.clearRect(0, 0, w, h);

      for (let p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (t < duration) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, w, h);
    }

    raf = requestAnimationFrame(draw);

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [duration]);

  return canvasRef;
}

/* --------------------------
   Reusable button
   -------------------------- */
function ActionButton({ children, onClick, className = "", disabled = false, ariaLabel }) {
  const base =
    "inline-flex items-center gap-2 px-4 py-2 rounded-full transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
  const style =
    "bg-black text-white dark:bg-white dark:text-black shadow-md hover:scale-[1.02] active:scale-[0.99] ring-black/20 dark:ring-white/20";

  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${style} ${className}`}
    >
      {children}
    </button>
  );
}

/* --------------------------
   Component
   -------------------------- */
export default function OrderConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const confettiCanvasRef = useConfetti(3000);

  const state = location.state ?? {};
  const incomingOrder = state.order ?? null;

  const stored = (() => {
    try {
      const raw = localStorage.getItem("lastOrder");
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return null;
  })();

  // Merge incoming order with stored order
  const baseOrder = incomingOrder ?? stored ?? {
    orderId: generateOrderId(),
    items: [{ id: "demo-1", name: "Demo Product", price: 799, quantity: 1, images: "" }],
    total: 799,
    paymentMethod: "COD",
    shipping: { name: "John Doe", address: "Demo address, City", phone: "9999999999" },
    orderDate: new Date().toISOString(),
    deliveryDate: new Date().toISOString(),
  };

  const items = Array.isArray(baseOrder.items) && baseOrder.items.length > 0 ? baseOrder.items : [];
  const computedAmount = typeof baseOrder.total === "number"
    ? baseOrder.total
    : items.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 1)), 0);

  const orderId = baseOrder.orderId ?? generateOrderId();
  const orderDate = baseOrder.orderDate ? new Date(baseOrder.orderDate) : new Date();
  const shipping = baseOrder.shipping ?? { name: "John Doe", address: "Demo address, City", phone: "9999999999" };
  const paymentMethod = baseOrder.paymentMethod ?? (baseOrder.paymentDetails ? "Online" : "COD");

  const [downloading, setDownloading] = useState(false);

  const estimatedDelivery = baseOrder.deliveryDate ? new Date(baseOrder.deliveryDate) : null;

  const BASE = process.env.REACT_APP_API_BASE?.replace(/\/$/, "") || "";

  useEffect(() => {
    // persist last order for quick re-open
    try {
      localStorage.setItem("lastOrder", JSON.stringify({ ...baseOrder, orderId }));
    } catch { /* ignore */ }
  }, [baseOrder, orderId]);

  /* --------------------------
     Download Invoice
     -------------------------- */
  const downloadInvoice = async () => {
    try {
      setDownloading(true);
      const url = `${BASE}/api/shipping/download-invoice`;

      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });

      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Invoice download failed:", err);
      alert("Unable to download invoice. Please try again later.");
    } finally {
      setDownloading(false);
    }
  };

  const handleTrack = () => {
    window.location.href = `https://dripzoid.com/order-details/${orderId}`;
  };

  const itemCount = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const amount = computedAmount;

  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white py-8 px-4">
      <canvas
        ref={confettiCanvasRef}
        className="pointer-events-none fixed inset-0 z-10"
        style={{ width: "100%", height: "100%", top: 0, left: 0 }}
      />

      <div className="relative max-w-5xl mx-auto z-20">
        <div className="rounded-3xl shadow-xl overflow-hidden border border-black/5 dark:border-white/5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            {/* Left: main confirmation */}
            <div className="lg:col-span-2 bg-white dark:bg-black p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="flex-none">
                  <div className="w-24 h-24 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-12 h-12" />
                  </div>
                </div>

                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold">Thank you — your order is confirmed!</h1>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 max-w-2xl">We’ve received your order and will send you a confirmation email & SMS with tracking updates.</p>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-900">
                      <div className="text-xs text-gray-500">Order ID</div>
                      <div className="font-medium mt-1 break-words">{orderId}</div>
                    </div>

                    <div className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-900">
                      <div className="text-xs text-gray-500">Order Date</div>
                      <div className="font-medium mt-1">{prettyDate(orderDate)}</div>
                    </div>

                    <div className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-900">
                      <div className="text-xs text-gray-500">Est. Delivery</div>
                      <div className="font-medium mt-1">{estimatedDelivery ? prettyDate(estimatedDelivery) : "—"}</div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3 items-center">
                    <ActionButton onClick={downloadInvoice} disabled={downloading} ariaLabel="Download invoice">
                      <DownloadCloud className="w-4 h-4" /> {downloading ? "Preparing..." : "Download Invoice"}
                    </ActionButton>

                    <button
                      onClick={handleTrack}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition"
                    >
                      <MapPin className="w-4 h-4" /> Track Order
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition"
                    >
                      <Printer className="w-4 h-4" /> Print
                    </button>

                    <button
                      onClick={() => navigate("/shop")}
                      className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-black to-gray-800 text-white dark:bg-gradient-to-r dark:from-white dark:to-gray-200 dark:text-black shadow-md"
                    >
                      Continue shopping <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items list */}
              <div className="mt-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">Items in your order</h3>
                  <div className="hidden sm:block">
                    <Barcode value={String(orderId)} format="CODE128" height={40} displayValue={false} />
                  </div>
                </div>

                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((it, idx) => (
                    <li key={it.id ?? idx} className="py-3 flex items-center gap-4">
                      <img
                        src={it.images?.split?.(",")?.[0] ?? "/placeholder.jpg"}
                        alt={it.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{it.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Qty: {it.quantity}</div>
                      </div>
                      <div className="text-right font-semibold">₹{fmtINR(Number(it.price) * Number(it.quantity))}</div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Shipping address */}
              <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h4 className="font-medium mb-2">Shipping Address</h4>
                <div className="text-sm text-gray-700 dark:text-gray-200">
                  <div className="font-medium">{shipping.name}</div>
                  <div className="break-words">{shipping.address}</div>
                  <div>{shipping.phone}</div>
                </div>
              </div>
            </div>

            {/* Right: summary panel */}
            <aside className="bg-white dark:bg-black border-l border-black/5 dark:border-white/5 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <Package className="w-4 h-4" /> Order summary
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Items ({itemCount})</span>
                    <span>₹{fmtINR(amount)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>Free</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Payment method</span>
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span>{paymentMethod}</span>
                    </span>
                  </div>

                  <div className="border-t pt-3 mt-3 flex justify-between font-bold">
                    <span>Total paid</span>
                    <span>₹{fmtINR(amount)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-xs text-gray-500">
                We’ll send tracking updates to your email and phone number.
              </div>
            </aside>
          </div>

          <div className="p-4 text-center text-xs text-gray-500">
            Order ID <span className="font-medium">{orderId}</span> — Need help?{' '}
            <button onClick={() => navigate('/contact')} className="underline">Contact support</button>
          </div>
        </div>
      </div>
    </div>
  );
}
