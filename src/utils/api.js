const API_BASE = process.env.REACT_APP_API_BASE;

// Get token from localStorage
function getToken() {
  return localStorage.getItem("token");
}

async function request(path, opts = {}, auth = false) {
  const headers = { ...(opts.headers || {}) };

  // Attach token if auth = true
  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  // Only set Content-Type if body is not FormData
  if (!(opts.body instanceof FormData) && opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
  });

  if (!res.ok) {
    let err;
    try {
      err = await res.json();
    } catch {
      err = { message: res.statusText };
    }
    throw err;
  }

  // Return blob if requested
  if (opts.isBlob) return await res.blob();

  try {
    return await res.json();
  } catch {
    return {};
  }
}

export default {
  get: (path, { params = {}, signal } = {}, auth = false, isBlob = false) => {
    const qs = new URLSearchParams(params).toString();
    return request(
      `${path}${qs ? `?${qs}` : ""}`,
      { method: "GET", signal, isBlob },
      auth
    );
  },

  post: (path, body, auth = false, extraHeaders = {}) =>
    request(path, { method: "POST", body: JSON.stringify(body), headers: extraHeaders }, auth),

  put: (path, body, auth = false, extraHeaders = {}) =>
    request(path, { method: "PUT", body: JSON.stringify(body), headers: extraHeaders }, auth),

  delete: (path, auth = false, extraHeaders = {}) =>
    request(path, { method: "DELETE", headers: extraHeaders }, auth),

  // Updated formPost: supports custom headers and auth
  formPost: (path, formData, auth = false, extraHeaders = {}) =>
    request(path, { method: "POST", body: formData, headers: extraHeaders }, auth),
};
