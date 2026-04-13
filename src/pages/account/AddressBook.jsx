// src/pages/account/AddressBook.jsx
import React, { useEffect, useMemo, useReducer, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  StarOff,
  Home,
  Building2,
  MapPin,
  Phone,
  Copy,
  Check,
  X,
  Tag as TagIcon,
} from "lucide-react";

/* ---------------------------
   Lightweight UI primitives
   --------------------------- */

const cx = (...parts) => parts.filter(Boolean).join(" ");

function Button({ asChild = false, children, variant, size, className = "", ...props }) {
  const base = "inline-flex items-center justify-center rounded-lg transition shadow-sm";
  const variantMap = {
    outline: "bg-transparent border border-neutral-800 text-neutral-200",
    ghost: "bg-transparent text-neutral-200",
    destructive: "bg-red-600 text-white",
    default: "bg-neutral-100 text-neutral-900",
  };
  const sizeMap = {
    icon: "h-8 w-8 p-0",
    sm: "px-2 py-1 text-sm",
  };
  const classes = cx(base, variantMap[variant] || "", sizeMap[size] || "", className);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      className: cx(classes, children.props?.className || ""),
    });
  }
  return (
    <button {...props} className={classes}>
      {children}
    </button>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-md border border-neutral-800 px-3 py-2 focus:outline-none focus:ring-1 bg-neutral-900 text-neutral-100",
        props.className || ""
      )}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-md border border-neutral-800 px-3 py-2 focus:outline-none focus:ring-1 bg-neutral-900 text-neutral-100",
        props.className || ""
      )}
    />
  );
}

function Label({ children, className, ...props }) {
  return (
    <label {...props} className={cx("text-sm font-medium text-neutral-200", className || "")}>
      {children}
    </label>
  );
}

function Badge({ children, className = "" }) {
  return <span className={cx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", className)}>{children}</span>;
}

function Separator({ className = "" }) {
  return <div className={cx("h-px w-full bg-neutral-800", className)} />;
}

/* Simple switch */
function Switch({ id, checked = false, onCheckedChange = () => {}, className = "" }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={!!checked}
      onClick={() => onCheckedChange(!checked)}
      className={cx(
        "relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none",
        checked ? "bg-neutral-200" : "bg-neutral-800",
        className
      )}
    >
      <span
        className={cx(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-4" : "translate-x-1"
        )}
      />
    </button>
  );
}

/* Card pieces */
const Card = ({ children, className = "" }) => <div className={cx("rounded-2xl bg-neutral-950 border border-neutral-800", className)}>{children}</div>;
const CardHeader = ({ children, className = "" }) => <div className={cx("p-4 border-b border-neutral-800", className)}>{children}</div>;
const CardContent = ({ children, className = "" }) => <div className={cx("p-4", className)}>{children}</div>;
const CardFooter = ({ children, className = "" }) => <div className={cx("p-4 border-t border-neutral-800", className)}>{children}</div>;

/* Dialog */
function Dialog({ open, onOpenChange, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          onOpenChange(false);
        }}
      />
      <div className="relative z-10 w-full max-w-2xl px-4">{children}</div>
    </div>,
    document.body
  );
}
const DialogContent = ({ children, className = "" }) => (
  <div onClick={(e) => e.stopPropagation()} className={cx("rounded-2xl overflow-hidden", className)}>
    {children}
  </div>
);
const DialogHeader = ({ children }) => <div className="px-6 pt-6 pb-2">{children}</div>;
const DialogTitle = ({ children, className = "" }) => <h3 className={cx("text-xl font-semibold", className)}>{children}</h3>;
const DialogFooter = ({ children, className = "" }) => <div className={cx("px-6 py-4 flex justify-end gap-3", className)}>{children}</div>;

/* ---------------------------
   Data model (match DB)
   --------------------------- */

const API_BASE = `${process.env.REACT_APP_API_BASE}/api/addresses`; // backend port 5000
const DEFAULT_COUNTRY = "India";

/* removed demo addresses - initial LS is empty */
const LS_KEY = "addressBook:v1";
const loadLS = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.warn("Failed to load LS", e);
    return [];
  }
};
const saveLS = (data) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save LS", e);
  }
};

/* Reducer - works with server shape */
function reducer(state, action) {
  switch (action.type) {
    case "import": {
      const data = action.payload || [];
      saveLS(data);
      return data;
    }
    case "add": {
      const next = [
        {
          ...action.payload,
          id: action.payload?.id || crypto.randomUUID(),
          created_at: action.payload?.created_at || new Date().toISOString(),
        },
        ...state,
      ];
      saveLS(next);
      return next;
    }
    case "update": {
      const next = state.map((r) => (r.id === action.payload.id ? { ...r, ...action.payload } : r));
      saveLS(next);
      return next;
    }
    case "delete": {
      const next = state.filter((r) => r.id !== action.id);
      saveLS(next);
      return next;
    }
    case "setDefault": {
      const id = action.id;
      const next = state.map((r) => ({ ...r, is_default: r.id === id ? 1 : 0 }));
      saveLS(next);
      return next;
    }
    default:
      return state;
  }
}

/* Validation (uses server field names) */
function validateAddress(values) {
  const errors = {};
  if (!values.name?.trim()) errors.name = "Full name is required";
  if (!values.line1?.trim()) errors.line1 = "Address line 1 is required";
  if (!values.city?.trim()) errors.city = "City is required";
  if (!values.state?.trim()) errors.state = "State is required";
  if (!values.pincode?.trim() || !/^\d{6}$/.test(values.pincode)) errors.pincode = "PIN must be exactly 6 digits";
  if (values.phone && !/^([+]?\d[\d\s-]{7,})$/.test(values.phone)) errors.phone = "Invalid phone";
  return errors;
}

/* fmt for copying */
const fmtAddress = (a) =>
  [
    a.name ? `${a.name}` : null,
    a.line1,
    a.line2,
    `${a.city}, ${a.state} ${a.pincode}`,
    a.country,
    a.phone ? `Ph: ${a.phone}` : null,
  ]
    .filter(Boolean)
    .join("\n");

/* keyboard shortcut: Cmd/Ctrl+N to add */
function useKeyboardShortcuts({ onNew }) {
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        onNew?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNew]);
}

/* ---------------------------
   Authentication helper for fetch
   --------------------------- */

function getAuthHeaders(hasBody = false) {
  // look for common storage keys; adapt to your app if different
  const token =
    (typeof window !== "undefined" && (localStorage.getItem("token") || localStorage.getItem("authToken") || sessionStorage.getItem("token"))) || null;
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (hasBody) headers["Content-Type"] = "application/json";
  return headers;
}

/* ---------------------------
   API helpers (server-compatible payloads)
   --------------------------- */

async function fetchAddressesFromServer() {
  const res = await fetch(API_BASE, { headers: getAuthHeaders(false) });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
}
async function createAddressOnServer(payload) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: getAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
}
async function updateAddressOnServer(id, payload) {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: getAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
}
async function deleteAddressOnServer(id) {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(false),
  });
  if (!res.ok && res.status !== 204) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return true;
}

/* ---------------------------
   Indian States list (states + UTs)
   --------------------------- */
const INDIA_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // Union Territories
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

/* ---------------------------
   AddressForm (server fields)
   --------------------------- */
function AddressForm({ open, onOpenChange, initial, onSubmit }) {
  const [values, setValues] = useState({
    name: "",
    label: "home",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
    country: DEFAULT_COUNTRY,
    phone: "",
    is_default: 0,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initial) {
      setValues({
        name: initial.name || "",
        label: initial.label || "home",
        line1: initial.line1 || "",
        line2: initial.line2 || "",
        city: initial.city || "",
        state: initial.state || "",
        pincode: (initial.pincode || "").toString().replace(/\D/g, "").slice(0, 6),
        country: initial.country || DEFAULT_COUNTRY,
        phone: initial.phone || "",
        is_default: initial.is_default ? 1 : 0,
      });
    } else {
      setValues({
        name: "",
        label: "home",
        line1: "",
        line2: "",
        city: "",
        state: "",
        pincode: "",
        country: DEFAULT_COUNTRY,
        phone: "",
        is_default: 0,
      });
    }
    setErrors({});
  }, [initial, open]);

  const formatPincodeForDisplay = (digits) => {
    if (!digits) return "";
    const d = digits.replace(/\D/g, "").slice(0, 6);
    return d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3)}` : d;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "pincode") {
      // allow only digits, up to 6
      const digits = value.replace(/\D/g, "").slice(0, 6);
      setValues((v) => ({ ...v, pincode: digits }));
      return;
    }
    setValues((v) => ({ ...v, [name]: value }));
  };

  const handleStateChange = (e) => {
    setValues((v) => ({ ...v, state: e.target.value }));
  };

  const submit = async () => {
    const e = validateAddress(values);
    setErrors(e);
    if (Object.keys(e).length === 0) {
      // ensure is_default numeric 0/1
      const payload = { ...values, is_default: values.is_default ? 1 : 0 };
      setIsSubmitting(true);
      try {
        // Await parent onSubmit because it performs network requests
        await onSubmit(payload);
        onOpenChange(false);
      } catch (err) {
        // parent may throw; show basic feedback
        console.warn("Failed to submit address:", err);
        // you may want to surface a user-visible message here
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-neutral-950 text-neutral-50 border border-neutral-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{initial ? "Edit address" : "Add address"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 pb-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" value={values.name} onChange={handleInputChange} placeholder="Recipient full name" />
            {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <div className="flex gap-2">
              {[
                { key: "home", name: "Home", icon: Home },
                { key: "work", name: "Work", icon: Building2 },
                { key: "other", name: "Other", icon: TagIcon },
              ].map((l) => {
                const Icon = l.icon;
                const active = values.label === l.key;
                return (
                  <Button
                    key={l.key}
                    type="button"
                    variant={active ? "default" : "outline"}
                    onClick={() => setValues((v) => ({ ...v, label: l.key }))}
                    className={
                      "h-9 px-3 rounded-2xl border-neutral-800 " +
                      (active ? "bg-neutral-200 text-neutral-900 hover:bg-neutral-300" : "bg-neutral-950 text-neutral-200 hover:bg-neutral-900")
                    }
                  >
                    <Icon className="mr-2 h-4 w-4" /> {l.name}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="line1">Address line 1</Label>
            <Input id="line1" name="line1" value={values.line1} onChange={handleInputChange} placeholder="House / Flat / Street" />
            {errors.line1 && <p className="text-xs text-red-400">{errors.line1}</p>}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="line2">Address line 2 (optional)</Label>
            <Input id="line2" name="line2" value={values.line2} onChange={handleInputChange} placeholder="Landmark / Area" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" value={values.city} onChange={handleInputChange} />
            {errors.city && <p className="text-xs text-red-400">{errors.city}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select id="state" name="state" value={values.state} onChange={handleStateChange}>
              <option value="">Select state</option>
              {INDIA_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            {errors.state && <p className="text-xs text-red-400">{errors.state}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pincode">PIN / ZIP</Label>
            <Input
              id="pincode"
              name="pincode"
              value={formatPincodeForDisplay(values.pincode)}
              onChange={handleInputChange}
              placeholder="123 456"
              inputMode="numeric"
            />
            {errors.pincode && <p className="text-xs text-red-400">{errors.pincode}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" value={values.country} onChange={handleInputChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" name="phone" value={values.phone} onChange={handleInputChange} placeholder="+91 98765 43210" />
            {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
          </div>

          <Separator className="sm:col-span-2 bg-neutral-800" />

          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch id="is_default" checked={!!values.is_default} onCheckedChange={(c) => setValues((v) => ({ ...v, is_default: c ? 1 : 0 }))} />
            <Label htmlFor="is_default" className="cursor-pointer">Set as default</Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-neutral-700 text-neutral-200 hover:bg-neutral-900 px-6 py-3 text-base"
            disabled={isSubmitting}
          >
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isSubmitting} className="bg-neutral-100 text-neutral-900 hover:bg-white px-6 py-3 text-base">
            <Check className="mr-2 h-4 w-4" /> {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------
   Address Card
   --------------------------- */

const LABELS = [
  { key: "home", icon: Home },
  { key: "work", icon: Building2 },
  { key: "other", icon: TagIcon },
];

function AddressCard({ a, onEdit, onDelete, onSetDefault }) {
  const Icon = LABELS.find((l) => l.key === a.label)?.icon ?? Home;
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <Card className="group relative bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden transition-shadow">
        <CardHeader className="flex flex-row items-start justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium border border-neutral-700 text-neutral-200 bg-neutral-900">
              <Icon className="h-3.5 w-3.5" /> {a.label?.charAt(0)?.toUpperCase() + a.label?.slice(1)}
            </span>
            {a.is_default === 1 ? <Badge className="bg-neutral-200 text-neutral-900 ml-2">Default</Badge> : null}
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          <div className="space-y-2 text-sm text-neutral-300">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5" />
              <div className="whitespace-pre-wrap leading-6 text-neutral-100">
                {/* show the name if present */}
                {a.name ? `${a.name}\n` : ""}
                {a.line1}
                {a.line2 ? `\n${a.line2}` : ""}
                {`\n${a.city}, ${a.state} ${a.pincode}`}
                {`\n${a.country}`}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> <span className="text-neutral-200">{a.phone || "—"}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="px-4 pb-4">
          <div className="flex items-center gap-2 w-full">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(fmtAddress(a));
                  } catch {}
                }}
                className="border-neutral-700 text-neutral-200 hover:bg-neutral-900"
              >
                <Copy className="mr-2 h-4 w-4" /> Copy
              </Button>

              <Button variant="outline" size="sm" onClick={() => onEdit?.(a)} className="border-neutral-700 text-neutral-200 hover:bg-neutral-900">
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>

              <Button variant="outline" size="sm" onClick={() => onDelete?.(a.id)} className="border-neutral-700 text-neutral-200 hover:bg-neutral-900">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>

            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetDefault?.(a.id)}
                className="text-neutral-200 hover:bg-neutral-900"
                title="Set as default"
              >
                {a.is_default === 1 ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

/* ---------------------------
   Toolbar
   --------------------------- */
function Toolbar({ onNew }) {
  return (
    <div className="flex items-center justify-end gap-2 mb-4">
      <Button onClick={onNew} className="bg-neutral-100 text-neutral-900 hover:bg-white px-4 py-2">
        <Plus className="mr-2 h-4 w-4" /> Add Address
      </Button>
    </div>
  );
}

/* ---------------------------
   Main component
   --------------------------- */
export default function AddressBook() {
  const [addresses, dispatch] = useReducer(reducer, [], loadLS);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useKeyboardShortcuts({
    onNew: () => {
      setEditing(null);
      setFormOpen(true);
    },
  });

  // Load from server on mount (if available)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const serverData = await fetchAddressesFromServer();
        if (mounted && Array.isArray(serverData)) {
          dispatch({ type: "import", payload: serverData });
        }
      } catch (e) {
        // server not available — keep LS data
        console.warn("Could not load addresses from server, using local data");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    setFormOpen(true);
  };

  // Save handler: sends server-shaped payloads (includes name)
  const handleSave = async (values) => {
    // ensure pincode is 6-digit string without spaces
    const payload = {
      ...values,
      pincode: (values.pincode || "").toString().replace(/\D/g, "").slice(0, 6),
      is_default: values.is_default ? 1 : 0,
    };

    if (editing) {
      try {
        const updated = await updateAddressOnServer(editing.id, payload);
        dispatch({ type: "update", payload: updated });
        return updated;
      } catch (e) {
        // fallback: update locally
        dispatch({ type: "update", payload: { id: editing.id, ...payload } });
        throw e;
      } finally {
        setEditing(null);
      }
    } else {
      try {
        const created = await createAddressOnServer(payload);
        dispatch({ type: "add", payload: created });
        return created;
      } catch (e) {
        // fallback: local add
        dispatch({ type: "add", payload });
        throw e;
      }
    }
  };

  const handleDelete = async (id) => {
    // optimistic local delete
    dispatch({ type: "delete", id });
    try {
      await deleteAddressOnServer(id);
    } catch (e) {
      console.warn("delete failed on server for id", id);
    }
  };

  const handleSetDefault = async (id) => {
    // optimistic local
    dispatch({ type: "setDefault", id });
    try {
      // find full address locally to send full payload (backend may expect full fields)
      const addr = addresses.find((x) => x.id === id);
      if (!addr) return;
      const payload = { ...addr, is_default: 1, pincode: (addr.pincode || "").toString().replace(/\D/g, "").slice(0, 6) };
      await updateAddressOnServer(id, payload);

      // re-sync authoritative server data if available
      try {
        const serverData = await fetchAddressesFromServer();
        if (Array.isArray(serverData)) dispatch({ type: "import", payload: serverData });
      } catch {}
    } catch (e) {
      console.warn("set default failed on server", e);
    }
  };

  const list = useMemo(() => addresses, [addresses]);

 return (
  <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 text-gray-900 dark:text-gray-100 transition-colors duration-300">
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          Address Book
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage shipping addresses. Stored locally and synced to your API when available (port 5000).
        </p>
      </div>
    </div>

   <Toolbar onNew={openNew} /> <Separator className="my-4 bg-neutral-800" /> {list.length === 0 ? ( <div className="rounded-2xl border border-neutral-800 p-10 text-center bg-neutral-950">
     <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-neutral-800 mb-4"> 
       <MapPin className="h-6 w-6 text-neutral-400" />
     </div> 
     <p className="text-neutral-300">No addresses yet.</p> 
     <Button onClick={openNew} className="mt-4 bg-neutral-100 text-neutral-900 hover:bg-white px-4 py-2">
       <Plus className="mr-2 h-4 w-4" /> Add Address </Button>
   </div> ) : ( <AnimatePresence mode="popLayout"> <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> {list.map((a) => ( <AddressCard key={a.id} a={a} onEdit={openEdit} onDelete={handleDelete} onSetDefault={handleSetDefault} /> ))} </div> </AnimatePresence> )} 
    <AddressForm open={formOpen} onOpenChange={setFormOpen} initial={editing} onSubmit={handleSave} /> </div> ); }
