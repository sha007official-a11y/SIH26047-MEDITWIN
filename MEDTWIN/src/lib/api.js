export const API_BASE = (import.meta.env.VITE_API_URL || "") + "/api";
export async function api(path, options = {}) {
  const token = sessionStorage.getItem("ss-token");
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  if (options.body && !(options.body instanceof FormData))
    headers["Content-Type"] = "application/json";
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: { ...headers, ...options.headers },
    body:
      options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  });
  if (!res.ok) {
    let data;
    try {
      data = await res.json();
    } catch {}
    if (res.status === 401 && path !== "/auth/login")
      window.dispatchEvent(new Event("ss-session-expired"));
    throw Object.assign(
      Error(data?.error || "The connection was interrupted. Please try again."),
      { status: res.status },
    );
  }
  return res.status === 204 ? null : res.json();
}
export async function documentBlob(id) {
  const r = await fetch(`${API_BASE}/documents/${id}/file`, {
    headers: { Authorization: `Bearer ${sessionStorage.getItem("ss-token")}` },
  });
  if (!r.ok) throw Error("This document could not be opened.");
  return r.blob();
}
export const dateLabel = (s) =>
  new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
