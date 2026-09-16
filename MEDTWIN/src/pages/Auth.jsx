import React, { useState } from "react";
import { Link, useNavigate, useParams, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  UserRound,
  Stethoscope,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { Logo, Button, Field, Badge, Modal } from "../components/ui";
import { api } from "../lib/api";
import { useApp } from "../lib/context";
export default function Auth({ register = false }) {
  const { role: routeRole } = useParams();
  const role = routeRole === "doctor" ? "doctor" : "patient";
  const { login, user, services } = useApp(),
    navigate = useNavigate();
  const [form, setForm] = useState({
      identifier: "",
      password: "",
      name: "",
      email: "",
      mobile: "",
      age: "",
      gender: "Female",
      abha: "",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false),
    [forgot, setForgot] = useState(false);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  if (user)
    return (
      <Navigate to={user.role === "doctor" ? "/doctor" : "/patient"} replace />
    );
  async function submit(e, demo = false) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api(register ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: register
          ? form
          : {
              identifier: demo ? `${role}@demo.com` : form.identifier,
              password: demo ? "Demo@123" : form.password,
              role,
            },
      });
      login(result);
      navigate(role === "doctor" ? "/doctor" : "/patient");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <aside className="auth-art">
        <Logo />
        <div>
          <Badge>YOUR VOICE. OUR PRIORITY.</Badge>
          <h1>
            Good care begins
            <br />
            with your story.
          </h1>
          <p>
            A familiar language. A patient listener.
            <br />A clearer picture for your doctor.
          </p>
          <img
            src="/care-illustration.png"
            alt="A caring conversation between a patient and doctor"
          />
          <div className="auth-reassurance">
            <Check size={18} /> Simple for patients. Powerful for doctors.
          </div>
        </div>
        <small>Healthcare prototype · Use fictional information only</small>
      </aside>
      <main className="auth-form-area">
        <Link to="/" className="text-link auth-back">
          <ArrowLeft size={17} /> Back to home
        </Link>
        <div className="auth-form">
          <span className="icon-box">
            {role === "doctor" ? <Stethoscope /> : <UserRound />}
          </span>
          <h1>
            {register
              ? "Let’s get to know you."
              : role === "doctor"
                ? "Welcome back, doctor."
                : "A healthier hello."}
          </h1>
          <p className="muted">
            {register
              ? "Create your patient account to start your health journey."
              : role === "doctor"
                ? "Your patients’ stories, ready when you are."
                : "Sign in to your personal health space."}
          </p>
          {!register && (
            <div className="segmented">
              <Link
                className={role === "patient" ? "selected" : ""}
                to="/login/patient"
              >
                <UserRound size={17} /> Patient
              </Link>
              <Link
                className={role === "doctor" ? "selected" : ""}
                to="/login/doctor"
              >
                <Stethoscope size={17} /> Doctor
              </Link>
            </div>
          )}
          <form onSubmit={submit}>
            {register ? (
              <>
                <Field
                  label="Full name"
                  required
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  autoComplete="name"
                  placeholder="Your full name"
                />
                <div className="form-grid">
                  <Field
                    label="Age"
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={form.age}
                    onChange={(e) => update("age", e.target.value)}
                  />
                  <Field label="Gender">
                    <select
                      value={form.gender}
                      onChange={(e) => update("gender", e.target.value)}
                    >
                      {["Female", "Male", "Other", "Prefer not to say"].map(
                        (x) => (
                          <option key={x}>{x}</option>
                        ),
                      )}
                    </select>
                  </Field>
                </div>
                <Field
                  label="Mobile number"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength="10"
                  required
                  value={form.mobile}
                  onChange={(e) => update("mobile", e.target.value)}
                  placeholder="10-digit mobile number"
                />
                <Field
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@example.com"
                />
              </>
            ) : (
              <Field
                label={
                  role === "doctor"
                    ? "Doctor email / ID"
                    : "Email or mobile number"
                }
                required
                value={form.identifier}
                onChange={(e) => update("identifier", e.target.value)}
                autoComplete="username"
                placeholder={
                  role === "doctor" ? "doctor@example.com" : "you@example.com"
                }
              />
            )}
            <Field label="Password">
              <div className="password-input">
                <input
                  required
                  type={show ? "text" : "password"}
                  minLength={register ? 8 : 1}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  autoComplete={register ? "new-password" : "current-password"}
                  placeholder={
                    register ? "At least 8 characters" : "Enter your password"
                  }
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            {register && (
              <Field
                label="ABHA number (optional)"
                value={form.abha}
                onChange={(e) => update("abha", e.target.value)}
                placeholder="Demo only; use a fictional number"
              />
            )}
            {!register && (
              <button
                type="button"
                className="text-link forgot-link"
                onClick={() => setForgot(true)}
              >
                Forgot password?
              </button>
            )}
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}
            <Button className="full" loading={busy} type="submit">
              {register ? "Create patient account" : "Sign in"}
              <ArrowRight size={17} />
            </Button>
          </form>
          {!register && services?.demoAccounts !== false && (
            <>
              <div className="or-line">
                <span>just exploring?</span>
              </div>
              <Button
                className="full"
                variant="secondary"
                onClick={() => submit(null, true)}
                loading={busy}
              >
                Try the {role} demo <ArrowRight size={17} />
              </Button>
              <p className="demo-credentials">{role}@demo.com · Demo@123</p>
            </>
          )}
          <p className="auth-bottom">
            {register ? (
              <>
                Already have an account?{" "}
                <Link to="/login/patient">Sign in</Link>
              </>
            ) : role === "patient" ? (
              <>
                New to SwasthyaSetu?{" "}
                <Link to="/register">Create an account</Link>
              </>
            ) : (
              <>Doctor accounts are managed by the clinic administrator.</>
            )}
          </p>
          <p className="auth-secure">
            <ShieldCheck size={15} /> Prototype accounts are for demonstration
            only.
          </p>
        </div>
      </main>
      {forgot && (
        <Modal title="Account help" onClose={() => setForgot(false)}>
          <div className="modal-body">
            <p>
              Password recovery emails are not enabled in this prototype. Use
              the demo account above, or ask the person running this app to help
              restore your account.
            </p>
            <Button onClick={() => setForgot(false)}>Got it</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
