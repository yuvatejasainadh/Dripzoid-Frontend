// src/contexts/UserContext.jsx
import React, { createContext, useEffect, useState, useCallback } from "react";

export const UserContext = createContext();

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");

function buildUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}

const normalizeUser = (user) => {
  if (!user) return null;
  const isAdmin =
    user.is_admin === true ||
    user.is_admin === "true" ||
    Number(user.is_admin) === 1;

  // Ensure we always have a friendly name: prefer name, then displayName, then local-part of email
  const nameFromBackend = user.name || user.displayName || user.display_name || null;
  let displayName = nameFromBackend;
  if (!displayName && user.email) {
    displayName = String(user.email).split("@")[0];
  }

  return { ...user, is_admin: Boolean(isAdmin), name: displayName };
};

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw && raw !== "null" ? normalizeUser(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      const raw = localStorage.getItem("token");
      return raw && raw !== "null" ? raw : null;
    } catch {
      return null;
    }
  });

  const [sessionId, setSessionId] = useState(() => {
    try {
      const raw = localStorage.getItem("sessionId");
      return raw && raw !== "null" ? raw : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [forceLoggedOut, setForceLoggedOut] = useState(false);

  const isAuthenticated = !!user && !!token;

const refresh = useCallback(async () => {
  if (forceLoggedOut) return null;
  setLoading(true);

  try {
    const storedToken = localStorage.getItem("token");

    const res = await fetch(buildUrl("/api/auth/me"), {
      method: "GET",
      credentials: "include", // keep cookie-based sessions working too
      headers: {
        "Content-Type": "application/json",
        ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}), // ✅ attach token if available
      },
    });

    if (!res.ok) {
      // not authenticated
      setUser(null);
      setToken(null);
      setSessionId(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("sessionId");
      setLoading(false);
      return null;
    }

    const data = await res.json().catch(() => ({}));
    const normalized = normalizeUser(data?.user ?? null);

    if (normalized) {
      setUser(normalized);
      localStorage.setItem("user", JSON.stringify(normalized));
    } else {
      setUser(null);
      localStorage.removeItem("user");
    }

    // token in response body (if API includes it)
    if (data?.token) {
      setToken(data.token);
      localStorage.setItem("token", data.token);
    }

    // sessionId: support both camelCase and snake_case keys
    const sid = data?.sessionId ?? data?.session_id ?? null;
    if (sid != null) {
      setSessionId(String(sid));
      localStorage.setItem("sessionId", String(sid));
    }

    setLoading(false);
    return normalized;
  } catch (err) {
    console.error("UserContext.refresh error", err);
    setUser(null);
    setToken(null);
    setSessionId(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("sessionId");
    setLoading(false);
    return null;
  }
}, [forceLoggedOut]);


  // LOGIN
  const login = async (userData = null, jwtToken = null, newSessionId = null) => {
    if (userData || jwtToken) {
      // Normal login flow
      const normalized = normalizeUser(userData);
      setUser(normalized);
      if (normalized) localStorage.setItem("user", JSON.stringify(normalized));

      if (jwtToken) {
        setToken(jwtToken);
        localStorage.setItem("token", jwtToken);
      }

      if (newSessionId != null) {
        setSessionId(String(newSessionId));
        localStorage.setItem("sessionId", String(newSessionId));
      }
    } else {
      // OAuth / refresh login (server-set cookies)
      await refresh();
    }

    setForceLoggedOut(false);
  };

  const logout = async (skipServer = false) => {
    setForceLoggedOut(true);

    if (!skipServer) {
      try {
        await fetch(buildUrl("/api/account/signout-session"), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionId ?? null }),
        }).catch(() => {});
      } catch {}
    }

    setUser(null);
    setToken(null);
    setSessionId(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("sessionId");
  };

  // On mount: auto-refresh auth state. Also handle ?oauth=1 redirect from backend:
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      // If we were redirected from OAuth flow, URL will likely contain ?oauth=1
      try {
        const params = new URLSearchParams(window.location.search);
        const isOauth = params.get("oauth") === "1";

        // Always attempt to refresh (if there's a valid cookie session server-side this will pick it up)
        await refresh();

        // If oauth param was present, remove it from the URL to keep things clean
        if (isOauth && mounted) {
          params.delete("oauth");
          const newSearch = params.toString();
          const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}${window.location.hash || ""}`;
          window.history.replaceState(null, "", newUrl);
        }
      } catch (err) {
        console.error("UserProvider init error", err);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [refresh]);

  return (
    <UserContext.Provider
      value={{
        user,
        token,
        sessionId,
        loading,
        isAuthenticated,
        login,
        logout,
        refresh,
        setUser,
        setToken,
        setSessionId,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
