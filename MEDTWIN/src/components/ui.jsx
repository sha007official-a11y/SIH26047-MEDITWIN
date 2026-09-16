import React from "react";
import {
  HeartPulse,
  ArrowUpRight,
  ArrowRight,
  LoaderCircle,
  X,
  Check,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
export function Logo({ light = false }) {
  return (
    <Link to="/" className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-mark">
        <HeartPulse size={27} />
      </span>
      <span>
        Swasthya<span className="brand-setu">Setu</span>
        <small>Your Voice. Our Priority.</small>
      </span>
    </Link>
  );
}
export function Button({
  children,
  variant = "",
  className = "",
  loading = false,
  icon: Icon,
  ...props
}) {
  return (
    <button
      className={`btn ${variant} ${className}`}
      {...props}
      disabled={loading || props.disabled}
    >
      {loading ? (
        <LoaderCircle size={18} className="spin" />
      ) : Icon ? (
        <Icon size={18} />
      ) : null}
      {children}
    </button>
  );
}
export function Badge({ children, tone = "teal" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function PageHeading({ eyebrow, title, children, action }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <p className="muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}
export function Field({ label, error, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}{" "}
      {error && <small className="error">{error}</small>}
    </label>
  );
}
export function Empty({ icon: Icon = HeartPulse, title, children, action }) {
  return (
    <div className="empty">
      <span className="icon-box">
        <Icon />
      </span>
      <h3>{title}</h3>
      <p className="muted">{children}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="empty">
      <LoaderCircle className="spin" />
      <p>Getting things ready…</p>
    </div>
  );
}
export function Modal({ title, children, onClose }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          aria-label="Close dialog"
          className="icon-button"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Disclaimer() {
  return (
    <p className="disclaimer">
      <ShieldCheck size={17} />
      Prototype only. AI-generated information is for assistance and must be
      verified by a healthcare professional.
    </p>
  );
}
export function Stat({ label, value, icon: Icon, tone = "blue", caption }) {
  return (
    <div className="stat">
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {caption && <small>{caption}</small>}
      </div>
      <span className={`icon-box ${tone}`}>
        <Icon size={22} />
      </span>
    </div>
  );
}
export function InfoRow({ label, children }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{children || "Not provided"}</strong>
    </div>
  );
}
export function Avatar({ name = "", size = "" }) {
  return (
    <span className={`avatar ${size}`}>
      {name
        .replace(/^Dr\.\s*/, "")
        .split(" ")
        .slice(0, 2)
        .map((x) => x[0])
        .join("")}
    </span>
  );
}
