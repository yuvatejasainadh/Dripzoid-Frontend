// src/pages/CheckoutPage.jsx
// CheckoutPage with Razorpay as primary payment method and COD fallback
// + Coupon redemption wired to /api/coupons/redeem
import React, { useEffect, useMemo, useState, useContext } from "react";
import { useCart } from "../contexts/CartContext";
import {
  Check,
  CreditCard,
  ShoppingCart,
  User as UserIcon,
  MapPin,
  Wallet,
  Clock,
  X,
  Tag,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { UserContext } from "../contexts/UserContext";

/**
 * Notes:
 * - /api/orders/place-order expects: { items, buyNow, shippingAddress, paymentMethod, paymentDetails, totalAmount, ... }
 * - /api/payments/razorpay/create-order expects: { items, shipping, totalAmount }
 * - Coupon redemption uses: POST /api/coupons/redeem with { code, order_id, user_id, cart_total }
 */

const API_BASE = process.env.REACT_APP_API_BASE || "";
const RAZORPAY_KEY = process.env.REACT_APP_RAZORPAY_KEY_ID || "";

export default function CheckoutPage() {
  // include clearCart from context
  const { cart = [], fetchCart, clearCart } = useCart();
  const { user, token } = useContext(UserContext) || {};
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(null); // { code, amount, coupon }
  const [redeeming, setRedeeming] = useState(false);

  // Normalized shipping shape used everywhere
  const emptyShipping = {
    id: null,
    label: "",
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    phone: "",
  };
  const [shipping, setShipping] = useState(emptyShipping);
  const [saveAddress, setSaveAddress] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);

  // Only two payment types now: razorpay (online) and cod
  const [paymentType, setPaymentType] = useState("razorpay");
  const [savedPayments, setSavedPayments] = useState([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [loading, setLoading] = useState(false);

  const upiApps = [
    { name: "Google Pay", id: "gpay" },
    { name: "PhonePe", id: "phonepe" },
    { name: "Paytm", id: "paytm" },
    { name: "BHIM", id: "bhim" },
  ];

  const isBuyNowMode = location.state?.mode === "buy-now" || location.state?.fromBuyNow === true;
  const fromCartDefault = typeof location.state?.fromCart === "boolean" ? location.state.fromCart : !isBuyNowMode;

  // Load saved addresses/payments
  useEffect(() => {
    try {
      const raw = localStorage.getItem("savedAddresses");
      if (raw) setSavedAddresses(JSON.parse(raw));
    } catch (e) {}

    if (!token) return;

    const fetchSaved = async () => {
      try {
        // Fetch addresses
        const aRes = await fetch(`${API_BASE}/api/addresses`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (aRes.ok) {
          const addresses = await aRes.json();
          if (Array.isArray(addresses)) {
            // Map into our normalized shape
            const mapped = addresses.map((a) => ({
              id: a.id ?? null,
              label: a.label ?? "",
              name: a.name ?? a.label ?? "",
              line1: a.line1 ?? "",
              line2: a.line2 ?? "",
              city: a.city ?? "",
              state: a.state ?? "",
              pincode: a.pincode ?? "",
              country: a.country ?? "India",
              phone: a.phone ?? "",
              is_default: Boolean(a.is_default),
            }));

            setSavedAddresses(mapped);

            // Find default address
            const def = mapped.find((x) => x.is_default);
            if (def) {
              setShipping({
                id: def.id,
                label: def.label,
                name: def.name || "",
                line1: def.line1 || "",
                line2: def.line2 || "",
                city: def.city || "",
                state: def.state || "",
                pincode: def.pincode || "",
                country: def.country || "India",
                phone: def.phone || "",
              });
            }
          }
        }

        // Fetch payments (if endpoint available)
        const pRes = await fetch(`${API_BASE}/api/payments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (pRes.ok) {
          const payments = await pRes.json();
          if (Array.isArray(payments)) setSavedPayments(payments);
        }
      } catch (e) {
        console.error("Failed to fetch saved addresses/payments:", e);
      }
    };

    fetchSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // --- NORMALIZATION for checkout items ---
  const checkoutItems = useMemo(() => {
    const incoming = Array.isArray(location.state?.items) ? location.state.items : cart;
    return (Array.isArray(incoming) ? incoming : []).map((it, idx) => {
      const prod = it.product ?? it;
      const cartRowId = it.cart_id ?? it.id ?? null;
      const productId = it.product_id ?? prod.id ?? null;
      const uniqueId = productId ? `p-${productId}` : cartRowId ? `c-${cartRowId}` : `itm-${idx}`;
      const name = prod.name ?? it.name ?? it.product_name ?? "Unnamed";
      const price = Number(prod.price ?? it.price ?? it.unit_price ?? 0);
      const quantity = Number(it.quantity ?? it.qty ?? 1);
      const images = Array.isArray(prod.images) ? prod.images.join(",") : prod.images ?? it.images ?? it.image ?? "";

      const selectedColor =
        (it.selectedColor ?? it.selected_color ?? it.color) ||
        (prod.selectedColor ?? prod.selected_color ?? prod.color) ||
        (it.variant && (it.variant.color || it.variant.colour)) ||
        null;

      const selectedSize =
        (it.selectedSize ?? it.selected_size ?? it.size) ||
        (prod.selectedSize ?? prod.selected_size ?? prod.size) ||
        (it.variant && (it.variant.size || it.variant.variantSize)) ||
        null;

      const variantId =
        it.variantId ?? it.variant_id ?? prod.variantId ?? prod.variant_id ?? (it.variant && (it.variant.id || it.variant._id)) ?? null;

      const sku = (prod && (prod.sku || prod.SKU)) || it.sku || `SKU-${productId ?? idx}`;

      const original = prod;

      return {
        cart_id: cartRowId,
        product_id: productId,
        id: uniqueId,
        name,
        price,
        quantity,
        images,
        original,
        selectedColor,
        selectedSize,
        variantId,
        sku,
        unit_price: price,
      };
    });
  }, [location.state, cart]);

  const fmt = (n) => (typeof n === "number" ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : n);

  const itemsTotal = checkoutItems.reduce((s, it) => s + it.price * it.quantity, 0);
  const shippingCost = 0;
  const codCharge = paymentType === "cod" ? 25 : 0;
  const discount = promoApplied?.amount ?? 0;
  const grandTotal = Math.max(0, itemsTotal + shippingCost + codCharge - discount);

  // Validate shipping: require name, line1, phone, pincode
  const isShippingValid = () =>
    (shipping.name || "").toString().trim() &&
    (shipping.line1 || "").toString().trim() &&
    (shipping.phone || "").toString().trim() &&
    (shipping.pincode || "").toString().trim();

  // Payment validation: accept saved payment OR razorpay OR cod
  const isPaymentValid = () => {
    if (selectedPaymentId) return true;
    if (paymentType === "razorpay") return true;
    if (paymentType === "cod") return true;
    return false;
  };

  // Save / delete addresses
  const handleSaveAddress = async () => {
    if (!isShippingValid()) return alert("Please fill required shipping fields before saving.");
    if (!token) {
      try {
        const next = [
          {
            ...shipping,
            id: Date.now(),
            is_default: false,
          },
          ...savedAddresses,
        ];
        localStorage.setItem("savedAddresses", JSON.stringify(next));
        setSavedAddresses(next);
        setSaveAddress(false);
        alert("Address saved locally (demo).");
      } catch (e) {
        console.error(e);
        alert("Failed to save locally.");
      }
      return;
    }

    const payload = {
      label: shipping.label || shipping.name || "",
      name: shipping.name || "",
      line1: shipping.line1 || "",
      line2: shipping.line2 || "",
      city: shipping.city || "",
      state: shipping.state || "",
      pincode: shipping.pincode || "",
      country: shipping.country || "India",
      phone: shipping.phone || "",
      is_default: false,
    };

    if (!payload.line1 || !payload.city || !payload.state || !payload.pincode) {
      return alert("To save to your account please ensure Address (line1), City, State and Pincode are filled.");
    }

    try {
      const res = await fetch(`${API_BASE}/api/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newAddr = await res.json();
        const mapped = {
          id: newAddr.id ?? null,
          label: newAddr.label ?? payload.label,
          name: newAddr.name ?? newAddr.label ?? payload.label,
          line1: newAddr.line1 ?? payload.line1,
          line2: newAddr.line2 ?? payload.line2,
          city: newAddr.city ?? payload.city,
          state: newAddr.state ?? payload.state,
          pincode: newAddr.pincode ?? payload.pincode,
          country: newAddr.country ?? payload.country,
          phone: newAddr.phone ?? payload.phone,
          is_default: Boolean(newAddr.is_default),
        };
        setSavedAddresses((s) => [mapped, ...s]);
        setSaveAddress(false);
        alert("Address saved to your account.");
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || err?.error || `Failed to save address (status ${res.status})`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save address.");
    }
  };

  const handleDeleteAddress = async (addrId) => {
    if (!token) {
      const rest = savedAddresses.filter((s) => s.id !== addrId);
      localStorage.setItem("savedAddresses", JSON.stringify(rest));
      setSavedAddresses(rest);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/addresses/${addrId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSavedAddresses((s) => s.filter((s) => s.id !== addrId));
      else {
        const err = await res.json().catch(() => null);
        alert(err?.message || "Failed to delete address");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete address");
    }
  };

  const handleSelectSavedAddress = (addr) => {
    const mappedShipping = {
      id: addr.id ?? null,
      label: addr.label ?? addr.name ?? "",
      name: addr.name ?? addr.label ?? "",
      line1: addr.line1 ?? "",
      line2: addr.line2 ?? "",
      city: addr.city ?? "",
      state: addr.state ?? "",
      pincode: addr.pincode ?? "",
      country: addr.country ?? "India",
      phone: addr.phone ?? "",
    };
    setShipping(mappedShipping);
    setStep(3);
  };

  const goNext = () => {
    if (step === 2 && !isShippingValid()) {
      alert("Please provide Name, Address (line1), Phone and Pincode.");
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  // ---------------- Coupon: Redeem ----------------
  // Calls POST /api/coupons/redeem with { code, order_id, user_id, cart_total }
  async function redeemCoupon(code) {
    if (!code) return alert("Please enter a coupon code.");
    if (!token) {
      return alert("Please login to redeem coupons.");
    }

    // Prevent double apply
    if (promoApplied && promoApplied.code === code.toUpperCase()) {
      return alert("Coupon already applied.");
    }

    setRedeeming(true);
    try {
      const payload = {
        code: String(code).toUpperCase(),
        order_id: null,
        user_id: user?.id ?? user?._id ?? null,
        cart_total: Math.round(itemsTotal),
      };

      const res = await fetch(`${API_BASE}/api/coupons/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // Map server error codes to user-friendly messages
        const err = data?.error || data?.message || "redeem_failed";
        if (err === "invalid_coupon") alert("Coupon not found or inactive.");
        else if (err === "usage_limit_reached") alert("Coupon usage limit reached.");
        else if (err === "min_purchase_not_met") alert(`This coupon requires a minimum purchase of ₹${data?.coupon?.min_purchase ?? "?"}.`);
        else alert(err);
        setRedeeming(false);
        return;
      }

      // success: server returns { success: true, discount, coupon }
      const discount = Number(data.discount ?? 0);
      const coupon = data.coupon ?? null;

      setPromoApplied({ code: String(code).toUpperCase(), amount: discount, coupon });
      setPromoCode("");
      alert(`Coupon applied — ₹${fmt(discount)} off`);
    } catch (e) {
      console.error("redeem error", e);
      alert("Failed to redeem coupon. Try again.");
    } finally {
      setRedeeming(false);
    }
  }

  function removeAppliedCoupon() {
    setPromoApplied(null);
    alert("Coupon removed.");
  }

  // ---------------- RAZORPAY HELPERS ----------------
  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const createRazorpayOrderOnServer = async (orderPayload) => {
    const res = await fetch(`${API_BASE}/api/payments/razorpay/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(orderPayload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Create order failed (status ${res.status})`);
    }
    return res.json();
  };

  const verifyRazorpayPayment = async (verifyPayload) => {
    const res = await fetch(`${API_BASE}/api/payments/razorpay/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(verifyPayload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Payment verification failed (status ${res.status})`);
    }
    return res.json();
  };

  // Helper to clear server cart (only when order was placed from cart)
  const clearServerCartIfNeeded = async (fromCart) => {
    if (!fromCart) return;
    try {
      if (typeof clearCart === "function") await clearCart();
      if (typeof fetchCart === "function") await fetchCart();
    } catch (e) {
      console.warn("Failed to clear/refresh cart after order:", e);
    }
  };

  // small helper to extract delivery date from various response shapes
  const extractDeliveryDate = (resp) => {
    if (!resp) return null;
    return (
      resp.deliveryDate ??
      resp.delivery_date ??
      (resp.order && (resp.order.delivery_date ?? resp.order.deliveryDate)) ??
      null
    );
  };

  // Main payment handler
  const handlePayment = async ({ fromCart = fromCartDefault } = {}) => {
    if (!isPaymentValid()) {
      alert("Please complete the payment selection.");
      return;
    }
    if (!token) {
      alert("Please log in to place an order.");
      navigate("/login");
      return;
    }

    if (!isShippingValid()) {
      alert("Please fill shipping details before placing the order.");
      setStep(2);
      return;
    }

    if (checkoutItems.length === 0) {
      alert("No items to place order.");
      return;
    }

    setLoading(true);

    try {
      // Build items payload for backend (safe mapping)
      const itemsPayload = checkoutItems
        .map((it) => {
          const pid = it.product_id ?? it.original?.id ?? null;
          if (!pid) return null;
          return {
            cart_id: it.cart_id ?? null,
            product_id: pid,
            quantity: Number(it.quantity || 1),
            price: Number(it.price || 0),
            selectedColor: it.selectedColor ?? null,
            selectedSize: it.selectedSize ?? null,
            variantId: it.variantId ?? null,
            product_snapshot: it.original ?? null,
            name: it.name ?? (it.original && it.original.name) ?? `Product ${pid}`,
            sku: it.sku ?? ((it.original && it.original.sku) || `SKU-${pid}`),
            unit_price: Number(it.unit_price || it.price || 0),
          };
        })
        .filter(Boolean);

      // Normalize shipping address for server
      // IMPORTANT: include `customerName` explicitly as requested
      const shippingNormalized = {
        id: shipping.id ?? null,
        label: shipping.label || shipping.name || "",
        name: shipping.name || "",
        customerName: shipping.name || "", // <- explicit customer name
        line1: shipping.line1 || "",
        line2: shipping.line2 || "",
        city: shipping.city || "",
        state: shipping.state || "",
        pincode: shipping.pincode || "",
        country: shipping.country || "India",
        phone: shipping.phone || "",
      };

      // Payload for /api/orders/place-order (backend expects shippingAddress)
      const placeOrderPayload = {
        buyNow: isBuyNowMode,
        items: itemsPayload.map((it) => ({
          product_id: it.product_id,
          product_name: it.name, // include product name for COD backend & DB
          sku: it.sku,
          quantity: it.quantity,
          price: it.price,
          unit_price: it.unit_price,
          selectedColor: it.selectedColor,
          selectedSize: it.selectedSize,
        })),
        shippingAddress: shippingNormalized,
        paymentMethod: paymentType === "cod" ? "COD" : "Razorpay",
        paymentDetails: paymentType === "cod" ? { method: "COD" } : { method: "Razorpay" },
        totalAmount: Math.round(grandTotal),
        // include applied coupon id/code if any
        coupon: promoApplied?.coupon ? { id: promoApplied.coupon.id, code: promoApplied.code } : undefined,
        coupon_discount: promoApplied?.amount ? Number(promoApplied.amount) : undefined,
      };

      // Payload for /api/payments/razorpay/create-order (expects shipping)
      const createOrderPayloadForRazor = {
        items: itemsPayload.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
          name: it.name,
          sku: it.sku,
          selectedColor: it.selectedColor,
          selectedSize: it.selectedSize,
        })),
        shipping: {
          name: shippingNormalized.name,
          customerName: shippingNormalized.customerName, // include customerName here as well
          line1: shippingNormalized.line1,
          line2: shippingNormalized.line2,
          city: shippingNormalized.city,
          state: shippingNormalized.state,
          pincode: shippingNormalized.pincode,
          country: shippingNormalized.country,
          phone: shippingNormalized.phone,
          email: user?.email || "",
        },
        totalAmount: Math.round(grandTotal),
        coupon: promoApplied?.coupon ? { id: promoApplied.coupon.id, code: promoApplied.code } : undefined,
        coupon_discount: promoApplied?.amount ? Number(promoApplied.amount) : undefined,
      };

      // ---------------- COD flow ----------------
      if (paymentType === "cod") {
        const res = await fetch(`${API_BASE}/api/orders/place-order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(placeOrderPayload),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          alert((data && (data.error || data.message)) || `Failed to place order (status ${res.status})`);
          setLoading(false);
          return;
        }

        // Extract deliveryDate from API response (if backend provided it)
        const deliveryDate = extractDeliveryDate(data);

        // Save order locally and navigate
        const order = {
          orderId: data?.orderId ?? data?.order?.id ?? null,
          items: checkoutItems,
          total: grandTotal,
          paymentMethod: "cod",
          customerName: shippingNormalized.customerName || user?.name || "Guest",
          shipping: shippingNormalized,
          orderDate: new Date().toISOString(),
          deliveryDate: deliveryDate ?? null,
        };
        try {
          localStorage.setItem("lastOrder", JSON.stringify(order));
        } catch (e) {
          console.warn("Local storage save failed", e);
        }

        // Clear server cart only if this was a cart checkout (not buy-now)
        await clearServerCartIfNeeded(fromCart);

        navigate("/order-confirmation", { state: { order } });
        return;
      }

      // ---------------- RAZORPAY flow ----------------
      const serverResp = await createRazorpayOrderOnServer(createOrderPayloadForRazor);
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load Razorpay SDK");

      const rOrderId = serverResp?.razorpayOrderId || serverResp?.orderId || serverResp?.order?.razorpayOrderId;
      const amount = serverResp?.amount ?? serverResp?.razorpayAmount ?? Math.round(grandTotal);
      const currency = serverResp?.currency ?? "INR";
      const internalOrderId = serverResp?.internalOrderId ?? serverResp?.orderId ?? serverResp?.order?.id ?? null;

      if (!rOrderId) throw new Error("Server did not return a Razorpay order id");

      const options = {
        key: RAZORPAY_KEY,
        amount: (amount * 100) || Math.round(grandTotal * 100),
        currency,
        name: "Your Store",
        description: "Order Payment",
        order_id: rOrderId,
        prefill: { name: shippingNormalized.customerName || user?.name || "", email: user?.email || "", contact: shippingNormalized.phone || "" },
        handler: async function (response) {
          try {
            // verify and update server order
            const verifyResp = await verifyRazorpayPayment({ ...response, internalOrderId, orderPayload: createOrderPayloadForRazor });
            const orderInfo = verifyResp?.order || { orderId: internalOrderId };

            // Attempt to read delivery date from verify response or fallback to serverResp
            const deliveryDate =
              extractDeliveryDate(verifyResp) || extractDeliveryDate(serverResp) || null;

            const order = {
              orderId: orderInfo?.id ?? orderInfo?.orderId ?? internalOrderId,
              items: checkoutItems,
              total: grandTotal,
              paymentMethod: "razorpay",
              customerName: shippingNormalized.customerName || user?.name || "Guest",
              shipping: shippingNormalized,
              orderDate: new Date().toISOString(),
              deliveryDate,
            };

            try {
              localStorage.setItem("lastOrder", JSON.stringify(order));
            } catch (e) {
              console.warn("Local storage save failed", e);
            }

            // Clear server cart only if this was a cart checkout (not buy-now)
            await clearServerCartIfNeeded(fromCart);

            navigate("/order-confirmation", { state: { order } });
          } catch (err) {
            console.error("Verification failed", err);
            alert("Payment was processed but verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      if (!window || !window.Razorpay) {
        throw new Error("Razorpay SDK not available");
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert(err.message || "Something went wrong while placing the order.");
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 19);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };
  const formatExpiry = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + "/" + digits.slice(2);
  };

  // --- UI Helpers (professional look) ---
  const StepPill = ({ i, label }) => {
    const active = step === i;
    const done = step > i;
    return (
      <div className="flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition ${
            done
              ? "bg-emerald-500 text-white"
              : active
              ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500"
          }`}
        >
          {done ? <Check size={16} /> : i}
        </div>
        <div className="text-sm">
          <div className={`font-medium ${active ? "text-neutral-900 dark:text-white" : "text-gray-500 dark:text-gray-300"}`}>{label}</div>
        </div>
      </div>
    );
  };

  // Shared style tokens for inputs/buttons
  const inputBase = "w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-offset-1 transition";
  const inputLight = "bg-white border-gray-200 text-gray-900 focus:ring-indigo-500";
  const inputDark = "dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:focus:ring-indigo-400";

  const cardBase = "rounded-2xl shadow-sm";
  const cardLight = "bg-white border border-gray-100";
  const cardDark = "dark:bg-gray-900 dark:border-gray-800";

  // Payment selector style helper: selected -> black in light, white in dark (and text flips)
  const selectedBtnClass = "shadow-lg"; // common
  const unselectedBtnClass = "bg-white dark:bg-gray-900";

  const selectedCommon =
    // light mode: bg-neutral-900 text-white
    // dark mode: bg-white text-black
    "bg-neutral-900 text-white dark:bg-white dark:text-black";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-extrabold">Checkout</div>
          <div className="text-sm text-gray-500">Secure payment & fast shipping</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <MapPin size={16} /> Shipping to: <span className="ml-1 font-medium">{shipping.city || "Select address"}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <UserIcon size={16} /> <span className="ml-1 font-medium">{user?.name ?? user?.email ?? "Guest"}</span>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="col-span-2 flex gap-3 items-center">
          <StepPill i={1} label="Review" />
          <div className="flex-1 border-t border-dashed mt-2" />
          <StepPill i={2} label="Shipping" />
          <div className="flex-1 border-t border-dashed mt-2" />
          <StepPill i={3} label="Payment" />
        </div>

        <div className="flex justify-end md:justify-end">
          <div className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-2">
            <Clock size={14} /> Secure checkout
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left / main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Review */}
          {step === 1 && (
            <div className={`${cardBase} ${cardLight} ${cardDark} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Order summary</h3>
                <div className="text-sm text-gray-500">Items: {checkoutItems.length}</div>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {checkoutItems.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <ShoppingCart className="mx-auto mb-3" />
                    <div>No items found in your cart</div>
                  </div>
                ) : (
                  checkoutItems.map((it) => {
                    const colorName = it.selectedColor ?? it.original?.selectedColor ?? null;
                    const sizeName = it.selectedSize ?? it.original?.selectedSize ?? null;
                    let showColorDot = false;
                    if (colorName) {
                      try {
                        const s = new Option().style;
                        s.color = colorName;
                        showColorDot = s.color !== "";
                      } catch (e) {
                        showColorDot = false;
                      }
                    }

                    return (
                      <div key={it.id} className="py-4 flex gap-4 items-start">
                        <img src={it.images?.split?.(",")?.[0] ?? "/placeholder.jpg"} alt={it.name} className="w-24 h-24 rounded-lg object-cover shadow-sm" />
                        <div className="flex-1">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <div className="font-medium text-neutral-900 dark:text-white">{it.name}</div>
                              <div className="text-xs text-gray-500 mt-1">{it.original?.category ?? ""}</div>
                              {(colorName || sizeName) && (
                                <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-3">
                                  {colorName && (
                                    <span className="flex items-center gap-2">
                                      <span>Color: {colorName}</span>
                                      {showColorDot && <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: colorName }} />}
                                    </span>
                                  )}
                                  {sizeName && <span>Size: {sizeName}</span>}
                                </div>
                              )}
                              <div className="mt-3 text-sm font-semibold">₹{fmt(it.price)}</div>
                            </div>

                            <div className="text-sm text-gray-600">Qty {it.quantity}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-800">
                  <div className="text-xs text-gray-600">Apply promo code</div>
                  <div className="mt-2 flex gap-2">
                    <input
                      aria-label="Promo code"
                      placeholder="Enter coupon code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className={`${inputBase} ${inputLight} ${inputDark} py-2`}
                    />
                    <button
                      onClick={() => redeemCoupon(promoCode)}
                      className="px-4 py-2 rounded bg-gradient-to-r from-neutral-900 to-neutral-700 text-white hover:opacity-95 transition flex items-center gap-2"
                      disabled={redeeming || !promoCode}
                    >
                      {redeeming ? "Applying..." : <><Tag size={14} /> Apply</>}
                    </button>
                  </div>

                  {promoApplied ? (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="text-sm text-emerald-600 flex items-center gap-2">
                        <Check size={14} /> Applied: {promoApplied.code} — ₹{fmt(promoApplied.amount)} off
                      </div>
                      <button onClick={removeAppliedCoupon} className="text-xs text-red-600 flex items-center gap-1">
                        <X size={14} /> Remove
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-500">Have a coupon? Apply it to get instant discount.</div>
                  )}
                </div>

                <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-800">
                  <div className="text-xs text-gray-600">Price summary</div>
                  <div className="mt-2 flex justify-between text-sm">
                    <div>Items</div>
                    <div>₹{fmt(itemsTotal)}</div>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <div>Shipping</div>
                    <div>{shippingCost === 0 ? "Free" : `₹${fmt(shippingCost)}`}</div>
                  </div>
                  {promoApplied && (
                    <div className="flex justify-between text-sm mt-1 text-emerald-600">
                      <div>Promo ({promoApplied.code})</div>
                      <div>-₹{fmt(promoApplied.amount)}</div>
                    </div>
                  )}
                  <div className="border-t mt-3 pt-3 flex justify-between text-base font-bold">Total <div>₹{fmt(itemsTotal + shippingCost - (promoApplied?.amount ?? 0))}</div></div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Shipping */}
          {step === 2 && (
            <div className={`${cardBase} ${cardLight} ${cardDark} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Shipping details</h3>
                <div className="text-sm text-gray-500">Select or add an address</div>
              </div>

              {savedAddresses.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedAddresses.map((addr) => (
                    <div key={addr.id} className={`p-4 rounded-xl border ${addr.id === shipping.id ? "border-neutral-900 dark:border-neutral-600 bg-neutral-50 dark:bg-gray-800" : "bg-white dark:bg-gray-900"} flex justify-between`}>
                      <div>
                        <div className="text-sm font-medium">{addr.label || addr.name || "Address"}</div>
                        <div className="text-xs text-gray-500 mt-1">{addr.line1 ? `${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}` : addr.address}</div>
                        <div className="text-xs text-gray-500 mt-1">{addr.city ? `${addr.city}, ${addr.state}` : addr.state} • {addr.pincode ?? ""}</div>
                        <div className="text-xs text-gray-500 mt-1">{addr.phone}</div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {addr.is_default && <div className="text-xs text-emerald-600">Default</div>}
                        <div className="flex gap-2">
                          <button onClick={() => handleSelectSavedAddress(addr)} className="px-3 py-1 rounded text-sm bg-neutral-900 text-white">Use</button>
                          <button onClick={() => handleDeleteAddress(addr.id)} className="px-3 py-1 rounded text-sm border text-red-600">Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-300">Full name</label>
                  <input aria-label="Name" placeholder="Full name" value={shipping.name} onChange={(e) => setShipping({ ...shipping, name: e.target.value })} className={`${inputBase} ${inputLight} ${inputDark} mt-1`} />
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-300">Label</label>
                  <input aria-label="Label" placeholder="Home / Office" value={shipping.label} onChange={(e) => setShipping({ ...shipping, label: e.target.value })} className={`${inputBase} ${inputLight} ${inputDark} mt-1`} />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-gray-600 dark:text-gray-300">Address line 1</label>
                  <input aria-label="Line1" placeholder="Flat, building, street" value={shipping.line1} onChange={(e) => setShipping({ ...shipping, line1: e.target.value })} className={`${inputBase} ${inputLight} ${inputDark} mt-1`} />
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-300">Address line 2</label>
                  <input aria-label="Line2" placeholder="Area, landmark (optional)" value={shipping.line2} onChange={(e) => setShipping({ ...shipping, line2: e.target.value })} className={`${inputBase} ${inputLight} ${inputDark} mt-1`} />
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-300">City</label>
                  <input aria-label="City" placeholder="City" value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} className={`${inputBase} ${inputLight} ${inputDark} mt-1`} />
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-300">State</label>
                  <input aria-label="State" placeholder="State" value={shipping.state} onChange={(e) => setShipping({ ...shipping, state: e.target.value })} className={`${inputBase} ${inputLight} ${inputDark} mt-1`} />
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-300">Pincode</label>
                  <input aria-label="Pincode" placeholder="Pincode" value={shipping.pincode} onChange={(e) => setShipping({ ...shipping, pincode: e.target.value })} className={`${inputBase} ${inputLight} ${inputDark} mt-1`} />
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-300">Phone</label>
                  <input aria-label="Phone" placeholder="Phone" value={shipping.phone} onChange={(e) => setShipping({ ...shipping, phone: e.target.value })} className={`${inputBase} ${inputLight} ${inputDark} mt-1`} />
                </div>

                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-300">Country</label>
                  <input aria-label="Country" placeholder="Country" value={shipping.country} onChange={(e) => setShipping({ ...shipping, country: e.target.value })} className={`${inputBase} ${inputLight} ${inputDark} mt-1`} />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Save this address</span>
                </label>

                {saveAddress && (
                  <button onClick={handleSaveAddress} className="ml-2 px-3 py-1 rounded bg-neutral-900 text-white">Save</button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className={`${cardBase} ${cardLight} ${cardDark} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Payment</h3>
                <div className="text-sm text-gray-500">Choose how you'd like to pay</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Razorpay button */}
                <button
                  onClick={() => {
                    setPaymentType("razorpay");
                    setSelectedPaymentId(null);
                  }}
                  className={`w-full p-4 rounded-xl border flex items-center gap-4 text-left transition ${
                    paymentType === "razorpay" ? `${selectedCommon} ${selectedBtnClass}` : `${unselectedBtnClass}`
                  }`}
                >
                  <div className={`p-2 rounded ${paymentType === "razorpay" ? "bg-white dark:bg-gray-800 border" : "bg-white dark:bg-gray-800 border"}`}>
                    <Wallet size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Pay Online (Razorpay)</div>
                    <div className="text-xs text-gray-500 mt-1">Cards, UPI, Netbanking and more. Fast and secure.</div>
                  </div>
                  {paymentType === "razorpay" && <div className="text-xs font-semibold">Selected</div>}
                </button>

                {/* COD button */}
                <button
                  onClick={() => {
                    setPaymentType("cod");
                    setSelectedPaymentId(null);
                  }}
                  className={`w-full p-4 rounded-xl border flex items-center gap-4 text-left transition ${
                    paymentType === "cod" ? `${selectedCommon} ${selectedBtnClass}` : `${unselectedBtnClass}`
                  }`}
                >
                  <div className={`p-2 rounded ${paymentType === "cod" ? "bg-white dark:bg-gray-800 border" : "bg-white dark:bg-gray-800 border"}`}>
                    <Clock size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Cash on Delivery</div>
                    <div className="text-xs text-gray-500 mt-1">Pay in cash when your order is delivered. ₹25 COD fee applies.</div>
                  </div>
                  {paymentType === "cod" && <div className="text-xs font-semibold">Selected</div>}
                </button>
              </div>

              <div className="mt-4 text-xs text-gray-500">Secure payment — Razorpay handles sensitive card/UPI flows. COD available as fallback.</div>
            </div>
          )}
        </div>

        {/* Right column: Sticky summary */}
        <aside className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <div className="p-5 bg-gradient-to-r from-neutral-900 to-neutral-700 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm opacity-80">Price details</div>
                    <div className="text-2xl font-bold">₹{fmt(grandTotal)}</div>
                  </div>
                  <div className="text-sm text-white/80">{checkoutItems.reduce((s, it) => s + it.quantity, 0)} items</div>
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-gray-900">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Items</span><span>₹{fmt(itemsTotal)}</span></div>
                  <div className="flex justify-between"><span>Shipping</span><span>{shippingCost === 0 ? "Free" : `₹${fmt(shippingCost)}`}</span></div>
                  {promoApplied && (<div className="flex justify-between text-emerald-600"><span>Promo ({promoApplied.code})</span><span>-₹{fmt(promoApplied.amount)}</span></div>)}
                  {paymentType === "cod" && (<div className="flex justify-between text-sm"><span>COD charges</span><span>₹{fmt(codCharge)}</span></div>)}
                </div>

                <div className="border-t mt-4 pt-4 flex justify-between font-bold text-lg"><span>Total</span><span>₹{fmt(grandTotal)}</span></div>

                <div className="mt-5">
                  <div className="flex gap-3">
                    {step > 1 ? (<button onClick={() => setStep((s) => Math.max(1, s - 1))} className="flex-1 px-4 py-2 rounded border bg-gray-100 dark:bg-gray-800 text-sm">Back</button>) : (<div />)}

                    {step < 3 ? (
                      <button onClick={goNext} className="flex-1 px-4 py-2 rounded bg-neutral-900 text-white text-sm hover:opacity-95 transition">Continue</button>
                    ) : (
                      <motion.button
                        onClick={() => handlePayment()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex-1 py-3 px-6 rounded-full flex items-center justify-center gap-2 text-sm font-semibold ${
                          (!isPaymentValid() || loading) ? "opacity-60 pointer-events-none bg-gray-400" : "bg-gradient-to-r from-neutral-900 to-neutral-700 text-white shadow-lg"
                        }`}
                        aria-label="Place Order"
                        type="button"
                        disabled={!isPaymentValid() || loading}
                        style={{ minWidth: 240 }} // slightly increased width
                      >
                        <CreditCard size={16} />
                        <span className="label">{loading ? "Processing..." : `Place order ₹${fmt(grandTotal)}`}</span>
                      </motion.button>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-gray-500">By placing an order you agree to our Terms & Privacy policy.</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
