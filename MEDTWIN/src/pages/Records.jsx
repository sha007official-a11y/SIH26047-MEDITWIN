import React, { useState, useRef, useEffect } from "react";
import {
  Files,
  Upload,
  Camera,
  FileText,
  Trash2,
  ScanLine,
  Check,
  Download,
  Eye,
  Plus,
  Pill,
  Leaf,
  Sun,
  Snowflake,
  Scale,
  Flame,
  Moon,
  Activity,
  CalendarDays,
  Clock,
  ArrowRight,
  Stethoscope,
  ShieldCheck,
  LoaderCircle,
} from "lucide-react";
import { api, documentBlob, dateLabel } from "../lib/api";
import { useLoad, useApp } from "../lib/context";
import {
  Button,
  Field,
  Badge,
  PageHeading,
  Loading,
  Empty,
  Modal,
  InfoRow,
  Avatar,
  Disclaimer,
} from "../components/ui";
export function DocumentManager({
  documents = [],
  assessmentId,
  reload,
  doctor = false,
  compact = false,
}) {
  const { notify, services } = useApp(),
    [type, setType] = useState("Prescription"),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(null),
    [remove, setRemove] = useState(null);
  const fileRef = useRef(null),
    cameraRef = useRef(null);
  async function upload(file) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        file.type,
      ) ||
      file.size > 10 * 1024 * 1024
    ) {
      notify("Choose a JPG, PNG, WebP image or PDF up to 10 MB.", "error");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("type", type);
      if (assessmentId) body.append("assessmentId", assessmentId);
      const d = await api("/documents", { method: "POST", body });
      await reload();
      notify("Your document has been uploaded.");
      setSelected(d);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }
  return (
    <div className="document-manager">
      {!doctor && (
        <>
          <div className="document-types">
            {["Prescription", "Lab Report", "Discharge Summary", "Other"].map(
              (x) => (
                <button
                  className={type === x ? "selected" : ""}
                  onClick={() => setType(x)}
                  key={x}
                >
                  <FileText size={18} />
                  {x}
                </button>
              ),
            )}
          </div>
          <div
            className="upload-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!busy) upload(e.dataTransfer.files[0]);
            }}
          >
            <span className="icon-box blue">
              <Upload size={27} />
            </span>
            <h3>
              {busy
                ? "Uploading your document…"
                : "A clearer picture, one record at a time."}
            </h3>
            <p>Drag a document here, or choose a file.</p>
            <small>JPG, PNG, WebP or PDF · Up to 10 MB</small>
            <div className="form-actions">
              <Button
                onClick={() => fileRef.current.click()}
                loading={busy}
                icon={Upload}
              >
                Upload document
              </Button>
              <Button
                variant="outline"
                onClick={() => cameraRef.current.click()}
                disabled={busy}
                icon={Camera}
              >
                Scan with camera
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              hidden
              onChange={(e) => upload(e.target.files[0])}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => upload(e.target.files[0])}
            />
          </div>
          <p className="document-storage">
            <ShieldCheck size={14} />
            {services?.files || "Local demo uploads"} · Shared with your care
            team
          </p>
        </>
      )}
      {documents.length > 0 ? (
        <div className="document-list">
          {documents.map((d) => (
            <div className="document-row" key={d.id}>
              <span className="icon-box blue">
                <FileText size={22} />
              </span>
              <button
                className="row-main file-title"
                onClick={() => setSelected(d)}
              >
                <strong>{d.name}</strong>
                <small>
                  {d.type} · {dateLabel(d.createdAt)} ·{" "}
                  {d.sample
                    ? "Demo record"
                    : `${Math.max(1, Math.round(d.size / 1024))} KB`}
                </small>
              </button>
              <Badge
                tone={d.verified ? "teal" : d.ocrText ? "blue" : "neutral"}
              >
                {d.verified
                  ? "Verified"
                  : d.ocrText
                    ? "Needs review"
                    : "Ready to scan"}
              </Badge>
              <button
                className="icon-button"
                aria-label={`View ${d.name}`}
                onClick={() => setSelected(d)}
              >
                <Eye size={18} />
              </button>
              {!doctor && (
                <button
                  className="icon-button"
                  aria-label={`Remove ${d.name}`}
                  onClick={() => setRemove(d)}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        doctor && (
          <Empty icon={Files} title="No documents shared">
            The patient has not added documents to this case.
          </Empty>
        )
      )}
      {selected && (
        <DocumentViewer
          document={selected}
          doctor={doctor}
          onClose={() => setSelected(null)}
          onSaved={reload}
        />
      )}{" "}
      {remove && (
        <Modal title="Remove this document?" onClose={() => setRemove(null)}>
          <div className="modal-body">
            <p>{remove.name} will no longer appear in your medical records.</p>
            <div className="form-actions">
              <Button variant="outline" onClick={() => setRemove(null)}>
                Keep document
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  try {
                    await api(`/documents/${remove.id}`, { method: "DELETE" });
                    setRemove(null);
                    await reload();
                    notify("Document removed.");
                  } catch (e) {
                    notify(e.message, "error");
                  }
                }}
              >
                Remove document
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
export function DocumentViewer({ document: d, doctor, onClose, onSaved }) {
  const { notify } = useApp(),
    [url, setUrl] = useState(""),
    [ocrText, setOcrText] = useState(d.ocrText || ""),
    [structured, setStructured] = useState(d.structured || ""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [fileError, setFileError] = useState("");
  useEffect(() => {
    let objectUrl,
      closed = false;
    documentBlob(d.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (!closed) setUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch((e) => setFileError(e.message));
    return () => {
      closed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [d.id]);
  async function save() {
    setBusy(true);
    try {
      await api(`/documents/${d.id}`, {
        method: "PATCH",
        body: { ocrText, structured },
      });
      await onSaved();
      notify("Document information saved for verification.");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function scan() {
    if (!d.mime.startsWith("image/")) return;
    setBusy(true);
    setProgress("Preparing image reader…");
    let worker;
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng", 1, {
        logger: (m) =>
          setProgress(`${m.status} ${Math.round((m.progress || 0) * 100)}%`),
      });
      const result = await worker.recognize(url);
      setOcrText(result.data.text);
      await api(`/documents/${d.id}`, {
        method: "PATCH",
        body: { ocrText: result.data.text },
      });
      await onSaved();
      setProgress("Text extracted. Please check it against the original.");
    } catch {
      setProgress(
        "Scanning could not finish. You can type or paste the document text below.",
      );
      notify(
        "Image scanning is unavailable. Your uploaded file is saved.",
        "error",
      );
    } finally {
      if (worker) await worker.terminate();
      setBusy(false);
    }
  }
  async function extract() {
    setBusy(true);
    try {
      await api(`/documents/${d.id}`, { method: "PATCH", body: { ocrText } });
      const r = await api(`/documents/${d.id}/extract`, { method: "POST" });
      setStructured(r.structured);
      setProgress(r.engine);
      await onSaved();
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Review medical document" onClose={onClose}>
      <div className="modal-body document-viewer">
        <p>
          <strong>{d.name}</strong> <Badge tone="neutral">{d.type}</Badge>
        </p>
        <div className="document-preview">
          {fileError ? (
            <p className="error">{fileError}</p>
          ) : !url ? (
            <Loading />
          ) : d.mime.startsWith("image/") ? (
            <img src={url} alt={d.name} />
          ) : d.mime === "application/pdf" ? (
            <iframe title={d.name} src={url} />
          ) : (
            <pre>{d.ocrText}</pre>
          )}
        </div>
        <div className="form-actions">
          {d.mime.startsWith("image/") && (
            <Button
              icon={ScanLine}
              onClick={scan}
              loading={busy}
              disabled={!url}
            >
              Read text from image
            </Button>
          )}
          {url && (
            <a className="btn outline" href={url} download={d.name}>
              <Download size={17} />
              Download original
            </a>
          )}
        </div>
        <p className="inline-note">
          {d.mime === "application/pdf"
            ? "PDF is saved for viewing. Automatic OCR supports images; enter text manually or upload a clear photo."
            : "OCR reads English text in this prototype. Review all extracted information."}
        </p>
        {progress && (
          <p className="ocr-progress" role="status">
            {progress}
          </p>
        )}
        <Field label="Extracted text — editable">
          <textarea
            rows="7"
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
            maxLength="20000"
            placeholder="Scan an image, or enter text from the document…"
          />
        </Field>
        <Button
          variant="secondary"
          onClick={extract}
          loading={busy}
          disabled={!ocrText.trim()}
        >
          Structure document information
        </Button>
        <Field label="Structured information — requires verification">
          <textarea
            rows="5"
            value={structured}
            onChange={(e) => setStructured(e.target.value)}
            maxLength="10000"
          />
        </Field>
        <div className="form-actions">
          <Button onClick={save} loading={busy}>
            Save changes
          </Button>
          {doctor && (
            <Button
              variant="secondary"
              icon={Check}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(`/documents/${d.id}`, {
                    method: "PATCH",
                    body: { ocrText, structured },
                  });
                  await api(`/documents/${d.id}`, {
                    method: "PATCH",
                    body: { verified: true },
                  });
                  await onSaved();
                  notify("Document information verified.");
                  onClose();
                } catch (e) {
                  notify(e.message, "error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save & verify
            </Button>
          )}
        </div>
        <Disclaimer />
      </div>
    </Modal>
  );
}
export function RecordsPage() {
  const { data, loading, error, reload } = useLoad("/patient");
  return (
    <>
      <PageHeading eyebrow="YOUR RECORDS, TOGETHER" title="Medical records">
        Prescriptions, reports, and the little details that help your doctor.
      </PageHeading>
      <section className="panel records-panel">
        {loading ? (
          <Loading />
        ) : error ? (
          <Empty
            title={error}
            action={<Button onClick={reload}>Retry</Button>}
          />
        ) : (
          <DocumentManager documents={data.documents} reload={reload} />
        )}
      </section>
    </>
  );
}
export function MedicationsPage() {
  const { data, loading, error, reload } = useLoad("/patient"),
    { notify } = useApp(),
    [show, setShow] = useState(false),
    [scan, setScan] = useState(false),
    [form, setForm] = useState({ name: "", schedule: "" }),
    [busy, setBusy] = useState(false);
  async function setTaking(id, taking) {
    try {
      await api(`/medications/${id}`, { method: "PATCH", body: { taking } });
      await reload();
      notify("Medication status updated.");
    } catch (e) {
      notify(e.message, "error");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE HELP REMEMBERING"
        title="My medicines"
        action={
          <Button icon={Plus} onClick={() => setShow(true)}>
            Add a medicine
          </Button>
        }
      >
        What you take, when you take it — ready for your doctor to review.
      </PageHeading>
      <div className="medicine-note">
        <ShieldCheck size={20} />
        <p>
          This is a record of medicines you report taking. Only your doctor can
          advise you to start, stop, or change a medicine.
        </p>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <Empty title={error} />
      ) : (
        <div className="medicine-grid">
          {data.medications.map((m) => (
            <article key={m.id} className="panel medicine-card">
              <span className="icon-box violet">
                <Pill size={28} />
              </span>
              <Badge tone="neutral">{m.source}</Badge>
              <h2>{m.name}</h2>
              <p className="muted">{m.schedule}</p>
              <hr />
              <h3>Are you still taking this?</h3>
              <div className="taking-choices">
                {["Yes", "No", "Not sure"].map((v) => (
                  <button
                    key={v}
                    className={m.taking === v ? "selected" : ""}
                    onClick={() => setTaking(m.id, v)}
                  >
                    {m.taking === v && <Check size={16} />} {v}
                  </button>
                ))}
              </div>
            </article>
          ))}
          <article className="medicine-scan">
            <span className="icon-box blue">
              <ScanLine size={28} />
            </span>
            <h2>Can’t remember the name?</h2>
            <p>
              You don’t need to guess. Add a photo of your prescription and
              review the text with your doctor.
            </p>
            <Button icon={Camera} onClick={() => setScan(true)}>
              Scan prescription
            </Button>
          </article>
        </div>
      )}
      {show && (
        <Modal title="Add a reported medicine" onClose={() => setShow(false)}>
          <form
            className="modal-body"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api("/medications", { method: "POST", body: form });
                await reload();
                setShow(false);
                setForm({ name: "", schedule: "" });
                notify("Medicine added for doctor review.");
              } catch (e) {
                notify(e.message, "error");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field
              label="Medicine name and strength"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="As written on your prescription"
            />
            <Field
              label="When do you take it?"
              required
              value={form.schedule}
              onChange={(e) => setForm({ ...form, schedule: e.target.value })}
              placeholder="As directed by your doctor"
            />
            <Button type="submit" loading={busy}>
              Save medicine
            </Button>
          </form>
        </Modal>
      )}
      {scan && (
        <Modal title="Upload your prescription" onClose={() => setScan(false)}>
          <div className="modal-body">
            <DocumentManager documents={[]} reload={reload} compact />
          </div>
        </Modal>
      )}
    </>
  );
}
const ayushQuestions = [
  [
    "appetite",
    "What is your usual appetite?",
    Flame,
    ["Good", "Low", "Irregular"],
  ],
  [
    "temperature",
    "How does your body usually feel?",
    Sun,
    ["Often feel hot", "Often feel cold", "Somewhere in between"],
  ],
  [
    "sleep",
    "How has your sleep been?",
    Moon,
    ["Usually restful", "Often interrupted", "Irregular"],
  ],
  [
    "digestion",
    "How is your digestion usually?",
    Leaf,
    ["Regular", "Often constipated", "Often loose"],
  ],
  [
    "activity",
    "How active is a usual day?",
    Activity,
    ["Low", "Moderate", "Active"],
  ],
];
export function AyushSummary({ profile }) {
  if (!profile)
    return (
      <Empty icon={Leaf} title="No AYUSH profile yet">
        Lifestyle information will appear here when the patient adds it.
      </Empty>
    );
  return (
    <div className="ayush-summary">
      <Badge>
        <Leaf size={14} /> AYURVEDA INFORMATION SUMMARY
      </Badge>
      <h2>A picture of your everyday wellbeing.</h2>
      <p>{profile.summary}</p>
      <div className="ayush-parameters">
        <InfoRow label="Prakriti">Practitioner assessment needed</InfoRow>
        <InfoRow label="Vikriti">Not assessed</InfoRow>
        <InfoRow label="Agni · reported appetite">{profile.appetite}</InfoRow>
        <InfoRow label="Kostha · reported digestion">
          {profile.digestion}
        </InfoRow>
        <InfoRow label="Ahara–Vihara · routine">
          {profile.activity} activity · {profile.sleep}
        </InfoRow>
      </div>
      <p className="inline-note">
        These are self-reported observations. They do not establish a
        constitution, diagnosis, or treatment plan.
      </p>
    </div>
  );
}
export function AyushPage() {
  const { data, loading, reload } = useLoad("/patient"),
    { notify } = useApp(),
    [form, setForm] = useState({}),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(false);
  useEffect(() => {
    if (data?.ayush) setForm(data.ayush);
  }, [data]);
  async function save() {
    setBusy(true);
    try {
      await api("/ayush", { method: "PUT", body: form });
      await reload();
      setEditing(false);
      notify("AYUSH profile saved for your care team.");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="A MORE HOLISTIC HEALTH STORY"
        title="Your AYUSH health profile"
        action={
          data?.ayush && !editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              Update my answers
            </Button>
          ) : null
        }
      >
        Simple questions about how you feel and how you live.
      </PageHeading>
      {loading ? (
        <Loading />
      ) : (
        <div className="ayush-layout">
          <section className="panel ayush-form">
            {data?.ayush && !editing ? (
              <AyushSummary profile={data.ayush} />
            ) : (
              <>
                {ayushQuestions.map(([key, q, Icon, options], i) => (
                  <div className="ayush-question" key={key}>
                    <div className="ayush-question-title">
                      <span className="icon-box">
                        <Icon size={22} />
                      </span>
                      <h3>{q}</h3>
                      <small>0{i + 1}</small>
                    </div>
                    <div className="answer-options">
                      {[...options, "I don’t know"].map((o) => (
                        <button
                          key={o}
                          className={`answer-option ${form[key] === o ? "selected" : ""}`}
                          onClick={() => setForm({ ...form, [key]: o })}
                        >
                          {o}
                          {form[key] === o && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <Button
                  onClick={save}
                  loading={busy}
                  disabled={!ayushQuestions.every(([k]) => form[k])}
                >
                  Save profile for doctor <ArrowRight size={17} />
                </Button>
              </>
            )}
          </section>
          <aside className="ayush-side">
            <span className="icon-box">
              <Leaf size={30} />
            </span>
            <h2>Wellbeing has many sides.</h2>
            <p>
              Your daily habits can help an AYUSH practitioner understand your
              health story.
            </p>
            <div>
              <Sun />
              <Snowflake />
              <Scale />
            </div>
            <p>
              There are no right or wrong answers. Choose what feels closest to
              your experience.
            </p>
            <Badge>Self-reported · Practitioner reviewed</Badge>
          </aside>
        </div>
      )}
    </>
  );
}
export function AppointmentsPage({ doctor = false }) {
  const { data, loading, error, reload } = useLoad(
      doctor ? "/doctor/dashboard" : "/patient",
    ),
    { data: doctors } = useLoad("/doctors"),
    { notify } = useApp(),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState({
      doctorId: "DOC-001",
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      time: "09:00",
      reason: "",
    });
  async function change(id, status) {
    try {
      await api(`/appointments/${id}`, { method: "PATCH", body: { status } });
      await reload();
      notify(`Appointment ${status.toLowerCase()}.`);
    } catch (e) {
      notify(e.message, "error");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="YOUR NEXT CONVERSATION"
        title="Appointments"
        action={
          !doctor ? (
            <Button icon={Plus} onClick={() => setShow(true)}>
              Book a consultation
            </Button>
          ) : null
        }
      >
        {doctor
          ? "A simple overview of your scheduled patient visits."
          : "Make time for your health. We’ll keep the details together."}
      </PageHeading>
      {loading ? (
        <Loading />
      ) : error ? (
        <Empty title={error} />
      ) : (
        <div className="appointment-list">
          {data.appointments.length ? (
            data.appointments
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((a) => (
                <article className="panel appointment-card" key={a.id}>
                  <div className="appointment-date">
                    <strong>{new Date(a.date).getDate()}</strong>
                    <span>
                      {new Date(a.date).toLocaleDateString("en-IN", {
                        month: "short",
                      })}
                    </span>
                  </div>
                  <div className="appointment-main">
                    <Badge
                      tone={
                        a.status === "Booked"
                          ? "blue"
                          : a.status === "Completed"
                            ? "teal"
                            : "neutral"
                      }
                    >
                      {a.status}
                    </Badge>
                    <h2>
                      {doctor
                        ? a.patient.name
                        : doctors?.find((d) => d.id === a.doctorId)?.name ||
                          "Your doctor"}
                    </h2>
                    <p>{a.reason}</p>
                    <small>
                      <Clock size={15} />
                      {a.time} · {dateLabel(a.date)}{" "}
                      <span>· In-person consultation</span>
                    </small>
                  </div>
                  {a.status === "Booked" && (
                    <div className="appointment-actions">
                      {doctor && (
                        <Button
                          variant="secondary"
                          onClick={() => change(a.id, "Completed")}
                        >
                          Mark completed
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() =>
                          change(a.id, doctor ? "Rejected" : "Cancelled")
                        }
                      >
                        {doctor ? "Decline" : "Cancel appointment"}
                      </Button>
                    </div>
                  )}
                </article>
              ))
          ) : (
            <Empty
              icon={CalendarDays}
              title="A little space for your next visit"
            >
              {doctor
                ? "No appointments have been booked yet."
                : "Book a consultation when you’re ready."}
            </Empty>
          )}
        </div>
      )}
      {show && (
        <Modal title="Book a consultation" onClose={() => setShow(false)}>
          <form
            className="modal-body"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api("/appointments", { method: "POST", body: form });
                await reload();
                setShow(false);
                notify("Your consultation is booked.");
              } catch (e) {
                notify(e.message, "error");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Choose a doctor">
              <select
                value={form.doctorId}
                onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
              >
                {doctors?.map((d) => (
                  <option value={d.id} key={d.id}>
                    {d.name} · {d.specialty}
                  </option>
                ))}
              </select>
            </Field>
            <div className="form-grid">
              <Field
                label="Date"
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <Field label="Preferred time">
                <select
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                >
                  {[
                    "09:00",
                    "09:30",
                    "10:00",
                    "10:30",
                    "11:00",
                    "11:30",
                    "14:00",
                    "14:30",
                    "15:00",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="What would you like to discuss?">
              <textarea
                required
                minLength="3"
                maxLength="500"
                rows="3"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </Field>
            <p className="inline-note">
              This creates a demonstration appointment. No real clinic will be
              contacted.
            </p>
            <Button loading={busy} type="submit">
              Confirm appointment
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
