// src/pages/account/PaymentMethods.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Landmark as Bank,
  Plus,
  CreditCard,
  User,
  Edit2,
  Trash2,
  Star,
  X,
  Save,
} from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE;

function getEmptyForm(type = "card") {
  return {
    type,
    holderName: "",
    number: "",
    expiry: "",
    cvv: "",
    upiName: "",
    upiId: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    nickname: "",
    isDefault: false,
  };
}

function findIndexForDigit(formatted, digitCount) {
  if (digitCount <= 0) return 0;
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      count++;
      if (count === digitCount) return i + 1;
    }
  }
  return formatted.length;
}

function RenderList({ list = [], type, onEdit, onDelete, onSetDefault }) {
  if (!list.length)
    return (
      <div className="p-6 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-black">
        <p className="text-sm text-gray-600 dark:text-gray-300">No saved {type} methods. Add one to get started.</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {list.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-black shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50 dark:bg-neutral-900 text-sm font-semibold">
              {type === "card" ? (item.provider || "Card").toUpperCase() : type === "upi" ? "UPI" : "B"}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">
                  {item.nickname
                    ? item.nickname
                    : type === "card"
                    ? `${(item.provider || "Card").toUpperCase()} • ${item.last4}`
                    : type === "upi"
                    ? item.upiId
                    : item.bankName}
                </h4>

                {item.isDefault && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-black text-white dark:bg-white dark:text-black">
                    <Star size={12} aria-hidden /> Default
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {type === "card"
                  ? `${item.holderName} • Expires ${item.expiry}`
                  : type === "upi"
                  ? item.upiName
                  : `${item.bankName} • ${item.accountNumber}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-2 text-sm px-3 py-1 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:opacity-90"
              onClick={() => onEdit(type, item.id)}
              aria-label="Edit"
            >
              <Edit2 size={14} aria-hidden /> Edit
            </button>

            <button
              type="button"
              className="flex items-center gap-2 text-sm px-3 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
              onClick={() => onDelete(type, item.id)}
              aria-label="Delete"
            >
              <Trash2 size={14} aria-hidden /> Delete
            </button>

            {!item.isDefault && (
              <button
                type="button"
                className="flex items-center gap-2 text-sm px-3 py-1 rounded-md border border-gray-200 bg-white dark:bg-neutral-900"
                onClick={() => onSetDefault(type, item.id)}
                aria-label="Set default"
              >
                <Star size={14} aria-hidden /> Set default
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function FormModal({ isOpen, initialData, onClose, onSave, errorsFromParent = {}, uidToken }) {
  const numberRef = useRef(null);
  const expiryRef = useRef(null);
  const holderRef = useRef(null);
  const upiNameRef = useRef(null);
  const upiIdRef = useRef(null);
  const bankRef = useRef(null);
  const accountRef = useRef(null);

  const [localForm, setLocalForm] = useState(() => initialData || getEmptyForm(initialData?.type || "card"));
  const [localErrors, setLocalErrors] = useState(errorsFromParent || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalForm(initialData || getEmptyForm(initialData?.type || "card"));
    setLocalErrors(errorsFromParent || {});
  }, [initialData, isOpen, errorsFromParent]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      if (localForm.type === "card") {
        holderRef.current?.focus();
      } else if (localForm.type === "upi") {
        if (upiIdRef.current) upiIdRef.current.focus();
        else upiNameRef.current?.focus();
      } else if (localForm.type === "netbanking") {
        bankRef.current?.focus();
      }
    }, 50);
    return () => clearTimeout(t);
  }, [isOpen, localForm.type]);

  if (!isOpen) return null;

  function handleLocalChange(e) {
    const { name, value } = e.target;
    const selectionStart = typeof e.target.selectionStart === "number" ? e.target.selectionStart : value.length;

    if (name === "number") {
      const rawValue = value;
      const digitsBeforeCursor = (rawValue.slice(0, selectionStart).match(/\d/g) || []).length;
      const sanitized = rawValue.replace(/[^0-9]/g, "").slice(0, 19);
      const parts = [];
      for (let i = 0; i < sanitized.length; i += 4) parts.push(sanitized.slice(i, i + 4));
      const formatted = parts.join(" ");
      setLocalForm((s) => ({ ...s, number: formatted }));

      setTimeout(() => {
        try {
          const el = numberRef.current;
          if (!el || document.activeElement !== el) return;
          const pos = findIndexForDigit(formatted, digitsBeforeCursor);
          if (typeof el.setSelectionRange === "function") el.setSelectionRange(pos, pos);
        } catch (err) {
          /* ignore */
        }
      }, 0);
      return;
    }

    if (name === "expiry") {
      const rawValue = value;
      const digitsBeforeCursor = (rawValue.slice(0, selectionStart).match(/\d/g) || []).length;
      const sanitized = rawValue.replace(/[^0-9]/g, "").slice(0, 4);
      let out = sanitized;
      if (sanitized.length >= 3) out = `${sanitized.slice(0, 2)}/${sanitized.slice(2)}`;
      setLocalForm((s) => ({ ...s, expiry: out }));

      setTimeout(() => {
        try {
          const el = expiryRef.current;
          if (!el || document.activeElement !== el) return;
          const pos = findIndexForDigit(out, digitsBeforeCursor);
          if (typeof el.setSelectionRange === "function") el.setSelectionRange(pos, pos);
        } catch (err) {
          /* ignore */
        }
      }, 0);
      return;
    }

    if (name === "ifsc") {
      setLocalForm((s) => ({ ...s, ifsc: value.toUpperCase() }));
      return;
    }

    setLocalForm((s) => ({ ...s, [name]: value }));
  }

  async function onSaveClick() {
    setSaving(true);
    try {
      const res = onSave(localForm);
      const result = res && typeof res.then === "function" ? await res : res;
      if (!result) return;
      if (!result.success) {
        setLocalErrors(result.errors || {});
        return;
      }
      setLocalErrors({});
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      setLocalErrors({ _global: "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  const ids = {
    holder: `holder-${uidToken}-${localForm.type}`,
    number: `number-${uidToken}-${localForm.type}`,
    expiry: `expiry-${uidToken}-${localForm.type}`,
    cvv: `cvv-${uidToken}-${localForm.type}`,
    upiName: `upiName-${uidToken}-${localForm.type}`,
    upiId: `upiId-${uidToken}-${localForm.type}`,
    bankName: `bankName-${uidToken}-${localForm.type}`,
    account: `account-${uidToken}-${localForm.type}`,
    ifsc: `ifsc-${uidToken}-${localForm.type}`,
    nickname: `nick-${uidToken}-${localForm.type}`,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0" onMouseDown={onClose} />

      <div className="relative z-10 bg-white dark:bg-black p-6 rounded-xl shadow-xl w-full max-w-md" onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ position: "absolute", left: -9999, top: "auto", width: 1, height: 1, overflow: "hidden" }} aria-hidden>
          <input name="noautocomplete_user" autoComplete="username" tabIndex={-1} />
          <input name="noautocomplete_pass" type="password" autoComplete="current-password" tabIndex={-1} />
        </div>

        <h3 className="text-lg font-semibold mb-4">
          {initialData ? "Edit" : "Add"} {localForm.type === "card" ? "Card" : localForm.type === "upi" ? "UPI" : "Netbanking"}
        </h3>

        <div className="space-y-3">
          {localForm.type === "card" && (
            <>
              <label htmlFor={ids.holder} className="text-xs block">
                Name on card
              </label>
              <input
                id={ids.holder}
                ref={holderRef}
                name="holderName"
                aria-label="Name on card"
                type="text"
                autoComplete={uidToken}
                spellCheck={false}
                className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700"
                placeholder="Full name"
                value={localForm.holderName || ""}
                onChange={handleLocalChange}
                aria-invalid={!!localErrors.holderName}
              />
              {localErrors.holderName && <p className="text-xs text-red-500">{localErrors.holderName}</p>}

              <label htmlFor={ids.number} className="text-xs block mt-2">
                Card number
              </label>
              <input
                id={ids.number}
                ref={numberRef}
                name="number"
                aria-label="Card number"
                inputMode="numeric"
                type="text"
                maxLength={23}
                autoComplete={uidToken}
                spellCheck={false}
                className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700"
                placeholder="1234 5678 9012 3456"
                value={localForm.number || ""}
                onChange={handleLocalChange}
                aria-invalid={!!localErrors.number}
              />
              {initialData && !localForm.number && (
                <p className="text-xs text-gray-500">Existing card number is masked — leave blank to keep it, or enter a full card number to update.</p>
              )}
              {localErrors.number && <p className="text-xs text-red-500">{localErrors.number}</p>}

              <div className="flex gap-2 mt-2">
                <div className="flex-1">
                  <label htmlFor={ids.expiry} className="text-xs block">
                    Expiry (MM/YY)
                  </label>
                  <input
                    id={ids.expiry}
                    ref={expiryRef}
                    name="expiry"
                    aria-label="Expiry"
                    inputMode="numeric"
                    type="text"
                    maxLength={5}
                    autoComplete={uidToken}
                    spellCheck={false}
                    className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700"
                    placeholder="08/28"
                    value={localForm.expiry || ""}
                    onChange={handleLocalChange}
                    aria-invalid={!!localErrors.expiry}
                  />
                  {localErrors.expiry && <p className="text-xs text-red-500">{localErrors.expiry}</p>}
                </div>

                <div className="w-24">
                  <label htmlFor={ids.cvv} className="text-xs block">
                    CVV
                  </label>
                  <input
                    id={ids.cvv}
                    name="cvv"
                    aria-label="CVV"
                    inputMode="numeric"
                    type="text"
                    maxLength={4}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700"
                    placeholder="123"
                    value={localForm.cvv || ""}
                    onChange={handleLocalChange}
                    aria-invalid={!!localErrors.cvv}
                  />
                  {localErrors.cvv && <p className="text-xs text-red-500">{localErrors.cvv}</p>}
                </div>
              </div>

              <label htmlFor={ids.nickname} className="text-xs block mt-2">
                Nickname (optional)
              </label>
              <input
                id={ids.nickname}
                name="nickname"
                aria-label="Nickname"
                type="text"
                autoComplete={uidToken}
                spellCheck={false}
                className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700"
                placeholder="Personal card"
                value={localForm.nickname || ""}
                onChange={handleLocalChange}
              />
            </>
          )}

          {localForm.type === "upi" && (
            <>
              <label htmlFor={ids.upiName} className="text-xs block">
                Name
              </label>
              <input
                id={ids.upiName}
                ref={upiNameRef}
                name="upiName"
                aria-label="UPI name"
                type="text"
                autoComplete={uidToken}
                spellCheck={false}
                className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700"
                placeholder="Your name"
                value={localForm.upiName || ""}
                onChange={handleLocalChange}
                aria-invalid={!!localErrors.upiName}
              />
              {localErrors.upiName && <p className="text-xs text-red-500">{localErrors.upiName}</p>}

              <label htmlFor={ids.upiId} className="text-xs block mt-2">
                UPI ID
              </label>
              <input
                id={ids.upiId}
                ref={upiIdRef}
                name="upiId"
                aria-label="UPI ID"
                type="text"
                autoComplete={uidToken}
                spellCheck={false}
                className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700"
                placeholder="example@bank"
                value={localForm.upiId || ""}
                onChange={handleLocalChange}
                aria-invalid={!!localErrors.upiId}
              />
              {localErrors.upiId && <p className="text-xs text-red-500">{localErrors.upiId}</p>}

              <label htmlFor={ids.nickname} className="text-xs block mt-2">
                Nickname (optional)
              </label>
              <input
                id={ids.nickname}
                name="nickname"
                aria-label="Nickname"
                type="text"
                autoComplete={uidToken}
                spellCheck={false}
                className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700"
                placeholder="Personal UPI"
                value={localForm.nickname || ""}
                onChange={handleLocalChange}
              />
            </>
          )}

          {localForm.type === "netbanking" && (
            <>
              <label htmlFor={ids.bankName} className="text-xs block">
                Bank name
              </label>
              <input
                id={ids.bankName}
                ref={bankRef}
                name="bankName"
                aria-label="Bank name"
                type="text"
                autoComplete={uidToken}
                spellCheck={false}
                className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700"
                placeholder="State Bank of India"
                value={localForm.bankName || ""}
                onChange={handleLocalChange}
                aria-invalid={!!localErrors.bankName}
              />
              {localErrors.bankName && <p className="text-xs text-red-500">{localErrors.bankName}</p>}

              <label htmlFor={ids.account} className="text-xs block mt-2">
                Account number
              </label>
              <input
                id={ids.account}
                ref={accountRef}
                name="accountNumber"
                aria-label="Account number"
                inputMode="numeric"
                type="text"
                autoComplete={uidToken}
                spellCheck={false}
                className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700"
                placeholder="123456789012"
                value={localForm.accountNumber || ""}
                onChange={handleLocalChange}
                aria-invalid={!!localErrors.accountNumber}
              />
              {initialData && !localForm.accountNumber && (
                <p className="text-xs text-gray-500">Existing account number is masked — leave blank to keep it, or enter the full account number to update.</p>
              )}
              {localErrors.accountNumber && <p className="text-xs text-red-500">{localErrors.accountNumber}</p>}

              <label htmlFor={ids.ifsc} className="text-xs block mt-2">
                IFSC
              </label>
              <input
                id={ids.ifsc}
                name="ifsc"
                aria-label="IFSC code"
                type="text"
                autoComplete={uidToken}
                spellCheck={false}
                className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700"
                placeholder="HDFC0ABCD12"
                value={localForm.ifsc || ""}
                onChange={handleLocalChange}
                aria-invalid={!!localErrors.ifsc}
              />
              {localErrors.ifsc && <p className="text-xs text-red-500">{localErrors.ifsc}</p>}

              <label htmlFor={ids.nickname} className="text-xs block mt-2">
                Nickname (optional)
              </label>
              <input
                id={ids.nickname}
                name="nickname"
                aria-label="Nickname"
                type="text"
                autoComplete={uidToken}
                spellCheck={false}
                className="w-full px-3 py-2 border rounded-md dark:bg-neutral-900 dark:border-neutral-700"
                placeholder="My salary account"
                value={localForm.nickname || ""}
                onChange={handleLocalChange}
              />
            </>
          )}

          <label className="flex items-center gap-2 mt-3">
            <input type="checkbox" checked={!!localForm.isDefault} onChange={(e) => setLocalForm((s) => ({ ...s, isDefault: e.target.checked }))} />
            <span className="text-sm">Set as default</span>
          </label>

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 dark:border-neutral-700">
              <X size={16} aria-hidden /> Cancel
            </button>

            <button type="button" onClick={onSaveClick} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black border border-gray-200 dark:border-neutral-700">
              <Save size={16} aria-hidden /> {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentMethods({ authToken: propToken, apiBase = API_BASE }) {
  const tabs = [
    { id: "upi", label: "UPI", icon: User },
    { id: "card", label: "Cards", icon: CreditCard },
    { id: "netbanking", label: "Netbanking", icon: Bank },
  ];

  const uidInstance = useRef(Math.random().toString(36).slice(2, 9));

  const [activeTab, setActiveTab] = useState("card");
  const [data, setData] = useState({ upi: [], card: [], netbanking: [] });
  const [isModalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalInitial, setModalInitial] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function getToken() {
    return propToken || localStorage.getItem("token") || "";
  }

  async function apiFetch(path, opts = {}) {
    const token = getToken();
    const headers = opts.headers || {};
    if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(apiBase + path, { ...opts, headers });
    if (res.status === 401) {
      throw new Error("Unauthorized");
    }
    const text = await res.text();
    try {
      return JSON.parse(text || "{}");
    } catch (e) {
      return { _raw: text };
    }
  }

  function mapServerRows(rows = []) {
    const card = [];
    const upi = [];
    const netbanking = [];
    for (const r of rows) {
      const metadata = r.metadata ? (typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata) : {};
      if (r.type === "card") {
        card.push({
          id: r.id,
          type: "card",
          holderName: r.holder_name || r.card_name || "",
          number: r.masked_number || (r.last4 ? `**** **** **** ${r.last4}` : ""),
          last4: r.last4 || "",
          expiry: r.card_expiry || "",
          nickname: r.nickname || "",
          isDefault: !!r.is_default,
          provider: metadata.provider || (r.card_name ? r.card_name.toLowerCase() : "card"),
          createdAt: r.created_at,
        });
      } else if (r.type === "upi") {
        upi.push({
          id: r.id,
          type: "upi",
          upiName: r.holder_name || r.nickname || "",
          upiId: r.masked_number || "",
          nickname: r.nickname || "",
          isDefault: !!r.is_default,
          createdAt: r.created_at,
        });
      } else if (r.type === "netbanking") {
        netbanking.push({
          id: r.id,
          type: "netbanking",
          bankName: r.bank_name || "",
          accountNumber: r.masked_number || "",
          ifsc: r.ifsc_code || "",
          nickname: r.nickname || "",
          isDefault: !!r.is_default,
          createdAt: r.created_at,
        });
      }
    }
    return { card, upi, netbanking };
  }

  async function fetchPayments() {
    setLoading(true);
    try {
      const rows = await apiFetch("/api/payments");
      if (!Array.isArray(rows)) throw new Error("Unexpected response");
      const mapped = mapServerRows(rows);
      setData(mapped);
      try {
        localStorage.setItem("payment_methods_v1", JSON.stringify(mapped));
      } catch (e) {
        /* ignore */
      }
    } catch (e) {
      console.error("Failed to fetch payments, falling back to local data:", e);
      try {
        const raw = localStorage.getItem("payment_methods_v1");
        if (raw) setData(JSON.parse(raw));
      } catch (er) {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayments();
  }, []);

  async function createPaymentOnServer(formData) {
    const type = formData.type;
    const body = {};
    if (type === "card") {
      body.type = "card";
      body.card_number = (formData.number || "").replace(/\D/g, "");
      body.card_expiry = formData.expiry || null;
      body.holder_name = formData.holderName || null;
      body.card_name = formData.holderName || null;
      body.nickname = formData.nickname || null;
      body.is_default = formData.isDefault ? 1 : 0;
    } else if (type === "upi") {
      body.type = "upi";
      body.upi_id = (formData.upiId || "").trim();
      body.holder_name = formData.upiName || null;
      body.nickname = formData.nickname || null;
      body.is_default = formData.isDefault ? 1 : 0;
    } else if (type === "netbanking") {
      body.type = "netbanking";
      body.bank_name = formData.bankName || null;
      body.account_number = (formData.accountNumber || "").replace(/\D/g, "");
      body.ifsc_code = formData.ifsc || null;
      body.holder_name = formData.holderName || null;
      body.nickname = formData.nickname || null;
      body.is_default = formData.isDefault ? 1 : 0;
    }

    const res = await apiFetch("/api/payments", { method: "POST", body: JSON.stringify(body) });
    return res;
  }

  async function updatePaymentOnServer(id, formData) {
  const payload = {};

  if (formData.nickname !== undefined) payload.nickname = formData.nickname;

  // Card-specific
  if (formData.holderName !== undefined) payload.holder_name = formData.holderName;
  if (formData.expiry !== undefined) payload.card_expiry = formData.expiry;
  if (formData.card_name !== undefined) payload.card_name = formData.card_name;
  if (formData.number !== undefined) payload.card_number = formData.number.replace(/\D/g, "");

  // Netbanking-specific
  if (formData.bankName !== undefined) payload.bank_name = formData.bankName;
  if (formData.accountNumber !== undefined) payload.account_number = formData.accountNumber.replace(/\D/g, "");
  if (formData.ifsc !== undefined) payload.ifsc_code = formData.ifsc;

  // UPI-specific
  if (formData.upiId !== undefined) payload.upi_id = formData.upiId.trim();
  if (formData.upiName !== undefined) payload.holder_name = formData.upiName;

  const res = await apiFetch(`/api/payments/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  return res;
}


  async function deletePaymentOnServer(id) {
    await apiFetch(`/api/payments/${id}`, { method: "DELETE" });
  }

  async function setDefaultOnServer(id) {
    await apiFetch(`/api/payments/${id}/default`, { method: "PATCH" });
    await fetchPayments();
  }

  function maskCard(number) {
    const digits = number.replace(/\D/g, "");
    if (digits.length < 4) return "****";
    const last4 = digits.slice(-4);
    return `**** **** **** ${last4}`;
  }

  function maskAccount(account) {
    const digits = account.replace(/\D/g, "");
    if (digits.length <= 4) return "****";
    const last4 = digits.slice(-4);
    return `****${last4}`;
  }

  function luhnCheck(cardNumber) {
    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length < 12) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = parseInt(digits.charAt(i), 10);
      if (shouldDouble) {
        d = d * 2;
        if (d > 9) d = d - 9;
      }
      sum += d;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  function validateExpiry(exp) {
    const m = (exp || "").replace(/\s/g, "");
    if (!/^\d{1,2}\/\d{2}$/.test(m)) return false;
    const [mm, yy] = m.split("/");
    const month = parseInt(mm, 10);
    const year = parseInt(yy, 10) + 2000;
    if (isNaN(month) || isNaN(year)) return false;
    if (month < 1 || month > 12) return false;
    const now = new Date();
    const expDate = new Date(year, month, 0, 23, 59, 59);
    return expDate >= new Date(now.getFullYear(), now.getMonth(), 0, 0, 0, 0);
  }

  function validateUpiId(id) {
    if (!id || typeof id !== "string") return false;
    return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(id);
  }

  function validateIfsc(ifsc) {
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
  }

  function detectCardBrand(digits) {
    if (!digits) return "card";
    if (/^4/.test(digits)) return "visa";
    if (/^5[1-5]/.test(digits)) return "mastercard";
    if (/^3[47]/.test(digits)) return "amex";
    if (/^6(?:011|5)/.test(digits)) return "discover";
    return "card";
  }

  function openAddModal(type) {
    setEditing(null);
    setErrors({});
    setModalInitial(getEmptyForm(type));
    setActiveTab(type);
    setModalOpen(true);
  }

  function openEditModal(type, id) {
    setErrors({});
    const list = data[type] || [];
    const item = list.find((x) => x.id === id);
    if (!item) return;
    const editable = getEmptyForm(type);

    if (type === "card") {
      editable.holderName = item.holderName || "";
      editable.number = "";
      editable.expiry = item.expiry || "";
      editable.nickname = item.nickname || "";
      editable.isDefault = !!item.isDefault;
    } else if (type === "upi") {
      editable.upiName = item.upiName || "";
      editable.upiId = "";
      editable.nickname = item.nickname || "";
      editable.isDefault = !!item.isDefault;
    } else if (type === "netbanking") {
      editable.bankName = item.bankName || "";
      editable.accountNumber = "";
      editable.ifsc = item.ifsc || "";
      editable.nickname = item.nickname || "";
      editable.isDefault = !!item.isDefault;
    }

    setModalInitial(editable);
    setEditing({ type, id });
    setActiveTab(type);
    setModalOpen(true);
  }

  async function handleDelete(type, id) {
    if (!window.confirm("Delete this payment method?")) return;
    try {
      await deletePaymentOnServer(id);
      await fetchPayments();
    } catch (e) {
      console.error(e);
      alert("Failed to delete method");
    }
  }

  async function handleSetDefault(type, id) {
    try {
      await apiFetch(`/api/payments/${id}/default`, { method: "PATCH" });
      await fetchPayments();
    } catch (e) {
      console.error(e);
      alert("Failed to set default");
    }
  }

  function validateForm(f) {
    const errs = {};

    if (f.type === "card") {
      if (!f.holderName || f.holderName.trim().length < 2) errs.holderName = "Name on card is required";

      const digits = (f.number || "").replace(/\D/g, "");
      if (digits.length) {
        if (!/^[0-9]{12,19}$/.test(digits)) errs.number = "Enter a valid card number (12-19 digits)";
        else if (!luhnCheck(digits)) errs.number = "Invalid card number";
      }
      if (!f.expiry || !validateExpiry(f.expiry)) errs.expiry = "Enter valid expiry (MM/YY)";
      if (f.cvv && !/^[0-9]{3,4}$/.test(f.cvv)) errs.cvv = "Enter a valid CVV";
    }

    if (f.type === "upi") {
      if (!f.upiName || f.upiName.trim().length < 2) errs.upiName = "Name is required";
      if (f.upiId && !validateUpiId(f.upiId)) errs.upiId = "Enter valid UPI ID (example: name@bank)";
    }

    if (f.type === "netbanking") {
      if (!f.bankName || f.bankName.trim().length < 2) errs.bankName = "Bank name is required";
      const acct = (f.accountNumber || "").replace(/\D/g, "");
      if (acct.length) {
        if (!/^[0-9]{6,20}$/.test(acct)) errs.accountNumber = "Enter a valid account number";
      }
      if (f.ifsc && !validateIfsc(f.ifsc.toUpperCase())) errs.ifsc = "Enter valid IFSC (like: HDFC0ABCD12)";
    }

    return { valid: Object.keys(errs).length === 0, errors: errs };
  }

  async function onModalSave(formData) {
    const validation = validateForm(formData);
    setErrors(validation.errors || {});
    if (!validation.valid) return { success: false, errors: validation.errors };

    const type = formData.type || activeTab;

    try {
      if (editing) {
        const providedNewSensitive =
          (type === "card" && (formData.number || "").replace(/\D/g, "").length > 0) ||
          (type === "upi" && (formData.upiId || "").trim().length > 0) ||
          (type === "netbanking" && (formData.accountNumber || "").replace(/\D/g, "").length > 0);

        if (providedNewSensitive) {
          const createRes = await createPaymentOnServer({ ...formData, type });
          if (!createRes || !createRes.success) {
            return { success: false, errors: { _global: "Failed to replace payment method" } };
          }
          await deletePaymentOnServer(editing.id);
        } else {
          await updatePaymentOnServer(editing.id, {
            nickname: formData.nickname,
            holderName: formData.holderName,
            expiry: formData.expiry,
          });
          if (formData.isDefault) {
            await apiFetch(`/api/payments/${editing.id}/default`, { method: "PATCH" });
          }
        }
      } else {
        const createRes = await createPaymentOnServer({ ...formData, type });
        if (!createRes || !createRes.success) return { success: false, errors: { _global: "Create failed" } };
      }

      await fetchPayments();
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, errors: { _global: e.message || "Server error" } };
    }
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setModalInitial(null);
    setErrors({});
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Payment Methods</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 rounded-2xl border border-gray-200 dark:border-neutral-800 p-4 bg-white dark:bg-black">
          <div className="space-y-4">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-3 ${
                    activeTab === t.id ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-gray-50 dark:hover:bg-neutral-900"
                  }`}
                >
                  <Icon size={16} aria-hidden className="opacity-80" />
                  <div className="flex-1">
                    <div className="font-medium">{t.label}</div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{(data[t.id] || []).length}</div>
                </button>
              );
            })}

            <div className="pt-4 border-t border-gray-100 dark:border-neutral-900">
              <button
                type="button"
                onClick={() => openAddModal(activeTab)}
                className="w-full px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black border border-gray-200 dark:border-neutral-800 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} aria-hidden /> Add {activeTab === "card" ? "Card" : activeTab === "upi" ? "UPI" : "Netbanking"}
              </button>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-neutral-900 text-xs text-gray-500">
              Stored on your server (requires auth). This UI no longer keeps sensitive values in local state.
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 p-6 bg-white dark:bg-black">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{tabs.find((t) => t.id === activeTab)?.label}</h3>
              <div className="text-sm text-gray-500">{(data[activeTab] || []).length} saved</div>
            </div>

            {loading ? <p className="text-sm text-gray-500">Loading…</p> : null}

            <RenderList
              list={data[activeTab] || []}
              type={activeTab}
              onEdit={(t, id) => openEditModal(t, id)}
              onDelete={(t, id) => handleDelete(t, id)}
              onSetDefault={(t, id) => handleSetDefault(t, id)}
            />
          </div>
        </div>
      </div>

      <FormModal
        isOpen={isModalOpen}
        initialData={modalInitial}
        onClose={closeModal}
        onSave={onModalSave}
        errorsFromParent={errors}
        uidToken={"noautocomplete-" + uidInstance.current}
      />
    </div>
  );
}
