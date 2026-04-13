// src/components/RegisterWithOtp.jsx
import React, { useEffect, useState, useRef } from "react";

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");

export default function RegisterWithOtp({ email = "", onVerified, onBack } = {}) {
  const [identifier, setIdentifier] = useState(email || "");
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [verified, setVerified] = useState(false);
  const [reqId, setReqId] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  const autoSentRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => (mountedRef.current = false);
  }, []);

  useEffect(() => {
    if (email && email !== identifier) setIdentifier(email);
  }, [email, identifier]);

  const apiUrl = (path) => {
    if (!path.startsWith("/")) path = `/${path}`;
    return API_BASE ? `${API_BASE}${path}` : path;
  };

  const maskIdentifier = (s) => {
    if (!s) return "";
    if (/\S+@\S+\.\S+/.test(String(s || ""))) {
      const [u, d] = s.split("@");
      return `${u.charAt(0)}***@${d}`;
    }
    return `***${String(s).slice(-4)}`;
  };

  const callBackend = async (path, body) => {
    try {
      const res = await fetch(apiUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, json };
    } catch (err) {
      return { ok: false, error: err };
    }
  };

  // ---- send OTP without any email check ----
  const sendOtp = async () => {
    setError("");
    const id = (identifier || "").trim();
    if (!id) return setError("Please enter email or mobile first.");

    setSending(true);
    try {
      const { ok, json, error } = await callBackend("/api/send-otp", { email: id });
      if (!ok) throw new Error(json?.message || error || "Failed to send OTP");
      if (mountedRef.current) {
        setReqId(json?.reqId || json?.reqid || "");
        setOtpSent(true);
        setOtpValue("");
      }
    } catch (err) {
      if (mountedRef.current) setError(err.message || "Failed to send OTP");
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    const id = (identifier || "").trim();
    const otp = (otpValue || "").trim();
    if (!id || !otp) return setError("Identifier and OTP are required.");

    setVerifying(true);
    try {
      const { ok, json, error } = await callBackend("/api/verify-otp", { email: id, otp });
      if (!ok) throw new Error(json?.message || error || "OTP verification failed");
      if (mountedRef.current) {
        if (json?.success) {
          setVerified(true);
          if (typeof onVerified === "function") onVerified({ email: id });
        } else {
          setError(json?.message || "OTP verification failed");
        }
      }
    } catch (err) {
      if (mountedRef.current) setError(err.message || "OTP verification failed");
    } finally {
      if (mountedRef.current) setVerifying(false);
    }
  };

  useEffect(() => {
    if (!email) return;
    if (autoSentRef.current) return;
    autoSentRef.current = true;
    sendOtp();
  }, [email]);

  const retryOtp = async () => {
    setError("");
    const id = (identifier || "").trim();
    if (!id) return setError("Missing identifier.");
    await sendOtp();
  };

  const onIdentifierKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendOtp();
    }
  };
  const onOtpKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      verifyOtp();
    }
  };

  const inputClass = `
    w-full pl-4 pr-4 py-3 rounded-full border 
    border-black bg-white text-black placeholder-black/50
    dark:border-white dark:bg-black dark:text-white dark:placeholder-white/50
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white
    transition
  `;
  const primaryBtnClass = `
    flex-1 py-3 rounded-full font-semibold
    bg-black text-white hover:brightness-110 active:scale-[0.98] disabled:opacity-50
    dark:bg-white dark:text-black dark:hover:brightness-125
    transition
  `;
  const secondaryBtnClass = `
    py-3 px-4 rounded-full border border-black text-black
    dark:border-white dark:text-white
    hover:brightness-105 active:scale-[0.98] transition
  `;
  const errorClass = "mt-3 text-sm text-red-500";

  return (
    <div className="max-w-md mx-auto my-6 p-6 bg-white dark:bg-black rounded-2xl border border-black/10 dark:border-white/10 shadow-lg">
      {!otpSent && !verified && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-black dark:text-white">Register — enter email or mobile</h3>
            {typeof onBack === "function" && (
              <button onClick={onBack} className="text-sm underline text-black/60 dark:text-white/60 underline-offset-2">
                Back
              </button>
            )}
          </div>

          <input
            aria-label="email or mobile"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={onIdentifierKey}
            placeholder="you@example.com or 919876543210"
            className={inputClass}
            autoComplete="email"
          />

          <div className="flex gap-3 mt-4">
            <button onClick={sendOtp} disabled={sending} className={primaryBtnClass}>
              {sending ? "Sending…" : "Send OTP"}
            </button>
            <button onClick={retryOtp} className={secondaryBtnClass}>
              Retry
            </button>
          </div>

          {error && <div className={errorClass}>{error}</div>}
        </div>
      )}

      {otpSent && !verified && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-black dark:text-white">Enter OTP</h3>
            {typeof onBack === "function" && (
              <button onClick={onBack} className="text-sm underline text-black/60 dark:text-white/60 underline-offset-2">
                Back
              </button>
            )}
          </div>
          <div className="text-sm text-black/70 dark:text-white/70 mb-3">
            We sent an OTP to <strong>{maskIdentifier(identifier)}</strong>
          </div>

          <input
            aria-label="otp"
            value={otpValue}
            onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 8))}
            onKeyDown={onOtpKey}
            placeholder="Enter OTP"
            className={inputClass}
            inputMode="numeric"
            maxLength={8}
            autoFocus
          />

          <div className="flex gap-3 mt-4">
            <button onClick={verifyOtp} disabled={verifying} className={primaryBtnClass}>
              {verifying ? "Verifying…" : "Verify OTP"}
            </button>
            <button onClick={retryOtp} className={secondaryBtnClass}>
              Resend
            </button>
          </div>

          {error && <div className={errorClass}>{error}</div>}
        </div>
      )}

      {verified && (
        <div>
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2">Verified ✅</h3>
          <p className="text-sm text-black/70 dark:text-white/70">
            You can now complete registration (enter personal details & password).
          </p>
        </div>
      )}
    </div>
  );
}
