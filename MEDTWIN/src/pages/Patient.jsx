import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  CalendarDays,
  Files,
  History,
  Pill,
  Leaf,
  HeartPulse,
  Clock,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { api, dateLabel } from "../lib/api";
import { useApp, useLoad } from "../lib/context";
import {
  Button,
  Badge,
  PageHeading,
  Stat,
  Loading,
  Empty,
  Avatar,
  Field,
} from "../components/ui";
export function PatientDashboard() {
  const { user, notify } = useApp(),
    { data, loading, error, reload } = useLoad("/patient"),
    navigate = useNavigate(),
    [busy, setBusy] = useState(false);
  async function start() {
    setBusy(true);
    try {
      const a = await api("/assessments", { method: "POST" });
      navigate(`/patient/assessment/${a.id}`);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (error)
    return (
      <Empty
        title="We couldn’t load your health space"
        action={<Button onClick={reload}>Try again</Button>}
      >
        {error}
      </Empty>
    );
  const draft = data.assessments.find((a) => a.status === "draft"),
    active = data.assessments.filter((a) => a.status !== "draft");
  return (
    <>
      <PageHeading
        eyebrow="YOUR HEALTH, AT A GLANCE"
        title={`Vanakkam, ${user.name.split(" ")[0]} 👋`}
        action={
          <div className="date-chip">
            <CalendarDays size={17} />
            {dateLabel(new Date())}
          </div>
        }
      >
        A little step for your health. A little more peace of mind.
      </PageHeading>
      <section className="patient-welcome">
        <div>
          <Badge>LET’S TAKE CARE OF YOU</Badge>
          <h2>How are you feeling today?</h2>
          <p>
            Tell us what’s on your mind, in your own words.
            <br />
            We’ll help you get ready for your doctor.
          </p>
          <Button variant="blue" onClick={start} loading={busy}>
            {draft ? "Continue your health story" : "Start health assessment"}
            <ArrowRight size={18} />
          </Button>
          <small>
            <Clock size={14} /> About 5–8 minutes · At your own pace
          </small>
        </div>
        <img src="/care-illustration.png" alt="Doctor listening to a patient" />
      </section>
      <div className="stats-row">
        <Stat
          label="Health assessments"
          value={active.length.toString().padStart(2, "0")}
          icon={HeartPulse}
          caption="Your shared health stories"
        />
        <Stat
          label="Medical records"
          value={data.documents.length.toString().padStart(2, "0")}
          icon={Files}
          tone="teal"
          caption="Together in one place"
        />
        <Stat
          label="Upcoming appointments"
          value={data.appointments
            .filter((a) => a.status === "Booked")
            .length.toString()
            .padStart(2, "0")}
          icon={CalendarDays}
          tone="violet"
          caption="Your next step in care"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Your health stories</h2>
            <Button
              variant="outline"
              onClick={start}
              loading={busy}
              icon={Plus}
            >
              New assessment
            </Button>
          </div>
          {data.assessments.length ? (
            data.assessments.slice(0, 4).map((a) => (
              <div className="record-row" key={a.id}>
                <span
                  className={`icon-box ${a.status === "draft" ? "violet" : "blue"}`}
                >
                  <HeartPulse size={21} />
                </span>
                <div className="row-main">
                  <strong>
                    {a.summary?.complaint || "Your new health story"}
                  </strong>
                  <small>
                    {dateLabel(a.createdAt)} · {a.language}
                  </small>
                </div>
                <Badge
                  tone={
                    a.status === "completed"
                      ? "teal"
                      : a.status === "draft"
                        ? "violet"
                        : "blue"
                  }
                >
                  {a.status === "draft"
                    ? "Draft"
                    : a.status === "in-consultation"
                      ? "In consultation"
                      : a.status === "submitted"
                        ? "With your doctor"
                        : "Completed"}
                </Badge>
                {a.status === "draft" && (
                  <Link
                    aria-label="Continue assessment"
                    className="icon-button"
                    to={`/patient/assessment/${a.id}`}
                  >
                    <ChevronRight size={18} />
                  </Link>
                )}
              </div>
            ))
          ) : (
            <Empty title="Your story starts here">
              Your shared assessments will appear in this space.
            </Empty>
          )}
          <div className="panel-subfooter">
            <ShieldCheck size={16} /> You review every summary before it reaches
            your doctor.
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Quick access</h2>
          </div>
          <div className="quick-grid">
            {[
              [Files, "Medical records", "/patient/records", "blue"],
              [Pill, "My medicines", "/patient/medications", "violet"],
              [History, "Health timeline", "/patient/timeline", "blue"],
              [Leaf, "AYUSH profile", "/patient/ayush", "teal"],
            ].map(([Icon, label, to, tone]) => (
              <Link to={to} key={to}>
                <span className={`icon-box ${tone}`}>
                  <Icon size={22} />
                </span>
                <strong>{label}</strong>
                <ArrowUpRight size={15} />
              </Link>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Recent health activity</h2>
            <Link className="text-link" to="/patient/timeline">
              View timeline <ArrowUpRight size={16} />
            </Link>
          </div>
          <TimelineList items={data.timeline.slice(0, 3)} />
        </section>
        <section className="ayush-callout">
          <span className="icon-box">
            <Leaf size={24} />
          </span>
          <Badge>A MORE COMPLETE PICTURE</Badge>
          <h2>Wellness, in your own way.</h2>
          <p>
            Share your appetite, sleep, and everyday habits with your AYUSH
            practitioner.
          </p>
          <Link className="text-link" to="/patient/ayush">
            Explore your AYUSH profile <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </>
  );
}
export function TimelineList({ items }) {
  return (
    <div className="timeline-list">
      {items.length ? (
        items.map((x) => (
          <div className="timeline-item" key={x.id}>
            <span className={`timeline-dot ${x.type || ""}`} />
            <div>
              <small>{dateLabel(x.date)}</small>
              <h3>{x.title}</h3>
              <p>{x.detail}</p>
            </div>
          </div>
        ))
      ) : (
        <p className="muted">Your health activity will appear here.</p>
      )}
    </div>
  );
}
export function TimelinePage() {
  const { data, loading, error, reload } = useLoad("/patient");
  return (
    <>
      <PageHeading eyebrow="YOUR STORY, OVER TIME" title="Health timeline">
        Every small step, together in one place.
      </PageHeading>
      <section className="panel timeline-panel">
        {loading ? (
          <Loading />
        ) : error ? (
          <Empty
            title={error}
            action={<Button onClick={reload}>Retry</Button>}
          />
        ) : (
          <TimelineList items={data.timeline} />
        )}
      </section>
    </>
  );
}
export function ProfilePage() {
  const { data, loading, error, reload } = useLoad("/patient"),
    { user, setUser, notify } = useApp(),
    [form, setForm] = useState(null),
    [busy, setBusy] = useState(false);
  React.useEffect(() => {
    if (data) setForm({ ...data.patient, abha: data.patient.abha || "" });
  }, [data]);
  if (error)
    return (
      <Empty title={error} action={<Button onClick={reload}>Retry</Button>} />
    );
  if (loading || !form) return <Loading />;
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/patient/profile", { method: "PATCH", body: form });
      setUser({ ...user, name: form.name });
      notify("Your profile has been updated.");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading title="Your profile">
        Keep your details up to date for your care team.
      </PageHeading>
      <form className="panel profile-form" onSubmit={save}>
        <div className="profile-top">
          <Avatar name={form.name} size="large" />
          <div>
            <h2>{form.name}</h2>
            <Badge tone="blue">{form.id}</Badge>
          </div>
        </div>
        <div className="form-grid">
          {[
            ["name", "Full name"],
            ["age", "Age"],
            ["abha", "ABHA number (optional)"],
          ].map(([k, l]) => (
            <Field
              key={k}
              label={l}
              type={k === "age" ? "number" : "text"}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              required={k !== "abha"}
            />
          ))}
          <Field label="Gender">
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              {["Female", "Male", "Other", "Prefer not to say"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Preferred language">
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              {["English", "தமிழ்", "हिन्दी", "తెలుగు", "മലയാളം"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Email" value={user.email} readOnly />
        </div>
        <Field label="Medical history">
          <textarea
            value={form.medicalHistory}
            onChange={(e) =>
              setForm({ ...form, medicalHistory: e.target.value })
            }
          />
        </Field>
        <Field label="Allergies">
          <textarea
            value={form.allergies}
            onChange={(e) => setForm({ ...form, allergies: e.target.value })}
          />
        </Field>
        <div className="form-actions">
          <Button type="submit" loading={busy}>
            Save profile
          </Button>
          <Badge tone="neutral">Fictional information only</Badge>
        </div>
      </form>
    </>
  );
}
