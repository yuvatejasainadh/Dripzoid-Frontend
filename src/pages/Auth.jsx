// src/pages/Auth.jsx
import { useState, useEffect, useContext } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Smartphone, CheckCircle } from "lucide-react";

import RegisterWithOtp from "./RegisterWithOtp";
import { UserContext } from "../contexts/UserContext";

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");
function buildUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}

export default function Auth() {
  const navigate = useNavigate();
  const { login, refresh } = useContext(UserContext);

  // Login vs Register
  const [isLogin, setIsLogin] = useState(true);
  const [regStep, setRegStep] = useState("enterEmail"); // enterEmail | otpSent | enterDetails

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    mobile: "",
    gender: "",
    dob: "",
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // Forgot flow
  const [forgotFlow, setForgotFlow] = useState(false);
  const [forgotOtpVerified, setForgotOtpVerified] = useState(false);

  // Load saved email
  useEffect(() => {
    const saved = localStorage.getItem("reg_email");
    if (saved && !formData.email) setFormData((s) => ({ ...s, email: saved }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputClass =
    "w-full pl-12 pr-4 py-3 rounded-full text-black bg-white border border-black placeholder-black/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black transition dark:text-white dark:bg-black dark:border-white dark:placeholder-white/50 dark:focus-visible:ring-white";

  const primaryClasses =
    "w-full py-3 rounded-full font-semibold shadow-sm bg-black text-white hover:brightness-110 active:scale-[0.995] disabled:opacity-60 dark:bg-white dark:text-black dark:border dark:border-white";

  const googleBtnBase =
    "w-full flex items-center justify-center gap-3 py-2 px-3 rounded-full border border-black shadow-sm transition bg-white text-black dark:bg-black dark:text-white dark:border-white";

  const motionBtnProps = {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.985 },
    transition: { type: "spring", stiffness: 400, damping: 28 },
  };

  const GoogleIcon = ({ className = "" }) => (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden focusable="false" className={className}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C34.7 33 30 36 24 36c-7.7 0-14-6.3-14-14s6.3-14 14-14c3.6 0 6.9 1.3 9.4 3.6l6.6-6.6C34.6 2.9 29.6 1 24 1 11.9 1 2 10.9 2 23s9.9 22 22 22c11 0 21-8 21-22 0-1.5-.2-2.6-.4-3z"/>
      <path fill="#FF3D00" d="M6.3 14.7l7.3 5.3C15.3 16.1 19.2 13 24 13c3.6 0 6.9 1.3 9.4 3.6l6.6-6.6C34.6 2.9 29.6 1 24 1 16.1 1 9 6.8 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 47c5.6 0 10.6-1.9 14.4-5.1l-6.7-5.4C30.9 37.7 27.8 39 24 39c-6 0-10.9-3.8-12.8-9.2l-7.4 5.7C7.9 41.8 15.3 47 24 47z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.1 5.6-5.7 7.3 0 0 9.9-7 13-13.8 0 0 .3-1.3.3-1.4z"/>
    </svg>
  );

  const GoogleButton = ({ children, onClick }) => (
    <motion.button {...motionBtnProps} type="button" onClick={onClick} className={googleBtnBase}>
      <GoogleIcon />
      <span className="text-sm font-medium">{children}</span>
    </motion.button>
  );

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    if (!id) return;
    setFormData((s) => ({ ...s, [id]: val }));
  };

  // ---------- LOGIN ----------
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(buildUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: (formData.email || "").trim(), password: formData.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        // store known data immediately via UserContext
        await login(data.user, data.token, data.sessionId);
        navigate("/");
      } else if (res.status === 404) {
        alert("Email not found. Please register.");
        setIsLogin(false);
        setRegStep("enterEmail");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Login error");
    } finally {
      setLoading(false);
    }
  };

  // ---------- FORGOT FLOW ----------
  const openForgotFlow = () => {
    setForgotFlow(true);
    setForgotOtpVerified(false);
    if (formData.email) localStorage.setItem("forgot_email", formData.email);
  };

  const onForgotOtpVerified = ({ email } = {}) => {
    setForgotOtpVerified(true);
    if (email) setFormData((s) => ({ ...s, email }));
  };

  const handleResetPassword = async () => {
    const email = (formData.email || "").trim();
    const password = formData.password;
    const confirm = formData.confirmPassword;
    if (!email) return alert("Missing email");
    if (!password || !confirm) return alert("Enter new password and confirm");
    if (password !== confirm) return alert("Passwords do not match");

    setLoading(true);
    try {
      const res = await fetch(buildUrl("/api/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        alert("Password reset successful. Please login.");
        setForgotFlow(false);
        setForgotOtpVerified(false);
        setFormData((s) => ({ ...s, password: "", confirmPassword: "" }));
      } else {
        alert(json.message || "Reset failed");
      }
    } catch (err) {
      console.error("Reset error:", err);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  // ---------- REGISTER ----------
  const handleContinueToOtp = async (e) => {
    e?.preventDefault?.();
    const email = (formData.email || "").trim().toLowerCase();
    if (!email) return alert("Enter an email");
    setLoading(true);
    try {
      const res = await fetch(buildUrl("/api/check-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.exists) {
        alert("Email already registered — please login.");
        setIsLogin(true);
        return;
      }
      localStorage.setItem("reg_email", email);
      setFormData((s) => ({ ...s, email }));
      setRegStep("otpSent");
    } catch (err) {
      console.error("check-email error:", err);
      alert("Server error while checking email");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e) => {
    e?.preventDefault?.();
    if (formData.password !== formData.confirmPassword) return alert("Passwords do not match");

    const email = (formData.email || "").trim().toLowerCase() || localStorage.getItem("reg_email") || "";
    const name = (formData.name || "").trim();
    if (!name || !email || !formData.password) return alert("Please fill required fields");

    setLoading(true);
    try {
      const res = await fetch(buildUrl("/api/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password: formData.password,
          mobile: (formData.mobile || "").trim(),
          gender: formData.gender || "",
          dob: formData.dob || "",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        if (json.token) {
          await login(json.user, json.token, json.sessionId);
          localStorage.removeItem("reg_email");
          navigate("/");
          return;
        }
        alert("Registration successful — please login.");
        setIsLogin(true);
        setRegStep("enterEmail");
        localStorage.removeItem("reg_email");
        setFormData({ name: "", email: "", password: "", confirmPassword: "", mobile: "", gender: "", dob: "" });
      } else {
        alert(json.message || "Registration failed");
      }
    } catch (err) {
      console.error("Register error:", err);
      alert("Server error while registering");
    } finally {
      setLoading(false);
    }
  };

  // ---------- GOOGLE OAUTH ----------
 // Trigger full-page redirect to backend Google OAuth entrypoint
const handleGoogleAuth = () => {
  // OAuth must be performed via full redirect so Google can do the auth handshake.
  window.location.href = buildUrl("/api/auth/google");
};

// ---------- Detect OAuth callback (backend redirects to CLIENT_URL/login?oauth=1) ----------
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("oauth") === "1") {
    // Clean URL: remove oauth param
    params.delete("oauth");
    const clean =
      window.location.pathname +
      (params.toString() ? `?${params.toString()}` : "") +
      window.location.hash;
    window.history.replaceState({}, document.title, clean);

    const handleOAuthLogin = async () => {
      try {
        setOauthLoading(true);

        // Call refresh; make sure it includes cookies
        const refreshedUser = await refresh({ credentials: "include" });

        if (refreshedUser?.user) {
          // User exists → redirect to account
          navigate("/account", { replace: true });
        } else {
          console.error("OAuth login failed: no user returned");
        }
      } catch (err) {
        console.error("OAuth login failed", err);
      } finally {
        setOauthLoading(false);
      }
    };

    handleOAuthLogin();
  }
  // Run only once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [navigate]);

if (oauthLoading)
  return (
    <div className="flex items-center justify-center h-screen">
      Loading…
    </div>
  );



  // ---------- Render ----------
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="w-full max-w-md p-8 md:p-10 rounded-2xl bg-white dark:bg-black border border-black/10 dark:border-white/10 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-lg bg-black dark:bg-white text-white dark:text-black">
            <CheckCircle size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-black dark:text-white">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {isLogin ? "Sign in to continue" : "Register with email OTP or Google"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setRegStep("enterEmail"); setForgotFlow(false); setForgotOtpVerified(false); }}
            className={isLogin ? "px-5 py-2 rounded-full bg-black text-white text-sm font-medium dark:bg-white dark:text-black" : "px-5 py-2 rounded-full text-sm font-medium bg-transparent text-black dark:text-white"}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setRegStep("enterEmail"); setForgotFlow(false); setForgotOtpVerified(false); }}
            className={!isLogin ? "px-5 py-2 rounded-full bg-black text-white text-sm font-medium dark:bg-white dark:text-black" : "px-5 py-2 rounded-full text-sm font-medium bg-transparent text-black dark:text-white"}
          >
            Register
          </button>
        </div>

        {/* LOGIN */}
        {!forgotFlow && isLogin && (
          <div>
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"><Mail size={16} /></span>
                <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required autoComplete="email" className={inputClass} />
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"><Lock size={16} /></span>
                <input id="password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} placeholder="Enter password" required autoComplete="current-password" className={inputClass} />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div />
                <button type="button" onClick={openForgotFlow} className="text-sm underline text-black/60 dark:text-white/60 underline-offset-2">Forgot password?</button>
              </div>
              <motion.button {...motionBtnProps} type="submit" className={primaryClasses} disabled={loading}>{loading ? "Signing in..." : "Login"}</motion.button>
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                <div className="text-sm text-black/50 dark:text-white/50">or</div>
                <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
              </div>
              <GoogleButton onClick={handleGoogleAuth}>Login with Google</GoogleButton>
            </form>
          </div>
        )}

        {/* FORGOT FLOW */}
        {forgotFlow && (
          <div>
            {!forgotOtpVerified ? (
              <RegisterWithOtp
                email={formData.email}
                onVerified={(d) => { onForgotOtpVerified(d); }}
                onBack={() => { setForgotFlow(false); setForgotOtpVerified(false); }}
              />
            ) : (
              <div className="mt-2">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">Reset password for <strong>{formData.email}</strong></div>
                <div className="relative mb-3">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"><Lock size={16} /></span>
                  <input id="password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} placeholder="New password" className={inputClass} required />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="relative mb-3">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"><Lock size={16} /></span>
                  <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm new password" className={inputClass} required />
                  <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleResetPassword} disabled={loading} className="flex-1 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold">{loading ? "Resetting..." : "Reset password"}</button>
                  <button onClick={() => { setForgotFlow(false); setForgotOtpVerified(false); }} className="py-2 px-4 rounded-full border">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REGISTER */}
        {!isLogin && (
          <>
            {regStep === "enterEmail" && (
              <form onSubmit={(e) => { e.preventDefault(); handleContinueToOtp(); }} className="flex flex-col gap-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"><Mail size={16} /></span>
                  <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required autoComplete="email" className={inputClass} />
                </div>
                <motion.button {...motionBtnProps} type="submit" className={primaryClasses} disabled={loading}>{loading ? "Please wait..." : "Continue"}</motion.button>
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                  <div className="text-sm text-black/50 dark:text-white/50">or</div>
                  <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                </div>
                <GoogleButton onClick={handleGoogleAuth}>Sign up with Google</GoogleButton>
              </form>
            )}

            {regStep === "otpSent" && (
              <RegisterWithOtp email={formData.email} onVerified={() => setRegStep("enterDetails")} onBack={() => setRegStep("enterEmail")} />
            )}

            {regStep === "enterDetails" && (
              <form onSubmit={handleCompleteRegistration} className="flex flex-col gap-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"><User size={16} /></span>
                  <input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Full name" required autoComplete="name" className={inputClass} />
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"><Smartphone size={16} /></span>
                  <input id="mobile" name="mobile" type="tel" value={formData.mobile} onChange={handleChange} placeholder="9876543210" autoComplete="tel" className={inputClass} />
                </div>
                <div className="relative">
                  <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"><User size={16} /></span>
                </div>
                <div className="relative">
                  <input id="dob" name="dob" type="date" value={formData.dob} onChange={handleChange} className={inputClass} />
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"><Lock size={16} /></span>
                  <input id="password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} placeholder="Enter password" required autoComplete="new-password" className={inputClass} />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"><Lock size={16} /></span>
                  <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm password" required className={inputClass} />
                  <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">{showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
                <motion.button {...motionBtnProps} type="submit" className={primaryClasses} disabled={loading}>{loading ? "Creating..." : "Create account"}</motion.button>
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                  <div className="text-sm text-black/50 dark:text-white/50">or</div>
                  <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                </div>
                <GoogleButton onClick={handleGoogleAuth}>Sign up with Google</GoogleButton>
              </form>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
