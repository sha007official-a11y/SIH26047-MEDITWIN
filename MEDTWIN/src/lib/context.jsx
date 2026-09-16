import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { api } from "./api";
const Context = createContext();
export function Provider({ children }) {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [services, setServices] = useState(null),
    [toast, setToast] = useState(null);
  const notify = useCallback(
    (message, type = "success") => setToast({ message, type, id: Date.now() }),
    [],
  );
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    api("/health")
      .then(setServices)
      .catch(() => {});
    if (sessionStorage.getItem("ss-token"))
      api("/me")
        .then(setUser)
        .catch((e) => {
          if (e.status === 401) sessionStorage.removeItem("ss-token");
        })
        .finally(() => setReady(true));
    else setReady(true);
    const expired = () => {
      sessionStorage.removeItem("ss-token");
      setUser(null);
      notify("Your session has expired. Please log in again.", "error");
    };
    window.addEventListener("ss-session-expired", expired);
    return () => window.removeEventListener("ss-session-expired", expired);
  }, []);
  function login(result) {
    sessionStorage.setItem("ss-token", result.token);
    setUser(result.user);
  }
  function logout() {
    sessionStorage.removeItem("ss-token");
    setUser(null);
  }
  return (
    <Context.Provider
      value={{ user, setUser, ready, login, logout, notify, services }}
    >
      {children}
      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          <span>{toast.type === "error" ? "!" : "✓"}</span>
          {toast.message}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
export function useLoad(path) {
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      setError("");
      const d = await api(path);
      setData(d);
      return d;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    setLoading(true);
    setData(null);
    reload();
  }, [reload]);
  return { data, loading, error, reload, setData };
}
