import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { z } from "zod";
import { randomUUID, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { initStore, read, mutate, dataDir, mode } from "./store.js";
import { makeSummary, questionBank, gemini, summarySchema } from "./ai.js";
const id = (prefix) => `${prefix}-${randomUUID().slice(0, 12)}`;
const now = () => new Date().toISOString();
const error = (status, message) =>
  Object.assign(new Error(message), { status });
const text = z.string().trim().max(3000);
const answerSchema = z.record(z.string().max(50), text);
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  mobile: u.mobile,
  role: u.role,
});
export async function createApp() {
  await initStore();
  let secret = process.env.JWT_SECRET;
  if (!secret) {
    if (mode !== "demo") throw Error("JWT_SECRET is required with MySQL");
    const f = path.join(dataDir, ".jwt-secret");
    try {
      secret = await fs.readFile(f, "utf8");
    } catch {
      secret = randomBytes(48).toString("hex");
      await fs.writeFile(f, secret);
    }
  }
  if (secret.length < 32)
    throw Error("JWT_SECRET must contain at least 32 characters");
  const app = express();
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => {
        const allowed = (
          process.env.FRONTEND_ORIGIN ||
          "http://127.0.0.1:5173,http://localhost:5173"
        ).split(",");
        cb(null, !origin || allowed.includes(origin));
      },
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 240,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  const cloud = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
  if (cloud)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  app.get("/api/health", (req, res) =>
    res.json({
      status: "ok",
      prototype: true,
      storage: mode === "mysql" ? "MySQL" : "Local demo storage",
      ai: process.env.GEMINI_API_KEY
        ? "Gemini configured"
        : "Demo question engine",
      files: cloud ? "Cloudinary configured" : "Local demo uploads",
      abha: "MOCK API — PROTOTYPE",
      his: "MOCK API — PROTOTYPE",
      demoAccounts: mode === "demo" || process.env.SEED_DEMO === "true",
    }),
  );
  const auth = (role) => (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace(/^Bearer /, "");
      req.auth = jwt.verify(token, secret, {
        algorithms: ["HS256"],
        issuer: "swasthyasetu",
        audience: "swasthyasetu-app",
      });
      const u = read().users.find((x) => x.id === req.auth.sub);
      if (!u || u.role !== req.auth.role) throw Error();
      if (role && req.auth.role !== role)
        return next(
          error(403, "This action is not available for your account."),
        );
      next();
    } catch {
      next(error(401, "Please log in to continue."));
    }
  };
  const patientFor = (s, req) =>
    s.patients.find((p) => p.userId === req.auth.sub);
  const doctorFor = (s, req) =>
    s.doctors.find((d) => d.userId === req.auth.sub);
  const hasPatientAccess = (s, req, pid) =>
    req.auth.role === "patient"
      ? patientFor(s, req)?.id === pid
      : s.assessments.some(
          (a) =>
            a.patientId === pid &&
            a.doctorId === doctorFor(s, req)?.id &&
            a.status !== "draft" &&
            a.consent,
        );
  const requireCase = (s, req, caseId) => {
    const a = s.assessments.find((x) => x.id === caseId);
    if (
      !a ||
      !hasPatientAccess(s, req, a.patientId) ||
      (req.auth.role === "doctor" &&
        (a.status === "draft" || a.doctorId !== doctorFor(s, req)?.id))
    )
      throw error(404, "Assessment not found.");
    return a;
  };
  const session = (u) => ({
    user: publicUser(u),
    token: jwt.sign({ role: u.role }, secret, {
      subject: u.id,
      expiresIn: "8h",
      issuer: "swasthyasetu",
      audience: "swasthyasetu-app",
    }),
  });
  app.post(
    "/api/auth/login",
    rateLimit({
      windowMs: 15 * 60000,
      limit: 35,
      standardHeaders: true,
      legacyHeaders: false,
    }),
    async (req, res) => {
      const b = z
        .object({
          identifier: z.string().min(3).max(150),
          password: z.string().min(1).max(200),
          role: z.enum(["patient", "doctor"]),
        })
        .parse(req.body);
      const u = read().users.find(
        (x) =>
          (x.email.toLowerCase() === b.identifier.toLowerCase() ||
            x.mobile === b.identifier ||
            x.id === b.identifier ||
            read().doctors.some(
              (d) => d.id === b.identifier && d.userId === x.id,
            )) &&
          x.role === b.role,
      );
      if (!u || !(await bcrypt.compare(b.password, u.passwordHash)))
        throw error(401, "The login details did not match. Please try again.");
      res.json(session(u));
    },
  );
  app.post("/api/auth/register", async (req, res) => {
    const b = z
      .object({
        name: z.string().trim().min(2).max(80),
        email: z.email().max(150),
        mobile: z.string().regex(/^\d{10}$/),
        password: z.string().min(8).max(100),
        age: z.coerce.number().int().min(1).max(120),
        gender: z.enum(["Female", "Male", "Other", "Prefer not to say"]),
        abha: z.string().max(20).optional(),
      })
      .parse(req.body);
    const hash = await bcrypt.hash(b.password, 12);
    const user = await mutate((s) => {
      if (
        s.users.some(
          (x) =>
            x.email.toLowerCase() === b.email.toLowerCase() ||
            x.mobile === b.mobile,
        )
      )
        throw error(
          409,
          "An account with that email or mobile already exists.",
        );
      const u = {
        id: id("user"),
        name: b.name,
        email: b.email.toLowerCase(),
        mobile: b.mobile,
        passwordHash: hash,
        role: "patient",
      };
      s.users.push(u);
      s.patients.push({
        id: id("SS").toUpperCase(),
        userId: u.id,
        name: b.name,
        age: b.age,
        gender: b.gender,
        abha: b.abha || "",
        language: "English",
        medicalHistory: "Not provided",
        allergies: "Not provided",
        createdAt: now(),
      });
      return u;
    });
    res.status(201).json(session(user));
  });
  app.get("/api/me", auth(), (req, res) =>
    res.json(publicUser(read().users.find((x) => x.id === req.auth.sub))),
  );
  app.get("/api/doctors", auth(), (req, res) => res.json(read().doctors));
  const visibleIdentity = (p) => ({
    id: p.id,
    name: p.name,
    age: p.age,
    gender: p.gender,
  });
  const patientData = (s, pid, doctorId) => ({
    patient: s.patients.find((x) => x.id === pid),
    assessments: s.assessments
      .filter(
        (x) =>
          x.patientId === pid &&
          (!doctorId || (x.doctorId === doctorId && x.status !== "draft")),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    documents: s.documents.filter(
      (x) =>
        x.patientId === pid &&
        !x.deleted &&
        (!doctorId ||
          !x.assessmentId ||
          s.assessments.some(
            (a) =>
              a.id === x.assessmentId &&
              a.status !== "draft" &&
              a.doctorId === doctorId,
          )),
    ),
    timeline: s.timeline
      .filter((x) => x.patientId === pid)
      .sort((a, b) => b.date.localeCompare(a.date)),
    medications: s.medications.filter((x) => x.patientId === pid),
    appointments: s.appointments.filter(
      (x) => x.patientId === pid && (!doctorId || x.doctorId === doctorId),
    ),
    ayush: s.ayush.find((x) => x.patientId === pid),
    notes: s.notes.filter(
      (x) => x.patientId === pid && (!doctorId || x.doctorId === doctorId),
    ),
    consultations: s.consultations.filter(
      (x) => x.patientId === pid && (!doctorId || x.doctorId === doctorId),
    ),
  });
  app.get("/api/patient", auth("patient"), (req, res) => {
    const s = read();
    res.json(patientData(s, patientFor(s, req).id));
  });
  app.patch("/api/patient/profile", auth("patient"), async (req, res) => {
    const b = z
      .object({
        name: z.string().min(2).max(80),
        age: z.coerce.number().int().min(1).max(120),
        gender: z.enum(["Female", "Male", "Other", "Prefer not to say"]),
        abha: z.string().max(20),
        language: z.string().max(30),
        medicalHistory: text,
        allergies: text,
      })
      .parse(req.body);
    res.json(
      await mutate((s) => {
        const p = patientFor(s, req);
        Object.assign(p, b);
        s.users.find((x) => x.id === req.auth.sub).name = b.name;
        return p;
      }),
    );
  });
  app.post("/api/assessments", auth("patient"), async (req, res) =>
    res.status(201).json(
      await mutate((s) => {
        const p = patientFor(s, req);
        const existing = s.assessments.find(
          (a) => a.patientId === p.id && a.status === "draft",
        );
        if (existing) return existing;
        const a = {
          id: id("case"),
          patientId: p.id,
          status: "draft",
          step: 0,
          language: p.language || "English",
          mode: "Tap",
          consent: false,
          bodyArea: "",
          answers: {},
          summary: null,
          patientVerified: false,
          doctorVerified: false,
          createdAt: now(),
        };
        s.assessments.push(a);
        return a;
      }),
    ),
  );
  app.get("/api/assessments/:id", auth(), (req, res) =>
    res.json(requireCase(read(), req, req.params.id)),
  );
  app.patch("/api/assessments/:id", auth("patient"), async (req, res) => {
    const b = z
      .object({
        step: z.number().int().min(0).max(7).optional(),
        language: z
          .enum(["English", "தமிழ்", "हिन्दी", "తెలుగు", "മലയാളം"])
          .optional(),
        mode: z.enum(["Speak", "Tap", "Helper"]).optional(),
        helper: z.string().max(100).optional(),
        relationship: z.string().max(50).optional(),
        consent: z.boolean().optional(),
        identityType: z.enum(["New Patient", "Existing Patient"]).optional(),
        abha: z.string().max(20).optional(),
        bodyArea: z
          .enum(["Head", "Chest", "Stomach", "Back", "Legs", "Other"])
          .optional(),
        answers: answerSchema.optional(),
        summary: summarySchema.optional(),
        patientVerified: z.boolean().optional(),
      })
      .parse(req.body);
    res.json(
      await mutate((s) => {
        const a = requireCase(s, req, req.params.id);
        if (a.status !== "draft")
          throw error(
            409,
            "Submitted assessments can only be updated by your doctor.",
          );
        const areaChanged =
          b.bodyArea !== undefined && b.bodyArea !== a.bodyArea;
        Object.assign(a, b, { updatedAt: now() });
        if (areaChanged) {
          if (!b.answers) a.answers = {};
          a.summary = null;
        }
        if (b.answers) {
          a.summary = null;
        }
        if (b.answers || areaChanged || b.summary) a.patientVerified = false;
        if (b.patientVerified === true) {
          if (!a.summary || Object.values(a.summary).some((x) => !x.trim()))
            throw error(400, "Please finish the summary first.");
          a.patientVerified = true;
        }
        return a;
      }),
    );
  });
  app.get(
    "/api/assessments/:id/question",
    auth("patient"),
    async (req, res) => {
      const a = requireCase(read(), req, req.params.id);
      const q = questionBank(a.bodyArea).find((q) => !a.answers[q.key]);
      if (!q) return res.json({ done: true });
      try {
        const result = await gemini(
          "Ask one simple non-diagnostic follow-up question for the given required field, considering existing answers. Respond in the requested language. Options must match that question. Never ask more than one question.",
          {
            field: q.key,
            defaultQuestion: q.text,
            answers: a.answers,
            bodyArea: a.bodyArea,
            language: a.language,
          },
          {
            type: "object",
            properties: {
              text: { type: "string" },
              options: {
                type: "array",
                items: { type: "string" },
                maxItems: 5,
              },
            },
            required: ["text", "options"],
          },
        );
        const parsed = result
          ? z
              .object({
                text: z.string().min(3).max(400),
                options: z.array(z.string().max(120)).max(5),
              })
              .parse(result)
          : null;
        res.json({
          ...q,
          ...parsed,
          engine: parsed ? "Gemini" : "Demo question engine",
        });
      } catch {
        res.json({
          ...q,
          engine: "Demo question engine",
          warning: "AI is unavailable. Continuing with guided questions.",
        });
      }
    },
  );
  app.post(
    "/api/assessments/:id/summary",
    auth("patient"),
    async (req, res) => {
      const s = read(),
        a = requireCase(s, req, req.params.id);
      if (a.status !== "draft")
        throw error(409, "This assessment has been submitted.");
      const result = await makeSummary(a, patientFor(s, req));
      await mutate((s) => {
        const current = requireCase(s, req, a.id);
        if (JSON.stringify(current.answers) !== JSON.stringify(a.answers))
          throw error(
            409,
            "Your answers changed. Please generate the summary again.",
          );
        Object.assign(current, result, { patientVerified: false });
      });
      res.json(result);
    },
  );
  app.post("/api/assessments/:id/submit", auth("patient"), async (req, res) => {
    const b = z.object({ doctorId: z.string().min(1) }).parse(req.body);
    res.json(
      await mutate((s) => {
        const a = requireCase(s, req, req.params.id);
        if (a.status !== "draft") return a;
        if (!a.consent || !a.patientVerified || !a.summary || !a.bodyArea)
          throw error(
            400,
            "Consent and a verified health summary are required.",
          );
        if (!s.doctors.some((d) => d.id === b.doctorId))
          throw error(400, "Choose a doctor.");
        Object.assign(a, {
          doctorId: b.doctorId,
          status: "submitted",
          submittedAt: now(),
          step: 7,
        });
        s.timeline.push({
          id: id("tl"),
          patientId: a.patientId,
          date: now(),
          title: "Health summary shared with doctor",
          detail: a.summary.complaint,
          type: "assessment",
        });
        return a;
      }),
    );
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) =>
      cb(
        null,
        ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
          file.mimetype,
        ),
      ),
  });
  const validBytes = (f) =>
    f.mimetype === "image/jpeg"
      ? f.buffer[0] === 255 && f.buffer[1] === 216
      : f.mimetype === "image/png"
        ? f.buffer
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : f.mimetype === "image/webp"
          ? f.buffer.toString("ascii", 0, 4) === "RIFF" &&
            f.buffer.toString("ascii", 8, 12) === "WEBP"
          : f.buffer.toString("ascii", 0, 5) === "%PDF-";
  app.post(
    "/api/documents",
    auth("patient"),
    upload.single("file"),
    async (req, res) => {
      if (!req.file || !validBytes(req.file))
        throw error(
          400,
          "Choose a valid JPG, PNG, WebP image or PDF, up to 10 MB.",
        );
      const s = read(),
        p = patientFor(s, req);
      const type = z
        .enum(["Prescription", "Lab Report", "Discharge Summary", "Other"])
        .parse(req.body.type);
      let assessmentId = req.body.assessmentId || null;
      if (assessmentId) {
        const a = requireCase(s, req, assessmentId);
        if (a.status !== "draft")
          throw error(409, "Add new documents through your records page.");
      }
      const doc = {
        id: id("doc"),
        patientId: p.id,
        assessmentId,
        name: path.basename(req.file.originalname).slice(0, 150),
        type,
        mime: req.file.mimetype,
        size: req.file.size,
        createdAt: now(),
        ocrText: "",
        structured: "",
        verified: false,
      };
      if (cloud) {
        const resource_type =
          req.file.mimetype === "application/pdf" ? "raw" : "image";
        const result = await new Promise((resolve, reject) =>
          cloudinary.uploader
            .upload_stream(
              {
                resource_type,
                type: "authenticated",
                public_id: `swasthyasetu/${doc.id}${resource_type === "raw" ? ".pdf" : ""}`,
                overwrite: false,
              },
              (e, r) => (e ? reject(e) : resolve(r)),
            )
            .end(req.file.buffer),
        );
        Object.assign(doc, {
          storage: "cloudinary",
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format,
          cloudinaryUrl: result.secure_url,
        });
      } else {
        await fs.mkdir(path.join(dataDir, "uploads"), { recursive: true });
        await fs.writeFile(
          path.join(dataDir, "uploads", doc.id),
          req.file.buffer,
        );
        doc.storage = "local";
      }
      await mutate((s) => s.documents.push(doc));
      res.status(201).json(doc);
    },
  );
  const requireDoc = (s, req, docId) => {
    const d = s.documents.find((x) => x.id === docId && !x.deleted);
    if (!d || !hasPatientAccess(s, req, d.patientId))
      throw error(404, "Document not found.");
    if (req.auth.role === "doctor" && d.assessmentId) {
      const a = requireCase(s, req, d.assessmentId);
      if (a.status === "draft") throw error(404, "Document not shared.");
    }
    return d;
  };
  app.get("/api/documents/:id/file", auth(), async (req, res) => {
    const d = requireDoc(read(), req, req.params.id);
    res.set("Cache-Control", "no-store");
    res.set(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(d.name)}`,
    );
    if (d.sample) return res.type("text/plain").send(d.ocrText);
    if (d.storage === "cloudinary") {
      const url = cloudinary.utils.private_download_url(
        d.publicId,
        d.resourceType === "raw" ? "" : d.format,
        {
          resource_type: d.resourceType,
          type: "authenticated",
          expires_at: Math.floor(Date.now() / 1000) + 60,
        },
      );
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw error(502, "The file service is unavailable.");
      return res.type(d.mime).send(Buffer.from(await r.arrayBuffer()));
    }
    res
      .type(d.mime)
      .send(await fs.readFile(path.join(dataDir, "uploads", d.id)));
  });
  app.patch("/api/documents/:id", auth(), async (req, res) => {
    const b = z
      .object({
        ocrText: z.string().max(20000).optional(),
        structured: z.string().max(10000).optional(),
        verified: z.boolean().optional(),
      })
      .parse(req.body);
    res.json(
      await mutate((s) => {
        const d = requireDoc(s, req, req.params.id);
        if (req.auth.role === "patient" && b.verified)
          throw error(403, "A doctor verifies extracted information.");
        Object.assign(d, b);
        if (b.ocrText !== undefined || b.structured !== undefined)
          d.verified = false;
        return d;
      }),
    );
  });
  app.post("/api/documents/:id/extract", auth(), async (req, res) => {
    const d = requireDoc(read(), req, req.params.id);
    if (!d.ocrText.trim())
      throw error(400, "Scan an image or enter extracted text first.");
    let structured =
      "Transcribed information — needs verification:\n" + d.ocrText;
    let engine = "Transcription only";
    try {
      const r = await gemini(
        "Extract reported document facts, including medicine names and directions only if present. Do not recommend taking them. Return a short factual summary. Preserve uncertainty.",
        { ocrText: d.ocrText },
        {
          type: "object",
          properties: { text: { type: "string" } },
          required: ["text"],
        },
      );
      if (r) {
        structured = z.string().max(10000).parse(r.text);
        engine = "Gemini";
      }
    } catch {
      engine = "AI unavailable · transcription only";
    }
    await mutate((s) => {
      const doc = requireDoc(s, req, d.id);
      doc.structured = structured;
      doc.verified = false;
    });
    res.json({ structured, engine });
  });
  app.delete("/api/documents/:id", auth("patient"), async (req, res) => {
    await mutate((s) => {
      const d = requireDoc(s, req, req.params.id);
      d.deleted = true;
    });
    res.json({ ok: true });
  });
  app.patch("/api/medications/:id", auth("patient"), async (req, res) => {
    const taking = z.enum(["Yes", "No", "Not sure"]).parse(req.body.taking);
    res.json(
      await mutate((s) => {
        const m = s.medications.find(
          (x) =>
            x.id === req.params.id && x.patientId === patientFor(s, req).id,
        );
        if (!m) throw error(404, "Medication not found.");
        m.taking = taking;
        return m;
      }),
    );
  });
  app.post("/api/medications", auth("patient"), async (req, res) => {
    const b = z
      .object({
        name: z.string().min(2).max(150),
        schedule: z.string().min(1).max(200),
      })
      .parse(req.body);
    res.status(201).json(
      await mutate((s) => {
        const m = {
          id: id("med"),
          patientId: patientFor(s, req).id,
          ...b,
          taking: "Not sure",
          source: "Patient reported",
        };
        s.medications.push(m);
        return m;
      }),
    );
  });
  app.put("/api/ayush", auth("patient"), async (req, res) => {
    const b = z
      .object({
        appetite: z.enum(["Good", "Low", "Irregular", "I don’t know"]),
        temperature: z.enum([
          "Often feel hot",
          "Often feel cold",
          "Somewhere in between",
          "I don’t know",
        ]),
        sleep: z.enum([
          "Usually restful",
          "Often interrupted",
          "Irregular",
          "I don’t know",
        ]),
        digestion: z.enum([
          "Regular",
          "Often constipated",
          "Often loose",
          "I don’t know",
        ]),
        activity: z.enum(["Low", "Moderate", "Active", "I don’t know"]),
      })
      .parse(req.body);
    let summary = `Reported appetite: ${b.appetite}. Temperature preference: ${b.temperature}. Sleep: ${b.sleep}. Digestion: ${b.digestion}. Activity: ${b.activity}. Practitioner review needed.`;
    try {
      const r = await gemini(
        "Summarize these self-reported AYUSH history answers. Do not assign prakriti, vikriti, diagnosis or treatment.",
        b,
        {
          type: "object",
          properties: { text: { type: "string" } },
          required: ["text"],
        },
      );
      if (r) summary = z.string().max(3000).parse(r.text);
    } catch {}
    res.json(
      await mutate((s) => {
        const pid = patientFor(s, req).id;
        let a = s.ayush.find((x) => x.patientId === pid);
        if (!a) {
          a = { id: id("ayush"), patientId: pid };
          s.ayush.push(a);
        }
        Object.assign(a, b, {
          summary,
          prakriti: "Not assessed — practitioner review needed",
          updatedAt: now(),
        });
        s.timeline.push({
          id: id("tl"),
          patientId: pid,
          date: now(),
          title: "AYUSH health profile updated",
          detail: "Self-reported lifestyle information",
          type: "ayush",
        });
        return a;
      }),
    );
  });
  app.post("/api/appointments", auth("patient"), async (req, res) => {
    const b = z
      .object({
        doctorId: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.enum([
          "09:00",
          "09:30",
          "10:00",
          "10:30",
          "11:00",
          "11:30",
          "14:00",
          "14:30",
          "15:00",
        ]),
        reason: z.string().min(3).max(500),
      })
      .parse(req.body);
    if (
      b.date < new Date().toISOString().slice(0, 10) ||
      isNaN(Date.parse(b.date))
    )
      throw error(400, "Choose today or a future date.");
    res.status(201).json(
      await mutate((s) => {
        if (!s.doctors.some((x) => x.id === b.doctorId))
          throw error(400, "Choose a doctor.");
        if (
          s.appointments.some(
            (x) =>
              x.doctorId === b.doctorId &&
              x.date === b.date &&
              x.time === b.time &&
              ["Booked", "Completed"].includes(x.status),
          )
        )
          throw error(
            409,
            "That appointment time has been booked. Please choose another.",
          );
        const a = {
          id: id("appt"),
          patientId: patientFor(s, req).id,
          ...b,
          status: "Booked",
          createdAt: now(),
        };
        s.appointments.push(a);
        return a;
      }),
    );
  });
  app.patch("/api/appointments/:id", auth(), async (req, res) => {
    const status = z
      .enum(["Cancelled", "Rejected", "Completed"])
      .parse(req.body.status);
    res.json(
      await mutate((s) => {
        const a = s.appointments.find((x) => x.id === req.params.id);
        if (
          !a ||
          (req.auth.role === "patient"
            ? a.patientId !== patientFor(s, req).id
            : a.doctorId !== doctorFor(s, req).id)
        )
          throw error(404, "Appointment not found.");
        if (req.auth.role === "patient" && status !== "Cancelled")
          throw error(403, "You can only cancel appointments.");
        if (a.status !== "Booked")
          throw error(409, "This appointment has already been updated.");
        a.status = status;
        return a;
      }),
    );
  });
  app.get("/api/doctor/dashboard", auth("doctor"), (req, res) => {
    const s = read(),
      doctor = doctorFor(s, req);
    const cases = s.assessments
      .filter((a) => a.doctorId === doctor.id && a.status !== "draft")
      .map((a) => ({
        ...a,
        patient: s.patients.find((p) => p.id === a.patientId),
      }));
    res.json({
      doctor,
      cases,
      appointments: s.appointments
        .filter((a) => a.doctorId === doctor.id)
        .map((a) => ({
          ...a,
          patient: visibleIdentity(
            s.patients.find((p) => p.id === a.patientId),
          ),
        })),
      counts: {
        waiting: cases.filter((a) => a.status === "submitted").length,
        active: cases.filter((a) => a.status === "in-consultation").length,
        completed: cases.filter((a) => a.status === "completed").length,
      },
    });
  });
  app.get("/api/doctor/patients/:id", auth("doctor"), (req, res) => {
    const s = read();
    if (!hasPatientAccess(s, req, req.params.id))
      throw error(404, "Patient not found.");
    res.json(patientData(s, req.params.id, doctorFor(s, req).id));
  });
  app.patch(
    "/api/doctor/assessments/:id/review",
    auth("doctor"),
    async (req, res) => {
      const b = z
        .object({
          summary: summarySchema.optional(),
          doctorVerified: z.boolean().optional(),
          flagsDismissed: z.boolean().optional(),
        })
        .parse(req.body);
      res.json(
        await mutate((s) => {
          const a = requireCase(s, req, req.params.id);
          if (a.doctorId !== doctorFor(s, req).id)
            throw error(403, "This case is assigned to another doctor.");
          Object.assign(a, b);
          if (b.summary) a.doctorVerified = false;
          if (b.doctorVerified === true) a.doctorVerified = true;
          a.reviewedAt = now();
          return a;
        }),
      );
    },
  );
  app.post(
    "/api/doctor/assessments/:id/consultation",
    auth("doctor"),
    async (req, res) => {
      const b = z
        .object({
          action: z.enum(["start", "complete"]),
          notes: z.string().max(10000).optional(),
        })
        .parse(req.body);
      res.json(
        await mutate((s) => {
          const a = requireCase(s, req, req.params.id),
            d = doctorFor(s, req);
          if (a.doctorId !== d.id)
            throw error(403, "This case belongs to another doctor.");
          if (!a.doctorVerified)
            throw error(
              400,
              "Verify the patient summary before the consultation.",
            );
          let c = s.consultations.find((x) => x.assessmentId === a.id);
          if (b.action === "start") {
            if (a.status === "completed")
              throw error(409, "This consultation is already complete.");
            if (!c) {
              c = {
                id: id("consult"),
                patientId: a.patientId,
                doctorId: d.id,
                assessmentId: a.id,
                startedAt: now(),
                status: "In progress",
              };
              s.consultations.push(c);
            }
            a.status = "in-consultation";
          } else {
            if (!c) throw error(400, "Start the consultation first.");
            if (a.status === "completed") return c;
            if (!b.notes?.trim())
              throw error(400, "Add consultation notes before completing.");
            c.status = "Completed";
            c.completedAt = now();
            a.status = "completed";
            s.notes.push({
              id: id("note"),
              patientId: a.patientId,
              doctorId: d.id,
              assessmentId: a.id,
              text: b.notes,
              createdAt: now(),
            });
            s.timeline.push({
              id: id("tl"),
              patientId: a.patientId,
              date: now(),
              title: "Consultation completed",
              detail: `Reviewed by ${d.name}. ${b.notes}`,
              type: "consultation",
            });
          }
          return c;
        }),
      );
    },
  );
  app.post("/api/doctor/notes", auth("doctor"), async (req, res) => {
    const b = z
      .object({
        assessmentId: z.string(),
        text: z.string().trim().min(1).max(10000),
      })
      .parse(req.body);
    res.json(
      await mutate((s) => {
        const a = requireCase(s, req, b.assessmentId),
          d = doctorFor(s, req);
        if (a.doctorId !== d.id)
          throw error(403, "This case belongs to another doctor.");
        const note = {
          id: id("note"),
          patientId: a.patientId,
          doctorId: d.id,
          ...b,
          createdAt: now(),
        };
        s.notes.push(note);
        return note;
      }),
    );
  });
  app.post("/api/mock/abha/verify", auth("patient"), (req, res) => {
    const number = z
      .string()
      .transform((s) => s.replace(/[- ]/g, ""))
      .pipe(z.string().regex(/^\d{14}$/))
      .parse(req.body.number);
    res.json({
      label: "MOCK API — PROTOTYPE",
      verified: true,
      number,
      patient: { name: patientFor(read(), req).name },
      message:
        "Format accepted by the mock service. No government identity verification occurred.",
    });
  });
  app.get("/api/mock/his/:patientId", auth(), (req, res) => {
    const s = read();
    if (!hasPatientAccess(s, req, req.params.patientId))
      throw error(404, "Patient not found.");
    res.json({
      label: "MOCK API — PROTOTYPE",
      records: s.timeline.filter((x) => x.patientId === req.params.patientId),
      consultations: s.consultations.filter(
        (x) => x.patientId === req.params.patientId,
      ),
    });
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API endpoint not found." }),
  );
  app.use(express.static(path.resolve("dist")));
  app.get("/{*path}", (req, res) =>
    res.sendFile(path.resolve("dist/index.html")),
  );
  app.use((err, req, res, next) => {
    if (err instanceof z.ZodError)
      return res.status(400).json({
        error: err.issues
          .map((x) => `${x.path.join(".")}: ${x.message}`)
          .slice(0, 3)
          .join("; "),
      });
    if (err instanceof multer.MulterError)
      return res.status(400).json({ error: "File must be 10 MB or smaller." });
    const status = err.status || 500;
    if (status === 500) console.error(err.message);
    res
      .status(status)
      .json({
        error:
          status === 500
            ? "Something went wrong. Please try again."
            : err.message,
      });
  });
  return app;
}
