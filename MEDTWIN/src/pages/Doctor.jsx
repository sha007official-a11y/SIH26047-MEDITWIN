import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Users,
  Clock,
  CheckCircle2,
  CalendarDays,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  HeartPulse,
  FileCheck2,
  Files,
  History,
  Leaf,
  Check,
  Edit3,
  Stethoscope,
  ArrowLeft,
  Save,
  MessageSquare,
  RefreshCw,
  Activity,
  Server,
  Lock,
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
  InfoRow,
  Disclaimer,
  Modal,
} from "../components/ui";
import { Summary } from "./Assessment";
import { TimelineList } from "./Patient";
import { DocumentManager, AyushSummary } from "./Records";
const statusLabel = (s) =>
  ({
    submitted: "Awaiting review",
    "in-consultation": "In consultation",
    completed: "Completed",
  })[s] || s;
export function DoctorDashboard({ view = "overview" }) {
  const { data, loading, error, reload } = useLoad("/doctor/dashboard"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const { user } = useApp();
  if (loading) return <Loading />;
  if (error)
    return (
      <Empty
        title="The patient queue couldn’t be loaded"
        action={<Button onClick={reload}>Try again</Button>}
      >
        {error}
      </Empty>
    );
  const cases = data.cases.filter(
    (a) =>
      (view !== "reports" || a.status === "completed") &&
      (filter === "all" || a.status === filter) &&
      [a.patient.name, a.patient.id, a.summary?.complaint]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const severe = data.cases.filter(
    (a) => a.summary?.severity === "Severe" && a.status !== "completed",
  );
  return (
    <>
      <PageHeading
        eyebrow="A CLEARER PICTURE BEFORE EVERY CONSULTATION"
        title={
          view === "overview"
            ? `Good morning, ${user.name}.`
            : view === "reports"
              ? "Completed consultations"
              : view === "search"
                ? "Find a patient"
                : "Your patient queue"
        }
        action={
          <div className="date-chip">
            <CalendarDays size={17} />
            {dateLabel(new Date())}
          </div>
        }
      >
        {view === "overview"
          ? "Your patients’ stories, ready for a more meaningful conversation."
          : "Review the details, understand the story, and take the next step."}
      </PageHeading>
      {view === "overview" && (
        <>
          <div className="doctor-banner">
            <div>
              <span className="icon-box">
                <Stethoscope size={26} />
              </span>
              <div>
                <h2>A little more understanding. A lot more care.</h2>
                <p>
                  {data.counts.waiting} patient{" "}
                  {data.counts.waiting === 1 ? "story is" : "stories are"}{" "}
                  waiting for your review.
                </p>
              </div>
            </div>
            <Badge>GENERAL MEDICINE</Badge>
          </div>
          <div className="stats-row four">
            <Stat
              label="Awaiting review"
              value={String(data.counts.waiting).padStart(2, "0")}
              icon={Users}
              caption="Patient-verified summaries"
            />
            <Stat
              label="In consultation"
              value={String(data.counts.active).padStart(2, "0")}
              icon={Stethoscope}
              tone="violet"
              caption="Conversations in progress"
            />
            <Stat
              label="Completed"
              value={String(data.counts.completed).padStart(2, "0")}
              icon={CheckCircle2}
              tone="teal"
              caption="Consultations documented"
            />
            <Stat
              label="Appointments"
              value={String(
                data.appointments.filter((a) => a.status === "Booked").length,
              ).padStart(2, "0")}
              icon={CalendarDays}
              tone="blue"
              caption="Scheduled visits"
            />
          </div>
        </>
      )}
      {severe.length > 0 && view !== "reports" && (
        <div className="attention-strip">
          <AlertTriangle size={20} />
          <p>
            <strong>
              {severe.length} case {severe.length === 1 ? "needs" : "need"} your
              attention.
            </strong>{" "}
            Severe symptoms have been reported. Review the patient’s account.
          </p>
          <Link to={`/doctor/case/${severe[0].id}`}>
            Review case <ArrowRightSmall />
          </Link>
        </div>
      )}
      <section className="panel queue-panel">
        <div className="panel-heading">
          <h2>
            {view === "reports" ? "Consultation records" : "Patient queue"}{" "}
            <span className="count-pill">{cases.length}</span>
          </h2>
          <Button variant="outline" icon={RefreshCw} onClick={reload}>
            Refresh
          </Button>
        </div>
        <div className="queue-toolbar">
          <div className="search-field">
            <Search size={18} />
            <input
              aria-label="Search patients"
              placeholder="Search name, patient ID, or complaint…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {view !== "reports" && (
            <div className="filter-tabs" aria-label="Filter patient status">
              {[
                ["all", "All patients"],
                ["submitted", "Awaiting review"],
                ["in-consultation", "In consultation"],
                ["completed", "Completed"],
              ].map(([value, label]) => (
                <button
                  className={filter === value ? "active" : ""}
                  key={value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="table-scroll">
          <table className="patient-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Health story</th>
                <th>Received</th>
                <th>Priority</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Open case</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {cases.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link className="patient-cell" to={`/doctor/case/${a.id}`}>
                      <Avatar name={a.patient.name} />
                      <div>
                        <strong>{a.patient.name}</strong>
                        <small>
                          {a.patient.age} years · {a.patient.gender} ·{" "}
                          {a.patient.id}
                        </small>
                      </div>
                    </Link>
                  </td>
                  <td>
                    <strong>{a.summary?.complaint || "Review required"}</strong>
                    <small>
                      {a.summary?.duration} · {a.summary?.severity}
                    </small>
                  </td>
                  <td>
                    <span>{dateLabel(a.submittedAt || a.createdAt)}</span>
                    <small>
                      {a.patientVerified
                        ? "Patient verified"
                        : "Needs confirmation"}
                    </small>
                  </td>
                  <td>
                    <Badge
                      tone={
                        a.summary?.severity === "Severe" ? "rose" : "neutral"
                      }
                    >
                      {a.summary?.severity === "Severe"
                        ? "Needs attention"
                        : "Routine review"}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      tone={
                        a.status === "completed"
                          ? "teal"
                          : a.status === "in-consultation"
                            ? "violet"
                            : "blue"
                      }
                    >
                      {statusLabel(a.status)}
                    </Badge>
                  </td>
                  <td>
                    <Link
                      className="view-case"
                      to={`/doctor/case/${a.id}`}
                      aria-label={`Open ${a.patient.name}'s case`}
                    >
                      <ChevronRight size={19} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!cases.length && (
          <Empty icon={Search} title="No matching patients">
            Try another name or change the status filter.
          </Empty>
        )}
        <div className="table-footer">
          <span>
            Showing {cases.length} {cases.length === 1 ? "case" : "cases"}
          </span>
          <span>
            <ShieldCheck size={14} /> Fictional demo records
          </span>
        </div>
      </section>
      {view === "overview" && (
        <div className="doctor-bottom">
          <section className="panel">
            <div className="panel-heading">
              <h2>Before you begin</h2>
              <span className="icon-box">
                <FileCheck2 size={20} />
              </span>
            </div>
            <div className="review-principles">
              <p>
                <CheckCircle2 size={18} />
                <span>
                  <strong>Listen to the patient’s own account.</strong> Original
                  responses are available in Case history.
                </span>
              </p>
              <p>
                <CheckCircle2 size={18} />
                <span>
                  <strong>Verify the details.</strong> Check allergies,
                  medicines, and document extractions.
                </span>
              </p>
              <p>
                <CheckCircle2 size={18} />
                <span>
                  <strong>Keep the story connected.</strong> Consultation notes
                  return to the patient’s timeline.
                </span>
              </p>
            </div>
          </section>
          <section className="doctor-next">
            <CalendarDays size={28} />
            <h2>Your next conversations</h2>
            <p>
              {data.appointments.filter((a) => a.status === "Booked").length}{" "}
              visits are scheduled in your appointment book.
            </p>
            <Link className="text-link" to="/doctor/appointments">
              View appointments <ArrowUpRight size={17} />
            </Link>
          </section>
        </div>
      )}
    </>
  );
}
function ArrowRightSmall() {
  return <ChevronRight size={16} />;
}
export function DoctorCase() {
  const { id } = useParams(),
    { data, loading, error, reload } = useLoad(`/assessments/${id}`);
  if (loading) return <Loading />;
  if (error)
    return (
      <Empty title={error} action={<Button onClick={reload}>Retry</Button>} />
    );
  return <CaseDetail key={id} assessment={data} refreshCase={reload} />;
}
function CaseDetail({ assessment: a, refreshCase }) {
  const { data, loading, error, reload } = useLoad(
      `/doctor/patients/${a.patientId}`,
    ),
    { notify } = useApp();
  const [tab, setTab] = useState("Summary"),
    [editing, setEditing] = useState(false),
    [summary, setSummary] = useState(a.summary),
    [notes, setNotes] = useState(""),
    [busy, setBusy] = useState(false),
    [his, setHis] = useState(null),
    [confirmComplete, setConfirmComplete] = useState(false);
  useEffect(() => setSummary(a.summary), [a.summary]);
  async function review(body, message) {
    setBusy(true);
    try {
      await api(`/doctor/assessments/${a.id}/review`, {
        method: "PATCH",
        body,
      });
      await refreshCase();
      setEditing(false);
      notify(message);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function consult(action) {
    setBusy(true);
    try {
      await api(`/doctor/assessments/${a.id}/consultation`, {
        method: "POST",
        body: { action, notes },
      });
      await Promise.all([refreshCase(), reload()]);
      if (action === "complete") {
        setConfirmComplete(false);
        setNotes("");
      } else setTab("Consultation");
      notify(
        action === "start"
          ? "Consultation started."
          : "Consultation completed and added to the patient timeline.",
      );
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (error) return <Empty title={error} />;
  const p = data.patient,
    unverifiedAllergy =
      /don.t know|don’t know|not provided|not sure|unclear|allergy$|தெரியாது|पता|తెలియదు|അറിയില്ല/i.test(
        summary?.allergies || "",
      ),
    severe = summary?.severity === "Severe",
    alerts = !a.flagsDismissed && (unverifiedAllergy || severe);
  const tabs = [
    ["Summary", FileCheck2],
    ["Case history", HeartPulse],
    ["Documents", Files],
    ["Timeline", History],
    ["AYUSH", Leaf],
    ["Alerts", AlertTriangle],
    ["Consultation", Stethoscope],
  ];
  return (
    <>
      <Link className="text-link case-back" to="/doctor/queue">
        <ArrowLeft size={16} /> Back to patient queue
      </Link>
      <section className="patient-profile-head panel">
        <Avatar name={p.name} size="large" />
        <div className="profile-identity">
          <div>
            <h1>{p.name}</h1>
            <Badge tone="blue">{statusLabel(a.status)}</Badge>
          </div>
          <p>
            {p.age} years <span>·</span> {p.gender} <span>·</span> {p.id}
          </p>
          <small>
            {p.abha ? `ABHA (demo): ${p.abha}` : "ABHA not provided"}{" "}
            <span>·</span> {a.language} <span>·</span> {a.mode} mode
          </small>
        </div>
        <div className="patient-profile-actions">
          <Badge tone={a.doctorVerified ? "teal" : "amber"}>
            {a.doctorVerified ? <Check size={13} /> : <Clock size={13} />}{" "}
            {a.doctorVerified ? "Doctor verified" : "Verification needed"}
          </Badge>
          {a.status === "submitted" && (
            <Button
              icon={Stethoscope}
              onClick={() => consult("start")}
              disabled={!a.doctorVerified}
              loading={busy}
            >
              Start consultation
            </Button>
          )}
          {a.status === "in-consultation" && (
            <Button onClick={() => setTab("Consultation")}>
              Continue consultation
            </Button>
          )}
        </div>
      </section>
      <div className="case-tabs" role="tablist">
        {tabs.map(([name, Icon]) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            className={tab === name ? "active" : ""}
            onClick={() => setTab(name)}
          >
            <Icon size={17} />
            {name}
            {name === "Alerts" && alerts && (
              <span className="alert-count">!</span>
            )}
            {name === "Documents" && <span>{data.documents.length}</span>}
          </button>
        ))}
      </div>
      <div className="case-content" role="tabpanel" aria-label={tab}>
        {tab === "Summary" && (
          <div className="case-summary-layout">
            <section className="panel case-summary">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">THE PATIENT’S STORY</p>
                  <h2>Case summary</h2>
                </div>
                <Badge>
                  <Check size={13} /> Patient confirmed
                </Badge>
              </div>
              <Summary
                summary={summary}
                editing={editing}
                onChange={setSummary}
              />
              <div className="case-summary-footer">
                <Badge tone="neutral">
                  {a.engine || "Demo question engine"}
                </Badge>
                <span>Shared {dateLabel(a.submittedAt || a.createdAt)}</span>
              </div>
              <div className="form-actions">
                <Button
                  variant="outline"
                  icon={Edit3}
                  onClick={() => {
                    if (editing) setSummary(a.summary);
                    setEditing(!editing);
                  }}
                >
                  {editing ? "Cancel editing" : "Edit information"}
                </Button>
                {editing ? (
                  <Button
                    loading={busy}
                    onClick={() =>
                      review(
                        { summary },
                        "Summary updated. Please verify the changes.",
                      )
                    }
                  >
                    Save changes
                  </Button>
                ) : (
                  <Button
                    icon={Check}
                    loading={busy}
                    variant={a.doctorVerified ? "secondary" : ""}
                    onClick={() =>
                      review(
                        { doctorVerified: true },
                        "Patient summary verified.",
                      )
                    }
                    disabled={a.doctorVerified}
                  >
                    {a.doctorVerified ? "Verified" : "Verify summary"}
                  </Button>
                )}
              </div>
              <Disclaimer />
            </section>
            <aside className="case-right">
              <section className="panel">
                <div className="panel-heading">
                  <h2>Important alerts</h2>
                  <AlertTriangle size={19} />
                </div>
                {alerts ? (
                  <>
                    {severe && (
                      <div className="clinical-flag rose">
                        <strong>Reported severe symptoms</strong>
                        <p>
                          The patient selected “Severe”. Requires clinician
                          review.
                        </p>
                      </div>
                    )}
                    {unverifiedAllergy && (
                      <div className="clinical-flag amber">
                        <strong>Needs verification</strong>
                        <p>
                          Allergy information is unclear. Confirm with the
                          patient.
                        </p>
                      </div>
                    )}
                    <button
                      className="text-link"
                      onClick={() => setTab("Alerts")}
                    >
                      Review alerts <ChevronRight size={16} />
                    </button>
                  </>
                ) : (
                  <div className="clinical-flag">
                    <strong>No outstanding information flags</strong>
                    <p>Clinical review is still required.</p>
                  </div>
                )}
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Shared documents</h2>
                  <Files size={19} />
                </div>
                {data.documents.slice(0, 3).map((d) => (
                  <button
                    key={d.id}
                    className="mini-doc"
                    onClick={() => setTab("Documents")}
                  >
                    <span className="icon-box blue">
                      <Files size={18} />
                    </span>
                    <div>
                      <strong>{d.name}</strong>
                      <small>{d.verified ? "Verified" : "Review needed"}</small>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                ))}
                {!data.documents.length && (
                  <p className="muted small-text">
                    No documents have been shared.
                  </p>
                )}
              </section>
              <section className="consent-mini">
                <ShieldCheck size={24} />
                <div>
                  <strong>Shared with consent</strong>
                  <p>Patient reviewed and approved this health story.</p>
                </div>
              </section>
            </aside>
          </div>
        )}
        {tab === "Case history" && (
          <section className="panel padded-panel">
            <PageHeading title="In the patient’s own words">
              Original answers are preserved alongside the edited summary.
            </PageHeading>
            {Object.entries(a.answers).map(([k, v]) => (
              <InfoRow
                label={
                  {
                    complaint: "Their concern",
                    duration: "When it began",
                    severity: "How it feels",
                    pattern: "Pattern",
                    associatedSymptoms: "Other symptoms",
                    medication: "Medicines",
                    allergies: "Allergies",
                    medicalHistory: "Past history",
                  }[k] || k
                }
                key={k}
              >
                {v}
              </InfoRow>
            ))}
            <InfoRow label="Interaction mode">{a.mode}</InfoRow>
            {a.mode === "Helper" && (
              <InfoRow label="Helper">
                {a.helper} · {a.relationship}
              </InfoRow>
            )}
            <h3 className="space-top">Other shared assessments</h3>
            {data.assessments
              .filter((x) => x.id !== a.id)
              .map((x) => (
                <Link
                  className="record-row"
                  to={`/doctor/case/${x.id}`}
                  key={x.id}
                >
                  <HeartPulse size={20} />
                  <strong>{x.summary?.complaint}</strong>
                  <span>{dateLabel(x.createdAt)}</span>
                  <ChevronRight size={18} />
                </Link>
              ))}
          </section>
        )}
        {tab === "Documents" && (
          <section className="panel records-panel">
            <div className="panel-heading">
              <h2>Medical documents</h2>
              <Badge tone="neutral">Check all extracted details</Badge>
            </div>
            <DocumentManager
              doctor
              documents={data.documents}
              reload={reload}
            />
          </section>
        )}
        {tab === "Timeline" && (
          <section className="panel timeline-panel">
            <div className="panel-heading">
              <h2>Patient health timeline</h2>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    setHis(await api(`/mock/his/${p.id}`));
                    notify("Mock hospital records loaded.");
                  } catch (e) {
                    notify(e.message, "error");
                  }
                }}
              >
                Load mock HIS records
              </Button>
            </div>
            {his && (
              <div className="inline-note">
                {his.label} · {his.records.length} timeline records ·{" "}
                {his.consultations.length} consultations
              </div>
            )}
            <TimelineList items={data.timeline} />
          </section>
        )}
        {tab === "AYUSH" && (
          <section className="panel padded-panel">
            <AyushSummary profile={data.ayush} />
          </section>
        )}
        {tab === "Alerts" && (
          <section className="panel padded-panel">
            <PageHeading title="Information that needs attention">
              These are verification flags, not diagnoses.
            </PageHeading>
            {alerts ? (
              <>
                {severe && (
                  <div className="clinical-flag rose">
                    <strong>Reported severe symptoms</strong>
                    <p>
                      The patient reports {summary.complaint?.toLowerCase()}{" "}
                      with severe discomfort. Review the original answers and
                      consult the patient.
                    </p>
                  </div>
                )}
                {unverifiedAllergy && (
                  <div className="clinical-flag amber">
                    <strong>Allergies need clarification</strong>
                    <p>
                      Patient response: “{summary.allergies}”. Confirm and
                      update the summary.
                    </p>
                  </div>
                )}
                <div className="form-actions">
                  <Button
                    onClick={() => {
                      setTab("Summary");
                      setEditing(true);
                    }}
                  >
                    Edit / verify information
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      review(
                        { flagsDismissed: true },
                        "Information flags marked as reviewed.",
                      )
                    }
                  >
                    Mark flags reviewed
                  </Button>
                </div>
              </>
            ) : (
              <Empty
                icon={ShieldCheck}
                title="No outstanding information flags"
              >
                Continue to apply your clinical judgment and verify the
                patient’s history.
              </Empty>
            )}
          </section>
        )}
        {tab === "Consultation" && (
          <div className="case-summary-layout">
            <section className="panel padded-panel">
              <div className="panel-heading">
                <h2>Consultation notes</h2>
                <Badge tone={a.status === "completed" ? "teal" : "blue"}>
                  {statusLabel(a.status)}
                </Badge>
              </div>
              {a.status === "submitted" ? (
                <Empty
                  icon={Stethoscope}
                  title="Ready for a more informed conversation"
                  action={
                    <Button
                      onClick={() => consult("start")}
                      disabled={!a.doctorVerified}
                      loading={busy}
                    >
                      Start consultation
                    </Button>
                  }
                >
                  {a.doctorVerified
                    ? "Your verified patient summary is ready."
                    : "Verify the health summary before starting."}
                </Empty>
              ) : a.status === "completed" ? (
                <div className="inline-note">
                  <CheckCircle2 size={20} /> Consultation completed. The notes
                  are available in the patient’s timeline.
                </div>
              ) : (
                <>
                  <Field label="Clinical notes">
                    <textarea
                      rows="10"
                      placeholder="Document your consultation, observations, and follow-up…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength="10000"
                    />
                  </Field>
                  <div className="form-actions">
                    <Button
                      variant="outline"
                      icon={Save}
                      disabled={!notes.trim() || busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await api("/doctor/notes", {
                            method: "POST",
                            body: { assessmentId: a.id, text: notes },
                          });
                          setNotes("");
                          await reload();
                          notify("Consultation note saved.");
                        } catch (e) {
                          notify(e.message, "error");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Save note
                    </Button>
                    <Button
                      icon={Check}
                      disabled={!notes.trim()}
                      loading={busy}
                      onClick={() => setConfirmComplete(true)}
                    >
                      Complete consultation
                    </Button>
                  </div>
                </>
              )}
              <h3 className="space-top">Saved notes</h3>
              {data.notes.filter((n) => n.assessmentId === a.id).length ? (
                data.notes
                  .filter((n) => n.assessmentId === a.id)
                  .map((n) => (
                    <div className="saved-note" key={n.id}>
                      <small>{dateLabel(n.createdAt)}</small>
                      <p>{n.text}</p>
                    </div>
                  ))
              ) : (
                <p className="muted small-text">
                  No notes saved for this consultation yet.
                </p>
              )}
            </section>
            <section className="panel padded-panel">
              <h2 className="space-bottom">Verified patient information</h2>
              <Summary summary={a.summary} />
            </section>
          </div>
        )}
      </div>
      {confirmComplete && (
        <Modal
          title="Complete this consultation?"
          onClose={() => setConfirmComplete(false)}
        >
          <div className="modal-body">
            <p>
              Your notes will be saved and added to {p.name}’s health timeline.
            </p>
            <div className="note-preview">{notes}</div>
            <div className="form-actions">
              <Button
                variant="outline"
                onClick={() => setConfirmComplete(false)}
              >
                Keep editing
              </Button>
              <Button loading={busy} onClick={() => consult("complete")}>
                Complete & save notes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
export function DoctorSettings() {
  const { services, user } = useApp();
  return (
    <>
      <PageHeading title="Workspace settings">
        Your account and prototype connections.
      </PageHeading>
      <div className="settings-grid">
        <section className="panel padded-panel">
          <div className="profile-top">
            <Avatar name={user.name} size="large" />
            <div>
              <h2>{user.name}</h2>
              <p className="muted">Doctor workspace</p>
            </div>
          </div>
          <InfoRow label="Email">{user.email}</InfoRow>
          <InfoRow label="Role">Doctor</InfoRow>
          <InfoRow label="Access">Assigned patients and shared cases</InfoRow>
          <InfoRow label="Session">Expires after 8 hours</InfoRow>
        </section>
        <section className="panel padded-panel">
          <h2 className="space-bottom">Prototype connections</h2>
          {services ? (
            Object.entries({
              Records: services.storage,
              "Questions & summaries": services.ai,
              Documents: services.files,
              "ABHA identity": "MOCK API — PROTOTYPE",
              "Hospital records": "MOCK API — PROTOTYPE",
            }).map(([k, v]) => (
              <InfoRow key={k} label={k}>
                {v}
              </InfoRow>
            ))
          ) : (
            <Loading />
          )}
          <p className="inline-note">
            Connections are configured by the app administrator. Credentials are
            kept on the server.
          </p>
        </section>
      </div>
    </>
  );
}
