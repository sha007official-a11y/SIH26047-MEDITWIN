import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Languages,
  Mic,
  Hand,
  Users,
  ShieldCheck,
  UserRound,
  HeartPulse,
  Sparkles,
  FileCheck2,
  Files,
  Send,
  Check,
  ArrowRight,
  ArrowLeft,
  Leaf,
  Lock,
  CheckCircle2,
  Edit3,
  Clock,
} from "lucide-react";
import { useLoad, useApp } from "../lib/context";
import { api } from "../lib/api";
import { languages, t, localQuestion, localOption } from "../lib/languages";
import {
  PageHeading,
  Button,
  Badge,
  Loading,
  Empty,
  Field,
  Disclaimer,
  InfoRow,
  Modal,
} from "../components/ui";
import BodyMap from "../components/BodyMap";
import { VoiceInput, ReadAloud } from "../components/Voice";
import { DocumentManager } from "./Records";
const steps = [
  ["Your language", Languages],
  ["Your way", Mic],
  ["Consent", ShieldCheck],
  ["Body map", UserRound],
  ["Your story", Sparkles],
  ["Understanding", FileCheck2],
  ["Documents", Files],
  ["Review & share", Send],
];
export const summaryLabels = {
  complaint: "Chief complaint",
  duration: "Duration",
  severity: "Severity",
  associatedSymptoms: "Associated symptoms",
  medication: "Current medication",
  allergies: "Allergies",
  medicalHistory: "Medical history",
};
export function Summary({ summary, editing = false, onChange }) {
  return (
    <div className={`summary-grid ${editing ? "editing" : ""}`}>
      {Object.entries(summaryLabels).map(([k, label]) =>
        editing ? (
          <Field label={label} key={k}>
            <textarea
              value={summary?.[k] || ""}
              onChange={(e) => onChange({ ...summary, [k]: e.target.value })}
              rows={k === "medicalHistory" ? 3 : 2}
            />
          </Field>
        ) : (
          <div
            className={`summary-item ${k === "complaint" ? "chief" : ""}`}
            key={k}
          >
            <span>{label}</span>
            <strong>{summary?.[k] || "Not provided"}</strong>
          </div>
        ),
      )}
    </div>
  );
}
export default function Assessment() {
  const { id } = useParams(),
    navigate = useNavigate(),
    { notify, services } = useApp(),
    { data, loading, error, setData, reload } = useLoad(`/assessments/${id}`),
    { data: patientData, reload: reloadPatient } = useLoad("/patient"),
    { data: doctors } = useLoad("/doctors");
  const [busy, setBusy] = useState(false),
    [question, setQuestion] = useState(null),
    [questionLoading, setQuestionLoading] = useState(false),
    [answer, setAnswer] = useState(""),
    [edit, setEdit] = useState(false),
    [doctorId, setDoctorId] = useState("DOC-001"),
    [privacy, setPrivacy] = useState(false),
    [abhaMessage, setAbhaMessage] = useState(""),
    [done, setDone] = useState(false);
  const a = data,
    step = a?.step || 0,
    lang = a?.language || "English";
  useEffect(() => {
    if (a?.step !== 4) return;
    let cancelled = false;
    setQuestionLoading(true);
    api(`/assessments/${id}/question`)
      .then((q) => {
        if (!cancelled) {
          setQuestion(q);
          setAnswer("");
        }
      })
      .catch((e) => notify(e.message, "error"))
      .finally(() => {
        if (!cancelled) setQuestionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, a?.step, JSON.stringify(a?.answers)]);
  function update(k, v) {
    setData((x) => ({ ...x, [k]: v }));
  }
  async function save(body) {
    const r = await api(`/assessments/${id}`, { method: "PATCH", body });
    setData(r);
    return r;
  }
  async function exitAssessment() {
    setBusy(true);
    try {
      const body = {
        language: lang,
        mode: a.mode,
        helper:
          a.helper ||
          (a.mode === "Helper" ? "Family member" : "I am the patient"),
        relationship: a.relationship || "",
        consent: !!a.consent,
        identityType: a.identityType || "New Patient",
        abha: a.abha || "",
        step,
      };
      if (a.bodyArea) body.bodyArea = a.bodyArea;
      if (step === 4 && question?.key && answer.trim())
        body.answers = { ...a.answers, [question.key]: answer.trim() };
      if (step === 5 && edit) body.summary = a.summary;
      await save(body);
      notify("Your progress has been saved.");
      navigate("/patient");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function next() {
    setBusy(true);
    try {
      const patch = { step: step + 1 };
      if (step === 0) patch.language = lang;
      if (step === 1)
        Object.assign(patch, {
          mode: a.mode,
          helper:
            a.helper ||
            (a.mode === "Helper" ? "Family member" : "I am the patient"),
          relationship: a.relationship || "",
        });
      if (step === 2)
        Object.assign(patch, {
          consent: a.consent,
          identityType: a.identityType || "New Patient",
          abha: a.abha || "",
        });
      if (step === 3) patch.bodyArea = a.bodyArea;
      if (step === 5) {
        patch.summary = a.summary;
        patch.patientVerified = true;
      }
      await save(patch);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function back() {
    setBusy(true);
    try {
      await save({ step: Math.max(0, step - 1) });
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function respond() {
    if (!answer.trim()) return;
    setBusy(true);
    try {
      await save({ answers: { ...a.answers, [question.key]: answer.trim() } });
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function summarize() {
    setBusy(true);
    try {
      const r = await api(`/assessments/${id}/summary`, { method: "POST" });
      if (r.warning) notify(r.warning);
      await save({ step: 5 });
      setEdit(false);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    setBusy(true);
    try {
      await api(`/assessments/${id}/submit`, {
        method: "POST",
        body: { doctorId },
      });
      setDone(true);
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
        title="Your assessment couldn’t be opened"
        action={<Button onClick={reload}>Try again</Button>}
      >
        {error}
      </Empty>
    );
  if (done || a.status !== "draft")
    return (
      <div className="success-page">
        <span className="success-icon">
          <CheckCircle2 size={48} />
        </span>
        <Badge>YOUR STORY IS IN CARING HANDS</Badge>
        <h1>You’re ready for the next step.</h1>
        <p>
          Your health information has been successfully sent to the doctor.
          <br />
          Your care team can now review your story and records.
        </p>
        <div className="success-details">
          <InfoRow label="Patient">{patientData?.patient.name}</InfoRow>
          <InfoRow label="Summary">{a.summary?.complaint}</InfoRow>
          <InfoRow label="Status">Shared with doctor</InfoRow>
        </div>
        <div className="form-actions">
          <Link className="btn" to="/patient/appointments">
            Book a consultation <ArrowRight size={17} />
          </Link>
          <Link className="btn outline" to="/patient">
            Back to my health space
          </Link>
        </div>
      </div>
    );
  const questionText =
    question?.engine === "Gemini"
      ? question.text
      : localQuestion(lang, question?.key, question?.text || "");
  return (
    <div className="assessment">
      <PageHeading
        eyebrow="ONE STEP AT A TIME"
        title="Let’s tell your health story."
        action={
          <button
            className="text-link save-exit"
            disabled={busy}
            onClick={exitAssessment}
          >
            Save & exit <ArrowUpRightSmall />
          </button>
        }
      >
        A little understanding makes a world of difference.
      </PageHeading>
      <div className="stepper" aria-label="Assessment progress">
        {steps.map(([label, Icon], i) => (
          <div
            key={label}
            className={`step ${i === step ? "current" : i < step ? "complete" : ""}`}
            aria-current={i === step ? "step" : undefined}
          >
            <span>{i < step ? <Check size={17} /> : <Icon size={17} />}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <div className="assessment-layout">
        <section className="assessment-card">
          <div className="assessment-card-top">
            <span>STEP {String(step + 1).padStart(2, "0")} OF 08</span>
            <Badge tone="blue">
              {a.mode === "Helper" ? "Helper mode active" : lang}
            </Badge>
          </div>
          {step === 0 && (
            <>
              <div className="step-intro">
                <span className="icon-box blue">
                  <Languages size={27} />
                </span>
                <h2>
                  {languages.find((x) => x.name === lang)?.greeting}{" "}
                  <span>👋</span>
                </h2>
                <p>
                  Let’s take care of your health.
                  <br />
                  Choose the language that feels like home.
                </p>
              </div>
              <div className="language-choices">
                {languages.map((l) => (
                  <button
                    key={l.name}
                    className={`language-choice ${lang === l.name ? "selected" : ""}`}
                    onClick={() => update("language", l.name)}
                    aria-pressed={lang === l.name}
                  >
                    <strong>{l.name}</strong>
                    <small>{l.sub}</small>
                    {lang === l.name ? (
                      <Check size={18} />
                    ) : (
                      <span className="radio-circle" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div className="step-intro">
                <h2>{t(lang, "mode")}</h2>
                <p>There’s no wrong way. Choose what’s comfortable for you.</p>
              </div>
              <div className="mode-choices">
                {[
                  ["Speak", Mic, "Talk naturally", "blue"],
                  ["Tap", Hand, "Select your answers", "teal"],
                  ["Helper", Users, "Family or staff support", "violet"],
                ].map(([value, Icon, label, tone]) => (
                  <button
                    className={`mode-choice ${a.mode === value ? "selected" : ""}`}
                    key={value}
                    onClick={() => update("mode", value)}
                    aria-pressed={a.mode === value}
                  >
                    <span className={`icon-box ${tone}`}>
                      <Icon size={30} />
                    </span>
                    <strong>{t(lang, value.toLowerCase())}</strong>
                    <small>{label}</small>
                    <span className="choice-check">
                      {a.mode === value ? <Check size={16} /> : null}
                    </span>
                  </button>
                ))}
              </div>
              {a.mode === "Helper" && (
                <div className="helper-form">
                  <Field label="Who is answering?">
                    <select
                      value={a.helper || "Family member"}
                      onChange={(e) => update("helper", e.target.value)}
                    >
                      {[
                        "I am the patient",
                        "Family member",
                        "Medical staff",
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </Field>
                  {(!a.helper || a.helper === "Family member") && (
                    <Field label="Relationship to the patient">
                      <select
                        value={a.relationship || ""}
                        onChange={(e) => update("relationship", e.target.value)}
                      >
                        <option value="">Choose relationship</option>
                        {["Son", "Daughter", "Spouse", "Parent", "Other"].map(
                          (x) => (
                            <option key={x}>{x}</option>
                          ),
                        )}
                      </select>
                    </Field>
                  )}
                </div>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <div className="step-intro">
                <span className="icon-box">
                  <ShieldCheck size={27} />
                </span>
                <h2>A little about you. Your permission.</h2>
                <p>Your health information belongs to you.</p>
              </div>
              <div className="segmented">
                {["New Patient", "Existing Patient"].map((x) => (
                  <button
                    key={x}
                    className={
                      (a.identityType || "New Patient") === x ? "selected" : ""
                    }
                    onClick={() => update("identityType", x)}
                  >
                    {x}
                  </button>
                ))}
              </div>
              <Field label="Your patient ID" readOnly value={a.patientId} />
              <Field label="ABHA number (optional)">
                <div className="input-action">
                  <input
                    value={a.abha || ""}
                    onChange={(e) => {
                      update("abha", e.target.value);
                      setAbhaMessage("");
                    }}
                    placeholder="12-3456-7890-1234"
                  />
                  <Button
                    variant="outline"
                    disabled={!a.abha}
                    onClick={async () => {
                      try {
                        const r = await api("/mock/abha/verify", {
                          method: "POST",
                          body: { number: a.abha },
                        });
                        setAbhaMessage(r.message);
                      } catch (e) {
                        notify(e.message, "error");
                      }
                    }}
                  >
                    Check demo ID
                  </Button>
                </div>
              </Field>
              {abhaMessage && <p className="inline-note">{abhaMessage}</p>}
              <Badge tone="neutral">ABHA: MOCK API — PROTOTYPE</Badge>
              <label className="consent-box">
                <input
                  type="checkbox"
                  checked={!!a.consent}
                  onChange={(e) => update("consent", e.target.checked)}
                />
                <span>
                  <strong>
                    I agree to share my health information for better treatment.
                  </strong>
                  <small>
                    The assigned doctor can review the information I submit.
                    This prototype is for fictional records only.
                  </small>
                </span>
              </label>
              <button className="text-link" onClick={() => setPrivacy(true)}>
                Read privacy information <ShieldCheck size={15} />
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <div className="step-intro">
                <h2>{t(lang, "where")}</h2>
                <p>You don’t need medical words. Just show us.</p>
              </div>
              <BodyMap
                value={a.bodyArea}
                language={lang}
                onChange={(v) => update("bodyArea", v)}
              />
            </>
          )}
          {step === 4 && (
            <>
              {questionLoading ? (
                <Loading />
              ) : question?.done ? (
                <div className="step-intro story-complete">
                  <span className="success-icon">
                    <Check size={35} />
                  </span>
                  <h2>Thank you for sharing.</h2>
                  <p>
                    Let’s bring your answers together so you can check them.
                  </p>
                  <Button onClick={summarize} loading={busy}>
                    Review what we understood <ArrowRight size={17} />
                  </Button>
                  <button
                    className="text-link"
                    onClick={async () => {
                      try {
                        await save({ answers: {} });
                      } catch (e) {
                        notify(e.message, "error");
                      }
                    }}
                  >
                    Answer the questions again
                  </button>
                </div>
              ) : (
                question && (
                  <div className="question-screen">
                    <div className="question-meta">
                      <Badge>
                        <Sparkles size={14} />
                        {question.engine}
                      </Badge>
                      <span>
                        {Object.keys(a.answers || {}).length + 1} of 8 questions
                      </span>
                    </div>
                    <div className="question-progress">
                      <i
                        style={{
                          width: `${(Object.keys(a.answers || {}).length / 8) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="assistant-icon">
                      <HeartPulse size={29} />
                    </span>
                    <h2>{questionText}</h2>
                    <ReadAloud text={questionText} language={lang} />
                    <div className="answer-options">
                      {question.options.map((o) => (
                        <button
                          key={o}
                          className={`answer-option ${answer === o ? "selected" : ""}`}
                          onClick={() => setAnswer(o)}
                          aria-pressed={answer === o}
                        >
                          {localOption(lang, o)}
                          {answer === o && <Check size={17} />}
                        </button>
                      ))}
                    </div>
                    <Field label={t(lang, "answer")}>
                      <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Type here, choose above, or use your voice…"
                        rows="3"
                        maxLength="3000"
                      />
                    </Field>
                    <div className="question-actions">
                      <VoiceInput language={lang} onText={setAnswer} />
                      <button
                        className="text-link unknown-option"
                        onClick={() => setAnswer(t(lang, "unknown"))}
                      >
                        {t(lang, "unknown")}
                      </button>
                    </div>
                    <Button
                      className="full"
                      loading={busy}
                      disabled={!answer.trim()}
                      onClick={respond}
                    >
                      {t(lang, "next")} <ArrowRight size={17} />
                    </Button>
                  </div>
                )
              )}
            </>
          )}
          {step === 5 && (
            <>
              <div className="step-intro">
                <span className="icon-box">
                  <CheckCircle2 size={28} />
                </span>
                <h2>{t(lang, "understood")}</h2>
                <p>Your story, in a few clear points. Does this feel right?</p>
              </div>
              <Summary
                summary={a.summary}
                editing={edit}
                onChange={(s) => update("summary", s)}
              />
              <div className="understanding-actions">
                <Button
                  variant="outline"
                  icon={Edit3}
                  onClick={() => setEdit(!edit)}
                >
                  {edit ? "Preview summary" : t(lang, "change")}
                </Button>
                <Button loading={busy} icon={Check} onClick={next}>
                  {t(lang, "yes")}
                </Button>
              </div>
              <Disclaimer />
            </>
          )}
          {step === 6 && (
            <>
              <div className="step-intro">
                <span className="icon-box blue">
                  <Files size={28} />
                </span>
                <h2>A few records can tell a bigger story.</h2>
                <p>
                  Add prescriptions, reports, or discharge summaries. You can
                  also skip this step.
                </p>
              </div>
              <DocumentManager
                documents={
                  patientData?.documents.filter((d) => d.assessmentId === id) ||
                  []
                }
                assessmentId={id}
                reload={reloadPatient}
                compact
              />
            </>
          )}
          {step === 7 && (
            <>
              <div className="step-intro">
                <span className="icon-box">
                  <Send size={27} />
                </span>
                <h2>Ready to share with your doctor?</h2>
                <p>One last look, then you’re all set.</p>
              </div>
              <div className="review-patient">
                <strong>{patientData?.patient.name}</strong>
                <Badge tone="blue">{a.patientId}</Badge>
              </div>
              <Summary summary={a.summary} />
              <div className="review-extra">
                <InfoRow label="Documents">
                  {patientData?.documents.filter((d) => d.assessmentId === id)
                    .length || 0}{" "}
                  attached
                </InfoRow>
                <InfoRow label="AYUSH profile">
                  {patientData?.ayush
                    ? "Available to your doctor"
                    : "Not added"}
                </InfoRow>
                <InfoRow label="Answering mode">
                  {a.mode}
                  {a.mode === "Helper"
                    ? ` · ${a.helper} ${a.relationship || ""}`
                    : ""}
                </InfoRow>
              </div>
              <Field label="Share with">
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                >
                  {doctors?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.specialty}
                    </option>
                  ))}
                </select>
              </Field>
              {!a.patientVerified && (
                <div className="error-box">
                  Your information changed. Please{" "}
                  <button
                    className="text-link"
                    onClick={() => save({ step: 5 })}
                  >
                    verify your summary
                  </button>{" "}
                  before sharing.
                </div>
              )}
              <Button
                className="full"
                loading={busy}
                disabled={!a.patientVerified || !a.consent}
                icon={Send}
                onClick={submit}
              >
                {t(lang, "send")}
              </Button>
              <Disclaimer />
            </>
          )}
          {![4, 5, 7].includes(step) && (
            <div className="step-actions">
              <Button
                variant="outline"
                disabled={step === 0 || busy}
                onClick={back}
                icon={ArrowLeft}
              >
                {t(lang, "back")}
              </Button>
              <Button
                onClick={next}
                loading={busy}
                disabled={
                  (step === 2 && !a.consent) ||
                  (step === 3 && !a.bodyArea) ||
                  (step === 1 &&
                    a.mode === "Helper" &&
                    (!a.helper || a.helper === "Family member") &&
                    !a.relationship)
                }
              >
                {step === 6 ? "Continue to review" : t(lang, "next")}
                <ArrowRight size={17} />
              </Button>
            </div>
          )}
          {[4, 5, 7].includes(step) && (
            <button
              className="text-link step-back"
              onClick={back}
              disabled={busy}
            >
              <ArrowLeft size={16} />
              {t(lang, "back")}
            </button>
          )}
        </section>
        <aside className="assessment-support">
          <div className="support-heart">
            <HeartPulse size={30} />
          </div>
          <h3>We’re here to listen.</h3>
          <p>Take your time. You can pause and come back whenever you need.</p>
          <div className="support-tip">
            <ShieldCheck size={19} />
            <div>
              <strong>Always in your control</strong>
              <p>You check your story before sharing it with your doctor.</p>
            </div>
          </div>
          <div className="support-tip">
            <Users size={19} />
            <div>
              <strong>A helping hand is welcome</strong>
              <p>A family member or care worker can help you answer.</p>
            </div>
          </div>
          <div className="support-tip">
            <CheckCircle2 size={19} />
            <div>
              <strong>It’s okay not to know</strong>
              <p>There’s always an “I don’t know” option.</p>
            </div>
          </div>
          <div className="support-bottom">
            <Lock size={14} />
            <span>Your progress is saved on this demo server</span>
          </div>
        </aside>
      </div>
      {privacy && (
        <Modal
          title="Your information, your choice"
          onClose={() => setPrivacy(false)}
        >
          <div className="modal-body">
            <p>
              Your answers and documents are saved on this prototype server.
              Submitted cases are visible to your selected doctor. If Gemini or
              Cloudinary is configured, those services process the information
              you send.
            </p>
            <p>
              Only enter fictional demonstration information. ABHA is a
              simulated service and does not verify your real identity.
            </p>
            <Button onClick={() => setPrivacy(false)}>Understood</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function ArrowUpRightSmall() {
  return <ArrowRight size={16} />;
}
