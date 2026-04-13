// src/components/admin/ShippingLabel.jsx
import React, { useRef, useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";

/**
 * ShippingLabel
 * Props:
 *  - order: object returned from backend
 */
export default function ShippingLabel({ order = {} }) {
  const labelRef = useRef(null);
  const barcodeCanvasRef = useRef(null);
  const [barcodeDataUrl, setBarcodeDataUrl] = useState(null);

  // Normalizes/reads shipping address whether it's a JSON string or nested object.
  const parseShippingAddress = (raw) => {
    if (!raw) return {};
    let obj = raw;

    // if it's a JSON string, try parse it
    if (typeof obj === "string") {
      try {
        obj = JSON.parse(obj);
      } catch (e) {
        // keep as text in address1
        return { address1: obj };
      }
    }

    // if object contains nested shipping_address, merge it
    if (obj && typeof obj === "object" && (obj.shipping_address || obj.shippingAddress)) {
      const nested = obj.shipping_address ?? obj.shippingAddress;
      if (typeof nested === "string") {
        try {
          const nestedParsed = JSON.parse(nested);
          obj = { ...obj, ...nestedParsed };
        } catch (_) {
          // leave as-is
        }
      } else if (typeof nested === "object") {
        obj = { ...obj, ...nested };
      }
    }

    // finally, return normalized fields
    return {
      name:
        obj.name ||
        obj.fullName ||
        obj.customerName ||
        obj.customer_name ||
        obj.recipient ||
        "",
      address1: obj.address || obj.address_line1 || obj.address1 || "",
      address2: obj.address2 || obj.address_line2 || "",
      city: obj.city || "",
      state: obj.state || obj.region || "",
      pincode: obj.pincode || obj.zip || obj.postal || "",
      country: obj.country || "",
      // don't coerce number -> remove leading zeros risk; convert to string if present
      phone: obj.phone != null ? String(obj.phone) : (obj.mobile != null ? String(obj.mobile) : (obj.contact != null ? String(obj.contact) : "")),
    };
  };

  const idValue = order?.id ?? order?.orderId ?? "";
  const customerName = order?.user_name ?? order?.customerName ?? "";
  const deliverDate = order?.deliver_date ?? order?.deliveryDate ?? order?.created_at ?? "";

  // try various possible shipping fields (some backends use shipping_address, shipping_address_full, shipping, etc.)
  const shippingRaw =
    order?.shipping_address ??
    order?.shipping_address_full ??
    order?.shipping ??
    order?.shippingAddress ??
    order?.address ??
    null;

  const parsedAddress = parseShippingAddress(shippingRaw);

  // Additional fallback candidates from order object
  const candidateUserPhones = [
    order?.user_phone,
    order?.user?.phone,
    order?.userPhone,
    order?.phone,
    order?.customer_phone,
    order?.buyer_phone,
  ]
    .filter(Boolean)
    .map((p) => String(p));

  // Final phone selection: shipping address phone first, then any user phone candidate
  const customerPhone = (parsedAddress.phone && parsedAddress.phone.trim()) || (candidateUserPhones.length ? candidateUserPhones[0] : "");

  // Debug: log order and where phone came from (will help you see why it's empty)
  useEffect(() => {
    if (!customerPhone) {
      // eslint-disable-next-line no-console
      console.warn("[ShippingLabel] no phone found for order", order?.id ?? order, {
        parsedAddress,
        candidateUserPhones,
      });
    } else {
      // eslint-disable-next-line no-console
      console.log("[ShippingLabel] using phone:", customerPhone, "for order", order?.id ?? order);
    }
  }, [order, parsedAddress, candidateUserPhones, customerPhone]);

  // generate barcode (wider)
  useEffect(() => {
    if (!idValue || !barcodeCanvasRef.current) {
      setBarcodeDataUrl(null);
      return;
    }
    const canvas = barcodeCanvasRef.current;
    // set a larger canvas so barcode is wide and clear
    canvas.width = 800;
    canvas.height = 140;

    try {
      JsBarcode(canvas, String(idValue), {
        format: "CODE128",
        displayValue: false,
        height: 100,
        margin: 0,
        width: 3,
      });
      setBarcodeDataUrl(canvas.toDataURL("image/png"));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Barcode generation error:", err);
      setBarcodeDataUrl(null);
    }
  }, [idValue]);

  const downloadPDF = async () => {
    if (!labelRef.current) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: [612, 792] });
    await doc.html(labelRef.current, {
      callback: (doc) => {
        doc.save(`ShippingLabel_${idValue || "unknown"}.pdf`);
      },
      x: 10,
      y: 10,
      html2canvas: { scale: 2 },
    });
  };

  const printLabel = () => {
    const html = labelRef.current ? labelRef.current.outerHTML : "<div>No label</div>";
    const w = window.open("", "PRINT", "height=800,width=600");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Print label</title>`);
    w.document.write(`<meta name="viewport" content="width=device-width,initial-scale=1" />`);
    w.document.write(`<style>
      body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff}
      .print-wrapper{padding:12px}
    </style>`);
    w.document.write(`</head><body><div class="print-wrapper">${html}</div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 500);
  };

  const RETURN_ADDRESS_LINES = ["Pithapuram, Kakinada", "Andhra Pradesh - 533 450"];

  const formatDate = (d) => {
    if (!d) return "";
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      const yyyy = dt.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    } catch {
      return d;
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={barcodeCanvasRef} style={{ display: "none" }} />

      <div
        ref={labelRef}
        className="w-[600px] p-6 border border-black bg-white text-black font-sans"
        style={{ boxSizing: "border-box" }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/logo-light.png" alt="Logo" className="h-14 object-contain" />
          </div>
          <div className="text-center">
            <div className="mt-2 text-lg font-semibold">DELIVER DATE: {formatDate(deliverDate)}</div>
          </div>
          <div style={{ width: 120 }} />
        </div>

        <hr className="border-t border-black my-3" />

        {/* SHIP TO */}
        <div className="mb-5">
          <div className="text-sm font-bold uppercase">SHIP TO</div>
          <div className="mt-2 font-black text-2xl leading-tight uppercase">
            {parsedAddress.name || customerName || "Recipient Name"}
          </div>
          <div className="mt-2 text-lg font-semibold">{parsedAddress.address1}</div>
          {parsedAddress.address2 && <div className="text-lg font-semibold">{parsedAddress.address2}</div>}
          <div className="text-lg font-semibold">
            {[parsedAddress.city, parsedAddress.state, parsedAddress.pincode].filter(Boolean).join(", ")}
          </div>
          {parsedAddress.country && <div className="text-lg font-semibold">{parsedAddress.country}</div>}
        </div>

        {/* BARCODE */}
        <div className="mb-4 flex flex-col items-center">
          {barcodeDataUrl ? (
            <img
              src={barcodeDataUrl}
              alt="barcode"
              style={{ width: "100%", maxWidth: 760, height: 110, objectFit: "contain" }}
            />
          ) : (
            <div style={{ width: "100%", height: 110, background: "#f3f3f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
              No barcode
            </div>
          )}

          <div className="mt-2 text-lg font-bold tracking-widest">{customerPhone || "-"}</div>
        </div>

        <hr className="border-t border-black my-3" />

        {/* ORDER # and CUSTOMER PHONE */}
        <div className="grid grid-cols-2 gap-0 border border-black text-sm">
          <div className="p-3 border-r border-black">
            <div className="uppercase text-xs font-bold">ORDER #</div>
            <div className="mt-1 text-2xl font-extrabold">{String(idValue)}</div>
          </div>
          <div className="p-3">
            <div className="uppercase text-xs font-bold">CUSTOMER PHONE</div>
            <div className="mt-1 text-2xl font-extrabold">{customerPhone || "-"}</div>
          </div>
        </div>

        {/* RETURN ADDRESS */}
        <div className="mt-4">
          <div className="uppercase text-xs font-bold">RETURN ADDRESS</div>
          <div className="mt-2 font-semibold">
            <div>{RETURN_ADDRESS_LINES[0]}</div>
            <div>{RETURN_ADDRESS_LINES[1]}</div>
          </div>
        </div>

        {/* Bottom icons */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            <div className="uppercase text-xs font-bold">WEIGHT</div>
            <div className="font-semibold">— KG</div>
            <div className="mt-2 uppercase text-xs font-bold">DIMENSIONS</div>
            <div className="font-semibold">— x — x — cm</div>
          </div>
          <div className="flex items-end gap-4">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v13a4 4 0 0 0 4 4h10" />
              <path d="M21 3 12 14 3 3" />
            </svg>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V6" />
              <path d="M5 12l7-7 7 7" />
            </svg>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="16" height="10" rx="2" />
              <path d="M22 11v2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={downloadPDF}
          className="px-4 py-2 bg-black text-white rounded hover:bg-neutral-800 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
        >
          Download PDF
        </button>

        <button
          onClick={printLabel}
          className="px-4 py-2 border border-black rounded bg-white text-black hover:bg-black hover:text-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
        >
          Print
        </button>
      </div>
    </div>
  );
}
