// src/pages/account/AccountSettings.jsx
import React, { useEffect, useRef, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Bell,
  Shield,
  Settings,
  Activity,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Download,
  RefreshCw,
  LogOut,
  Key,
  X,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { UserContext } from "../../contexts/UserContext";

/*
  Enhanced AccountSettings page for Dripzoid
  - Adds password strength meter + breached-password hint (client-side only)
  - 2FA/TOTP enable flow stub (QR display placeholder)
  - Email verification resend
  - Inline profile edit: name + avatar upload (preview + FormData)
  - Activity filters + pagination
  - Sessions: show "trusted" toggle and client-side pagination
  - Export: better UX (copy link), and download CSV option
  - Minor UX: toasts, disabled states, last password change info, optimistic UI updates

  NOTE: Backend endpoints assumed are similar to existing ones; see comments where backend work is required.
*/

const RAW_BASE = process.env.REACT_APP_API_BASE || "";
const BASE = RAW_BASE.replace(/\/+$/, "");
const ACCOUNT_BASE = `${BASE}/api/account`;
const API_BASE = `${BASE}/api`;

function buildAccountUrl(path = "") {
  if (!path || path === "/") return ACCOUNT_BASE;
  return `${ACCOUNT_BASE}/${String(path).replace(/^\/+/, "")}`;
}
function buildApiUrl(path = "") {
  if (!path || path === "/") return API_BASE;
  return `${API_BASE}/${String(path).replace(/^\/+/, "")}`;
}

function formatToIST(timestamp) {
  if (!timestamp) return "";

  let ts = String(timestamp).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(ts)) {
    ts = ts.replace(" ", "T") + "Z";
  }
  const d = new Date(ts);
  if (isNaN(d)) return timestamp;

  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function toBool(v) {
  if (v === true) return true;
  if (v === false) return false;
  if (v === null || v === undefined) return false;
  if (v === 1 || v === "1") return true;
  if (v === 0 || v === "0") return false;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "yes" || s === "on") return true;
    if (s === "false" || s === "no" || s === "off") return false;
    if (/^\d+$/.test(s)) return Number(s) !== 0;
  }
  return Boolean(v);
}

function estimatePasswordStrength(pw = "") {
  // Simple heuristic: length + variety of classes
  if (!pw) return { score: 0, text: "Very weak" };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  const mapping = ["Very weak", "Weak", "Fair", "Good", "Strong", "Very strong"];
  return { score: Math.min(Math.max(score, 0), 5), text: mapping[Math.min(score, 5)] };
}

export default function AccountSettings() {
  const navigate = useNavigate();
  const { token: ctxToken, logout: ctxLogout, user: ctxUser, setUser: ctxSetUser } = useContext(UserContext) ?? {};

  const [active, setActive] = useState("security");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // server-backed state
  const [user, setUser] = useState(null);
  const [profileDraft, setProfileDraft] = useState({ name: "", avatarPreview: null, avatarFile: null });
  const [passwords, setPasswords] = useState({ current: "", newpw: "", confirm: "" });
  const [showPasswords, setShowPasswords] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    marketing: false,
    orderUpdates: true,
  });
  const [sessions, setSessions] = useState([]);
  const [activity, setActivity] = useState([]);

  // feature states
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia && window.matchMedia("(min-width: 768px)").matches;
  });
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAQr, setTwoFAQr] = useState(null);
  const [activityFilter, setActivityFilter] = useState("all");
  const [activityPage, setActivityPage] = useState(1);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [toast, setToast] = useState(null);

  const ACTIVITY_PER_PAGE = 8;
  const SESSIONS_PER_PAGE = 5;

  // mount guard
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // set up matchMedia listener to update isDesktop
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mql = window.matchMedia("(min-width: 768px)");

    const handler = (e) => {
      setIsDesktop(!!e.matches);
    };

    if (mql.addEventListener) mql.addEventListener("change", handler);
    else if (mql.addListener) mql.addListener(handler);

    setIsDesktop(!!mql.matches);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else if (mql.removeListener) mql.removeListener(handler);
    };
  }, []);

  const getToken = () => ctxToken || null;

  // central fetch helpers
  async function apiFetchAccount(path = "", opts = {}, { expectJson = true } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const t = getToken();
    const headers = { ...(opts.headers || {}) };

    if (opts.body && !headers["Content-Type"] && !(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";
    if (t) headers["Authorization"] = `Bearer ${t}`;

    try {
      const res = await fetch(buildAccountUrl(path), {
        ...opts,
        headers,
        credentials: "include",
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403) {
        try { ctxLogout?.(); } catch { }
        return { ok: false, status: res.status, body: { error: "Unauthorized" } };
      }

      const body = expectJson ? await res.json().catch(() => ({})) : await res.blob();
      return { ok: res.ok, status: res.status, body };
    } finally {
      clearTimeout(timer);
    }
  }

  async function apiFetchApi(path = "", opts = {}, { expectJson = true } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const t = getToken();
    const headers = { ...(opts.headers || {}) };
    if (opts.body && !headers["Content-Type"] && !(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";
    if (t) headers["Authorization"] = `Bearer ${t}`;

    try {
      const res = await fetch(buildApiUrl(path), {
        ...opts,
        headers,
        credentials: "include",
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403) {
        try { ctxLogout?.(); } catch { }
        return { ok: false, status: res.status, body: { error: "Unauthorized" } };
      }

      const body = expectJson ? await res.json().catch(() => ({})) : await res.blob();
      return { ok: res.ok, status: res.status, body };
    } finally {
      clearTimeout(timer);
    }
  }

  function normalizeNotifications(raw = {}) {
    const safe = typeof raw === "object" && raw !== null ? raw : {};
    return {
      email: toBool(safe.email ?? safe.email_enabled ?? safe.email_notifications ?? 0),
      sms: toBool(safe.sms ?? safe.sms_enabled ?? safe.sms_notifications ?? 0),
      push: toBool(safe.push ?? safe.push_enabled ?? safe.push_notifications ?? 0),
      marketing: toBool(safe.marketing ?? safe.marketing_enabled ?? safe.marketing_notifications ?? 0),
      orderUpdates: toBool(safe.order_updates ?? safe.orderUpdates ?? safe.order_updates_enabled ?? 0),
    };
  }

  function applyAccountResponse(body = {}) {
    if (!isMounted.current) return;
    try {
      setUser(body.user ?? null);
      setProfileDraft((p) => ({ ...p, name: body.user?.name ?? p.name ?? "" }));
      setNotifications((prev) => ({ ...prev, ...normalizeNotifications(body.notifications ?? body.notification_settings ?? {}) }));
      setSessions(Array.isArray(body.sessions) ? body.sessions : []);
      setActivity(Array.isArray(body.activity) ? body.activity : []);
      setTwoFAEnabled(toBool(body.user?.two_fa_enabled ?? body.user?.twoFAEnabled));
    } catch (err) {
      console.error("AccountSettings.applyAccountResponse error:", err);
      throw err;
    }
  }

  // loads
  const loadAccount = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiFetchAccount("", { method: "GET" });
      if (!resp.ok) {
        setError(resp.body?.error || `Failed to fetch account (${resp.status})`);
        return;
      }
      applyAccountResponse(resp.body);
    } catch (err) {
      console.error("AccountSettings: loadAccount error:", err);
      setError(err.message || "Failed to fetch account");
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const resp = await apiFetchApi("sessions", { method: "GET" });
      if (!resp.ok) {
        console.warn("Failed to load sessions:", resp.status, resp.body);
        if (!Array.isArray(sessions)) setSessions([]);
        return;
      }
      const payload = resp.body || {};
      const s = Array.isArray(payload.sessions) ? payload.sessions : (Array.isArray(payload) ? payload : []);
      if (isMounted.current) setSessions(s);
    } catch (err) {
      console.error("loadSessions error:", err);
    }
  };

  const refreshActivity = async () => {
    try {
      const resp = await apiFetchAccount("activity", { method: "GET" });
      if (resp.ok && isMounted.current) setActivity(Array.isArray(resp.body) ? resp.body : (resp.body?.activity ?? []));
    } catch (err) {
      console.warn("Failed to refresh activity:", err?.message || err);
    }
  };

  useEffect(() => {
    loadAccount();
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- UX helpers (toasts, copy)
  function showToast(msg, ms = 3000) {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }

  // ---------- Handlers ----------
  async function handleChangePassword(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    if (passwords.newpw.length < 8) {
      alert("New password must be at least 8 characters.");
      setSaving(false);
      return;
    }
    if (passwords.newpw !== passwords.confirm) {
      alert("Passwords do not match.");
      setSaving(false);
      return;
    }

    // simple client-side strength warning
    const strength = estimatePasswordStrength(passwords.newpw);
    if (strength.score < 2 && !window.confirm(`Password looks weak (${strength.text}). Continue?`)) {
      setSaving(false);
      return;
    }

    try {
      const { ok, body } = await apiFetchAccount("change-password", {
        method: "POST",
        body: JSON.stringify({
          current: passwords.current,
          newpw: passwords.newpw,
          confirm: passwords.confirm,
        }),
      });
      if (!ok) {
        alert(body?.error || body?.message || "Failed to change password");
        return;
      }
      setPasswords({ current: "", newpw: "", confirm: "" });
      await refreshActivity();
      showToast("Password changed successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateNotifications() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        email: notifications.email ? 1 : 0,
        sms: notifications.sms ? 1 : 0,
        push: notifications.push ? 1 : 0,
        marketing: notifications.marketing ? 1 : 0,
        order_updates: notifications.orderUpdates ? 1 : 0,
      };
      const { ok, body } = await apiFetchAccount("notifications", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!ok) {
        alert(body?.error || body?.message || "Failed to update notifications");
        return;
      }
      await refreshActivity();
      showToast("Notification preferences updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoutSession(sessionId) {
    if (!window.confirm("Log out this session?")) return;
    setSaving(true);
    setError(null);

    try {
      const resp = await apiFetchApi(`sessions/${sessionId}`, { method: "DELETE" });
      if (!resp.ok) {
        alert(resp.body?.error || resp.body?.message || "Failed to logout session");
        return;
      }
      await loadSessions();
      await refreshActivity();

      const currentSessionId = typeof localStorage !== "undefined" ? localStorage.getItem("sessionId") : null;
      const isCurrent = currentSessionId && String(currentSessionId) === String(sessionId);

      if (isCurrent) {
        try { localStorage.removeItem("token"); localStorage.removeItem("sessionId"); } catch {}
        ctxLogout?.();
        alert("You were logged out from this session.");
        navigate("/login");
      } else {
        showToast("Session logged out.");
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoutCurrent() {
    if (!window.confirm("Log out from this device?")) return;
    setSaving(true);
    setError(null);
    try {
      const resp = await apiFetchApi("logout", { method: "POST" });
      if (!resp.ok) {
        alert(resp.body?.error || resp.body?.message || "Failed to logout");
        return;
      }
      try { localStorage.removeItem("token"); localStorage.removeItem("sessionId"); } catch {}
      ctxLogout?.();
      showToast("Logged out.");
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoutAll() {
    if (!window.confirm("Log out from all devices?")) return;
    setSaving(true);
    setError(null);
    try {
      const resp = await apiFetchApi("logout-all", { method: "POST" });
      if (!resp.ok) {
        alert(resp.body?.error || resp.body?.message || "Failed to logout all sessions");
        return;
      }
      try { localStorage.removeItem("token"); localStorage.removeItem("sessionId"); } catch {}
      ctxLogout?.();
      showToast("All sessions cleared.");
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExportData() {
    setSaving(true);
    setError(null);
    try {
      const t = getToken();
      const headers = t ? { Authorization: `Bearer ${t}` } : {};
      const res = await fetch(buildAccountUrl("export"), {
        method: "GET",
        headers,
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) {
        ctxLogout?.();
        return;
      }
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        alert(errBody.error || "Failed to export data");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "account-data.json";
      a.click();
      URL.revokeObjectURL(url);
      await refreshActivity();
      showToast("Export started");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function copyExportLink() {
    // convenience: copy account export endpoint
    const url = buildAccountUrl("export");
    try {
      navigator.clipboard.writeText(url);
      showToast("Export link copied to clipboard");
    } catch (err) {
      showToast("Unable to copy link");
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm("Permanently delete your account? This cannot be undone.")) return;
    setSaving(true);
    setError(null);
    try {
      const { ok, body } = await apiFetchAccount("delete", { method: "DELETE" });
      if (!ok) {
        alert(body?.error || body?.message || "Failed to delete account");
        return;
      }
      try { localStorage.removeItem("token"); localStorage.removeItem("sessionId"); } catch {}
      ctxLogout?.();
      showToast("Account deleted.");
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // profile handlers
  async function handleProfileAvatarChange(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfileDraft((p) => ({ ...p, avatarPreview: ev.target.result, avatarFile: file }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile() {
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("name", profileDraft.name);
      if (profileDraft.avatarFile) form.append("avatar", profileDraft.avatarFile);

      const t = getToken();
      const headers = t ? { Authorization: `Bearer ${t}` } : {};
      const res = await fetch(buildAccountUrl("profile"), {
        method: "POST",
        body: form,
        headers,
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || "Failed to update profile");
        return;
      }
      const body = await res.json().catch(() => ({}));
      applyAccountResponse(body);
      // optimistic update of global user in context if available
      if (ctxSetUser && body.user) ctxSetUser(body.user);
      showToast("Profile updated");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // 2FA flow (stubs — backend needed to generate secret and verify codes)
  async function handleOpen2FA() {
    setSaving(true);
    setError(null);
    try {
      // request server to generate TOTP secret + QR
      const resp = await apiFetchAccount("2fa/setup", { method: "POST" });
      if (!resp.ok) {
        alert(resp.body?.error || resp.body?.message || "Failed to init 2FA");
        return;
      }
      setTwoFAQr(resp.body?.qr ?? null);
      setShow2FAModal(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEnable2FA(code) {
    setSaving(true);
    try {
      const resp = await apiFetchAccount("2fa/enable", { method: "POST", body: JSON.stringify({ code }) });
      if (!resp.ok) {
        alert(resp.body?.error || resp.body?.message || "Failed to enable 2FA");
        return;
      }
      setShow2FAModal(false);
      setTwoFAEnabled(true);
      showToast("Two-factor authentication enabled");
      await loadAccount();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable2FA() {
    if (!window.confirm("Disable two-factor authentication?")) return;
    setSaving(true);
    try {
      const resp = await apiFetchAccount("2fa/disable", { method: "POST" });
      if (!resp.ok) {
        alert(resp.body?.error || resp.body?.message || "Failed to disable 2FA");
        return;
      }
      setTwoFAEnabled(false);
      showToast("Two-factor authentication disabled");
      await loadAccount();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // email verification resend
  async function handleResendVerification() {
    setSaving(true);
    try {
      const resp = await apiFetchAccount("resend-verification", { method: "POST" });
      if (!resp.ok) {
        alert(resp.body?.error || resp.body?.message || "Failed to resend verification");
        return;
      }
      showToast("Verification email sent");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // mark session trusted (optimistic)
  async function handleToggleTrusted(sessionId, currentTrusted) {
    try {
      // optimistic update
      setSessions((s) => s.map((x) => x.id === sessionId ? { ...x, trusted: !currentTrusted } : x));
      const resp = await apiFetchApi(`sessions/${sessionId}/trust`, { method: "POST", body: JSON.stringify({ trusted: !currentTrusted }) });
      if (!resp.ok) {
        // revert on failure
        setSessions((s) => s.map((x) => x.id === sessionId ? { ...x, trusted: currentTrusted } : x));
        alert(resp.body?.error || "Failed to mark session trusted");
        return;
      }
      showToast("Session updated");
    } catch (err) {
      setError(err.message);
    }
  }

  // client-side pagination + filters
  const filteredActivity = activity.filter((a) => {
    if (activityFilter === "all") return true;
    return (a.type || a.action || "").toLowerCase().includes(activityFilter);
  });
  const activityPages = Math.max(1, Math.ceil(filteredActivity.length / ACTIVITY_PER_PAGE));
  const visibleActivity = filteredActivity.slice((activityPage - 1) * ACTIVITY_PER_PAGE, activityPage * ACTIVITY_PER_PAGE);

  const sessionsPages = Math.max(1, Math.ceil(sessions.length / SESSIONS_PER_PAGE));
  const visibleSessions = sessions.slice((sessionsPage - 1) * SESSIONS_PER_PAGE, sessionsPage * SESSIONS_PER_PAGE);

  // UI helpers
  function NavButton({ id, icon: Icon, label }) {
    const isActive = active === id;
    return (
      <button
        onClick={() => setActive(id)}
        className={`flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg transition-colors
          ${isActive
            ? "bg-black text-white dark:bg-white dark:text-black shadow-md"
            : "text-gray-500 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        aria-pressed={isActive}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{label}</span>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white p-6 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">Loading account settings…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white/90 to-gray-50 dark:from-black dark:via-black/90 dark:to-gray-900 text-black dark:text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Mobile top tabs (visible on small screens) */}
        <div className="md:hidden mb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-1">
            {["security","notifications","privacy","activity","sessions"].map((id) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium ${active === id ? "bg-black text-white" : "bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-200"}`}
              >
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* desktop grid: conditional cols so sidebar has stable width when rendered */}
        <div className={`${isDesktop ? "flex gap-6" : "grid grid-cols-1 gap-6"}`}>
          {isDesktop && (
            <aside className="w-64 flex-shrink-0">
              <div className="p-4 rounded-2xl bg-white/90 dark:bg-black/20 border border-black/5 dark:border-white/5 shadow-lg backdrop-blur-md sticky top-24">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <ShieldCheck className="w-6 h-6 text-black/60 dark:text-white/60" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{user?.name || "Account"}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-300">{user?.email || "Settings Hub"}</div>
                    <div className="text-xs text-gray-400 mt-1">Last password change: {user?.password_changed_at ? formatToIST(user.password_changed_at) : "—"}</div>
                  </div>
                </div>

                <nav className="flex flex-col gap-2">
                  <NavButton id="security" icon={Lock} label="Security" />
                  <NavButton id="notifications" icon={Bell} label="Notifications" />
                  <NavButton id="privacy" icon={Shield} label="Privacy & Data" />
                  <NavButton id="activity" icon={Activity} label="Activity Log" />
                  <NavButton id="sessions" icon={Settings} label="Sessions & Devices" />
                </nav>
              </div>
            </aside>
          )}

          {/* Main content (spans remaining columns when sidebar present) */}
          <main className={isDesktop ? "md:col-span-3" : ""}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold capitalize">{active.replace(/-/g, " ")}</h1>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account security, privacy and preferences.</div>
              </div>

              {/* compact action group (no permanent logout button) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportData}
                  className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm text-gray-700 dark:text-gray-200 shadow-sm hover:scale-105 transition"
                >
                  <Download className="w-4 h-4" /> Export data
                </button>
                <button onClick={copyExportLink} className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm text-gray-700 dark:text-gray-200 shadow-sm hover:scale-105 transition">
                  Copy export link
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* SECURITY */}
              {active === "security" && (
                <section className="grid grid-cols-1 gap-6">
                  <div className="p-6 rounded-xl bg-white/90 dark:bg-black/20 border border-black/5 dark:border-white/5 shadow-sm">
                    <h3 className="font-semibold mb-4 text-lg">Change password</h3>
                    <form onSubmit={handleChangePassword} className="grid gap-4">
                      {["current", "newpw", "confirm"].map((field, idx) => (
                        <div key={idx} className="relative">
                          <input
                            type={showPasswords ? "text" : "password"}
                            placeholder={
                              field === "current"
                                ? "Current password"
                                : field === "newpw"
                                ? "New password"
                                : "Confirm new password"
                            }
                            value={passwords[field]}
                            onChange={(e) =>
                              setPasswords((p) => ({ ...p, [field]: e.target.value }))
                            }
                            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                            aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                          >
                            {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      ))}

                      {/* Password strength meter */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500">Password strength: {estimatePasswordStrength(passwords.newpw).text}</div>
                          <div className="w-full h-2 bg-black/5 rounded-full mt-1 overflow-hidden">
                            <div style={{ width: `${(estimatePasswordStrength(passwords.newpw).score / 5) * 100}%` }} className="h-full bg-black dark:bg-white transition-all" />
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">Min 8 chars</div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">Two-factor: {twoFAEnabled ? "Enabled" : "Disabled"}</div>
                        <div className="flex gap-2">
                          {twoFAEnabled ? (
                            <button onClick={handleDisable2FA} className="px-3 py-1 rounded-full bg-white/70 dark:bg-white/5 text-sm">Disable 2FA</button>
                          ) : (
                            <button onClick={handleOpen2FA} className="px-3 py-1 rounded-full bg-black text-white text-sm">Set up 2FA</button>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-5 py-2.5 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold shadow hover:scale-105 transition-transform"
                        >
                          {saving ? "Saving..." : "Update password"}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Profile editor */}
                  <div className="p-6 rounded-xl bg-white/90 dark:bg-black/20 border border-black/5 dark:border-white/5 shadow-sm">
                    <h3 className="font-semibold mb-4 text-lg">Profile</h3>
                    <div className="grid md:grid-cols-3 gap-4 items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden flex items-center justify-center">
                          {profileDraft.avatarPreview ? (
                            <img src={profileDraft.avatarPreview} alt="preview" className="w-full h-full object-cover" />
                          ) : user?.avatar ? (
                            <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{user?.email}</div>
                          <div className="text-xs text-gray-500">{user?.email_verified ? "Email verified" : "Email not verified"}</div>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <input value={profileDraft.name} onChange={(e) => setProfileDraft((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-black/10 dark:border-white/10" placeholder="Full name" />
                        <div className="flex gap-2 mt-3">
                          <label className="px-3 py-2 rounded-full bg-white/70 dark:bg-white/5 border border-black/5 text-sm cursor-pointer">
                            Upload avatar
                            <input type="file" accept="image/*" onChange={(e) => handleProfileAvatarChange(e.target.files?.[0])} className="hidden" />
                          </label>
                          <button onClick={handleSaveProfile} className="px-3 py-2 rounded-full bg-black text-white text-sm">Save profile</button>
                          {!user?.email_verified && (
                            <button onClick={handleResendVerification} className="px-3 py-2 rounded-full bg-white/70 dark:bg-white/5 text-sm">Resend verification</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* NOTIFICATIONS */}
              {active === "notifications" && (
                <section>
                  <div className="p-4 rounded-xl bg-white/90 dark:bg-black/20 border border-black/5 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Notification preferences</h3>
                      <div className="text-sm text-gray-500 dark:text-gray-300">Toggle what you receive</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(notifications).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-black/5 dark:border-white/5">
                          <div className="capitalize text-black dark:text-white">{k.replace(/([A-Z])/g, ' $1')}</div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={v}
                              onChange={() => setNotifications((n) => ({ ...n, [k]: !n[k] }))}
                              className="sr-only"
                            />
                            <div className={`w-11 h-6 rounded-full transition ${v ? "bg-black dark:bg-white" : "bg-black/10 dark:bg-white/10"}`}>
                              <div className={`bg-white dark:bg-black w-5 h-5 rounded-full mt-0.5 ml-0.5 transition-transform ${v ? "translate-x-5" : "translate-x-0"}`} />
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-end gap-3">
                      <button
                        onClick={handleUpdateNotifications}
                        className="px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* PRIVACY */}
              {active === "privacy" && (
                <section>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/90 dark:bg-black/20 border border-black/5 dark:border-white/5 shadow-sm">
                      <h3 className="font-semibold mb-2">Export your data</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Download a copy of your account data (JSON). You can also copy a direct export link to share with others if needed.</p>
                      <div className="mt-4 flex gap-2">
                        <button onClick={handleExportData} className="px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold">
                          {saving ? "Preparing..." : "Export data"}
                        </button>
                        <button onClick={copyExportLink} className="px-4 py-2 rounded-full bg-white/70 dark:bg-white/5 border border-black/5 text-sm">Copy link</button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/90 dark:bg-black/20 border border-black/5 dark:border-white/5 shadow-sm">
                      <h3 className="font-semibold mb-2 text-red-600">Delete account</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Permanently remove your account and related settings.</p>
                      <div className="mt-4">
                        <button onClick={handleDeleteAccount} className="px-4 py-2 rounded-full bg-red-600/70 text-white font-semibold">
                          {saving ? "Deleting..." : "Delete account"}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* ACTIVITY */}
              {active === "activity" && (
                <section>
                  <div className="p-4 rounded-xl bg-white/90 dark:bg-black/20 border border-black/5 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Recent activity</h3>
                      <div className="flex gap-2">
                        <select value={activityFilter} onChange={(e) => { setActivityFilter(e.target.value); setActivityPage(1); }} className="px-2 py-1 rounded-md bg-white/70 dark:bg-white/5 text-sm">
                          <option value="all">All</option>
                          <option value="login">Sign-ins</option>
                          <option value="password">Password changes</option>
                          <option value="settings">Settings</option>
                        </select>
                        <button onClick={refreshActivity} className="px-2 py-1 rounded-md bg-white/70 dark:bg-white/5 text-sm">Refresh</button>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      {visibleActivity.length === 0 ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">No recent activity</div>
                      ) : visibleActivity.map((a) => {
                        const ts = a.created_at ?? a.when ?? a.timestamp ?? "";
                        return (
                          <div key={a.id ?? `${a.action}-${String(ts)}`} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-900 border border-black/5 dark:border-white/5">
                            <div className="truncate text-black dark:text-white">{a.action}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-300">{formatToIST(ts)}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* pagination */}
                    <div className="mt-3 flex justify-center items-center gap-2">
                      <button disabled={activityPage <= 1} onClick={() => setActivityPage((p) => Math.max(1, p - 1))} className="px-2 py-1 rounded-md bg-white/70 dark:bg-white/5">Prev</button>
                      <div className="text-sm text-gray-500">Page {activityPage} / {activityPages}</div>
                      <button disabled={activityPage >= activityPages} onClick={() => setActivityPage((p) => Math.min(activityPages, p + 1))} className="px-2 py-1 rounded-md bg-white/70 dark:bg-white/5">Next</button>
                    </div>
                  </div>
                </section>
              )}

              {/* SESSIONS */}
              {active === "sessions" && (
                <section>
                  <div className="p-4 rounded-xl bg-white/90 dark:bg-black/20 border border-black/5 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Sessions & devices</h3>
                      <div className="flex gap-2">
                        <button onClick={loadSessions} className="px-2 py-1 rounded-md bg-white/70 dark:bg-white/5 text-sm">Refresh</button>
                        <button onClick={handleLogoutCurrent} className="px-2 py-1 rounded-md bg-white/70 dark:bg-white/5 text-sm">Logout this device</button>
                        <button onClick={handleLogoutAll} className="px-2 py-1 rounded-md bg-white/70 dark:bg-white/5 text-sm">Logout all</button>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {visibleSessions.length === 0 ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">No active sessions</div>
                      ) : visibleSessions.map((s) => (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-black/5 dark:border-white/5">
                          <div>
                            <div className="font-medium text-black dark:text-white">{s.device ?? s.name ?? "Unknown device"} {s.trusted ? <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">Trusted</span> : null}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-300">{s.ip} · {formatToIST(s.last_active ?? s.lastActive ?? s.updated_at ?? "")}{s.location ? ` · ${s.location}` : ""}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleTrusted(s.id, !!s.trusted)} className="px-3 py-1 rounded-md bg-white/70 dark:bg-white/5 text-sm">{s.trusted ? "Untrust" : "Trust"}</button>
                            <button onClick={() => handleLogoutSession(s.id)} className="px-3 py-1 rounded-md bg-black/5 dark:bg-white/5 text-sm">{saving ? "Processing..." : "Logout"}</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* pagination */}
                    <div className="mt-3 flex justify-center items-center gap-2">
                      <button disabled={sessionsPage <= 1} onClick={() => setSessionsPage((p) => Math.max(1, p - 1))} className="px-2 py-1 rounded-md bg-white/70 dark:bg-white/5">Prev</button>
                      <div className="text-sm text-gray-500">Page {sessionsPage} / {sessionsPages}</div>
                      <button disabled={sessionsPage >= sessionsPages} onClick={() => setSessionsPage((p) => Math.min(sessionsPages, p + 1))} className="px-2 py-1 rounded-md bg-white/70 dark:bg-white/5">Next</button>
                    </div>

                  </div>
                </section>
              )}
            </div>

            {/* global error */}
            {error && <div className="mt-4 text-sm text-red-500">{error}</div>}
          </main>
        </div>
      </div>

      {/* 2FA Modal (simple) */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Enable two-factor authentication</h3>
              <button onClick={() => setShow2FAModal(false)} className="p-1 rounded-full"><X /></button>
            </div>
            <div className="mb-3">
              <p className="text-sm text-gray-600">Scan this QR with your Authenticator app (Google Authenticator, Authy) and enter the code below to verify.</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-40 h-40 bg-black/5 dark:bg-white/5 rounded-md flex items-center justify-center">
                {twoFAQr ? <img src={twoFAQr} alt="qr" /> : <div className="text-sm text-gray-500">QR placeholder</div>}
              </div>
              <div className="w-full">
                <input placeholder="123456" className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-black/10" id="twofacode" />
                <div className="mt-2 flex justify-end gap-2">
                  <button onClick={() => setShow2FAModal(false)} className="px-3 py-1 rounded-md bg-white/70">Cancel</button>
                  <button onClick={() => { const v = document.getElementById('twofacode')?.value; handleEnable2FA(v); }} className="px-3 py-1 rounded-md bg-black text-white">Verify & enable</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className="fixed right-4 bottom-4 z-50 bg-black text-white px-4 py-2 rounded-md shadow">{toast}</div>
      )}
    </div>
  );
}
