import React, { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Files,
  History,
  Pill,
  Leaf,
  CalendarDays,
  Users,
  Search,
  Settings,
  LogOut,
  Menu,
  ShieldCheck,
  Heart,
  HelpCircle,
} from "lucide-react";
import { Logo, Avatar, Badge, Modal, InfoRow } from "./ui";
import { useApp } from "../lib/context";
const patientNav = [
  ["/patient", "Overview", LayoutDashboard],
  ["/patient/appointments", "Appointments", CalendarDays],
  ["/patient/records", "Medical records", Files],
  ["/patient/timeline", "Health timeline", History],
  ["/patient/medications", "My medicines", Pill],
  ["/patient/ayush", "AYUSH profile", Leaf],
];
const doctorNav = [
  ["/doctor", "Overview", LayoutDashboard],
  ["/doctor/queue", "Patient queue", Users],
  ["/doctor/search", "Patient search", Search],
  ["/doctor/reports", "Consultations", Files],
  ["/doctor/appointments", "Appointments", CalendarDays],
];
export default function Layout() {
  const { user, logout, services } = useApp(),
    [open, setOpen] = useState(false),
    [help, setHelp] = useState(false);
  const location = useLocation(),
    navigate = useNavigate();
  const doc = user.role === "doctor",
    nav = doc ? doctorNav : patientNav;
  const title =
    nav.find((x) => x[0] === location.pathname)?.[1] ||
    (location.pathname.includes("assessment")
      ? "Your health story"
      : location.pathname.includes("/case/")
        ? "Patient profile"
        : location.pathname.includes("profile")
          ? "My profile"
          : "Settings");
  return (
    <div className="app-layout">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Logo />
        <div className="workspace-label">
          {doc ? "DOCTOR WORKSPACE" : "YOUR HEALTH SPACE"}
        </div>
        <nav>
          {nav.map(([url, label, Icon]) => (
            <NavLink
              key={url}
              to={url}
              end
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              {label}
              {label === "AYUSH profile" && (
                <span className="nav-new">NEW</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="care-note">
            <span className="icon-box">
              <Heart size={20} />
            </span>
            <strong>A little care, every day.</strong>
            <p>
              Your story matters.
              <br />
              We’re here to listen.
            </p>
          </div>
          <NavLink
            className="nav-item"
            to={doc ? "/doctor/settings" : "/patient/profile"}
          >
            <Settings size={18} />
            {doc ? "Settings" : "My profile"}
          </NavLink>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <HelpCircle size={18} />
            Help & privacy
          </button>
          <button
            className="nav-item sign-out"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            <LogOut size={18} />
            Sign out
          </button>
          <div className="sidebar-account">
            <Avatar name={user.name} />
            <div>
              <strong>{user.name}</strong>
              <small>{doc ? "Doctor account" : "Patient account"}</small>
            </div>
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="app-main">
        <header className="app-topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <span className="breadcrumb">
              {doc ? "Workspace" : "My health"}
              <span>/</span>
              <strong>{title}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <Badge tone="amber">Prototype · Demo</Badge>
            <span className="topbar-divider" />
            <span className="account-short">
              <Avatar name={user.name} />
              <span>
                {user.name
                  .split(" ")
                  .slice(0, doc ? 2 : 1)
                  .join(" ")}
              </span>
            </span>
          </div>
        </header>
        <main className="workspace-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>
            <ShieldCheck size={14} /> Your information. Your consent.
          </span>
          <span>Prototype for demonstration · Not for medical decisions</span>
        </footer>
      </div>
      {help && (
        <Modal
          title="Your privacy & this prototype"
          onClose={() => setHelp(false)}
        >
          <div className="modal-body">
            <p>
              This is a demonstration with fictional accounts. Use sample
              information only. Your patient account can see its own records;
              the assigned doctor can review information you submit.
            </p>
            <p>
              Speech recognition may use your browser provider’s service. If
              Gemini or Cloudinary is configured, information is sent to that
              service when you generate a summary or upload a document.
            </p>
            <p>
              Consent allows the assigned doctor to review your case. For data
              deletion or account help, contact the person running this
              prototype. Password recovery emails are not configured.
            </p>
            {services && (
              <div className="service-list">
                {[
                  ["Records", services.storage],
                  ["Questions", services.ai],
                  ["Documents", services.files],
                  ["ABHA / HIS", "Mock APIs only"],
                ].map(([l, v]) => (
                  <InfoRow key={l} label={l}>
                    {v}
                  </InfoRow>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
