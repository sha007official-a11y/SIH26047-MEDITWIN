import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const testDir = await fs.mkdtemp(path.join(os.tmpdir(), "swasthya-test-"));
process.env.DATA_DIR = testDir;
process.env.STORAGE_MODE = "demo";
process.env.JWT_SECRET = "isolated-automated-test-secret-over-32-characters";
delete process.env.GEMINI_API_KEY;
delete process.env.CLOUDINARY_CLOUD_NAME;
const { createApp } = await import("../server/app.js");
const { closeStore } = await import("../server/store.js");
const app = await createApp();
const server = app.listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}/api`;
async function call(route, { token, method = "GET", body } = {}) {
  const res = await fetch(base + route, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body instanceof FormData
        ? {}
        : body
          ? { "Content-Type": "application/json" }
          : {}),
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}
let patient, doctor, other, otherDoctor, caseId, docId;
test("complete prototype workflow and authorization boundaries", async (t) => {
  await t.test(
    "separate authenticated roles and invalid credentials",
    async () => {
      assert.equal((await call("/patient")).status, 401);
      patient = (
        await call("/auth/login", {
          method: "POST",
          body: {
            identifier: "patient@demo.com",
            password: "Demo@123",
            role: "patient",
          },
        })
      ).data.token;
      doctor = (
        await call("/auth/login", {
          method: "POST",
          body: {
            identifier: "doctor@demo.com",
            password: "Demo@123",
            role: "doctor",
          },
        })
      ).data.token;
      other = (
        await call("/auth/login", {
          method: "POST",
          body: {
            identifier: "patient2@demo.com",
            password: "Demo@123",
            role: "patient",
          },
        })
      ).data.token;
      otherDoctor = (
        await call("/auth/login", {
          method: "POST",
          body: {
            identifier: "doctor2@demo.com",
            password: "Demo@123",
            role: "doctor",
          },
        })
      ).data.token;
      assert.ok(patient && doctor && other && otherDoctor);
      assert.equal(
        (await call("/doctor/dashboard", { token: patient })).status,
        403,
      );
      assert.equal(
        (
          await call("/auth/login", {
            method: "POST",
            body: {
              identifier: "patient@demo.com",
              password: "wrong",
              role: "patient",
            },
          })
        ).status,
        401,
      );
    },
  );
  await t.test("draft reuse, ownership and consent block", async () => {
    let r = await call("/assessments", { token: patient, method: "POST" });
    assert.equal(r.status, 201);
    caseId = r.data.id;
    assert.equal(
      (await call("/assessments", { token: patient, method: "POST" })).data.id,
      caseId,
    );
    assert.equal(
      (await call(`/assessments/${caseId}`, { token: other })).status,
      404,
    );
    assert.equal(
      (
        await call(`/assessments/${caseId}/submit`, {
          token: patient,
          method: "POST",
          body: { doctorId: "DOC-001" },
        })
      ).status,
      400,
    );
    assert.equal(
      (await call(`/assessments/${caseId}`, { token: doctor })).status,
      404,
    );
  });
  await t.test(
    "answers, understanding correction and persistence",
    async () => {
      const answers = {
        complaint: "Stomach pain",
        duration: "5 days",
        severity: "Moderate",
        pattern: "Comes and goes",
        associatedSymptoms: "Nausea",
        medication: "None",
        allergies: "I don't know",
        medicalHistory: "None reported",
      };
      assert.equal(
        (
          await call(`/assessments/${caseId}`, {
            token: patient,
            method: "PATCH",
            body: {
              bodyArea: "Stomach",
              consent: true,
              answers,
              language: "English",
              mode: "Tap",
              step: 4,
            },
          })
        ).status,
        200,
      );
      assert.equal(
        (await call(`/assessments/${caseId}/question`, { token: patient })).data
          .done,
        true,
      );
      const result = await call(`/assessments/${caseId}/summary`, {
        token: patient,
        method: "POST",
      });
      assert.equal(result.data.summary.allergies, "I don't know");
      const corrected = { ...result.data.summary, duration: "6 days" };
      assert.equal(
        (
          await call(`/assessments/${caseId}`, {
            token: patient,
            method: "PATCH",
            body: { summary: corrected, patientVerified: true, step: 6 },
          })
        ).status,
        200,
      );
      assert.equal(
        (await call(`/assessments/${caseId}`, { token: patient })).data.summary
          .duration,
        "6 days",
      );
      const disk = JSON.parse(
        await fs.readFile(path.join(testDir, "demo.json"), "utf8"),
      );
      assert.equal(
        disk.assessments.find((a) => a.id === caseId).summary.duration,
        "6 days",
      );
    },
  );
  await t.test(
    "upload validates real bytes and keeps documents private",
    async () => {
      let body = new FormData();
      body.append(
        "file",
        new Blob(["not a png"], { type: "image/png" }),
        "fake.png",
      );
      body.append("type", "Lab Report");
      assert.equal(
        (await call("/documents", { token: patient, method: "POST", body }))
          .status,
        400,
      );
      body = new FormData();
      body.append(
        "file",
        new Blob(
          [
            Buffer.from(
              "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4ZUAAAAASUVORK5CYII=",
              "base64",
            ),
          ],
          { type: "image/png" },
        ),
        "demo-test.png",
      );
      body.append("type", "Lab Report");
      body.append("assessmentId", caseId);
      const r = await call("/documents", {
        token: patient,
        method: "POST",
        body,
      });
      assert.equal(r.status, 201);
      docId = r.data.id;
      assert.equal(
        (await fetch(`${base}/documents/${docId}/file`)).status,
        401,
      );
      assert.equal(
        (
          await fetch(`${base}/documents/${docId}/file`, {
            headers: { Authorization: `Bearer ${other}` },
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await fetch(`${base}/documents/${docId}/file`, {
            headers: { Authorization: `Bearer ${doctor}` },
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await call(`/documents/${docId}`, {
            token: patient,
            method: "PATCH",
            body: { verified: true },
          })
        ).status,
        403,
      );
    },
  );
  await t.test(
    "submission is idempotent and assigned doctor sees corrected data",
    async () => {
      const r = await call(`/assessments/${caseId}/submit`, {
        token: patient,
        method: "POST",
        body: { doctorId: "DOC-001" },
      });
      assert.equal(r.status, 200);
      assert.equal(r.data.status, "submitted");
      assert.equal(
        (
          await call(`/assessments/${caseId}/submit`, {
            token: patient,
            method: "POST",
            body: { doctorId: "DOC-001" },
          })
        ).status,
        200,
      );
      const q = await call("/doctor/dashboard", { token: doctor });
      const c = q.data.cases.find((c) => c.id === caseId);
      assert.equal(c.summary.duration, "6 days");
      assert.equal(
        (await call(`/assessments/${caseId}`, { token: otherDoctor })).status,
        404,
      );
      assert.equal(
        (
          await call(`/assessments/${caseId}`, {
            token: patient,
            method: "PATCH",
            body: { step: 1 },
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await fetch(`${base}/documents/${docId}/file`, {
            headers: { Authorization: `Bearer ${doctor}` },
          })
        ).status,
        200,
      );
    },
  );
  await t.test(
    "doctor verification gates consultation and completion returns notes",
    async () => {
      assert.equal(
        (
          await call(`/doctor/assessments/${caseId}/consultation`, {
            token: doctor,
            method: "POST",
            body: { action: "start" },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await call(`/doctor/assessments/${caseId}/review`, {
            token: doctor,
            method: "PATCH",
            body: { doctorVerified: true },
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await call(`/doctor/assessments/${caseId}/consultation`, {
            token: doctor,
            method: "POST",
            body: { action: "start" },
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await call(`/doctor/assessments/${caseId}/consultation`, {
            token: doctor,
            method: "POST",
            body: { action: "complete", notes: "" },
          })
        ).status,
        400,
      );
      const notes =
        "Demonstration consultation complete. History reviewed with patient.";
      assert.equal(
        (
          await call(`/doctor/assessments/${caseId}/consultation`, {
            token: doctor,
            method: "POST",
            body: { action: "complete", notes },
          })
        ).status,
        200,
      );
      const p = await call("/patient", { token: patient });
      assert.equal(
        p.data.assessments.find((a) => a.id === caseId).status,
        "completed",
      );
      assert.ok(
        p.data.timeline.some(
          (t) =>
            t.title === "Consultation completed" && t.detail.includes(notes),
        ),
      );
    },
  );
  await t.test(
    "appointment conflicts, mock identity, AYUSH and medication updates",
    async () => {
      const date = new Date(Date.now() + 7 * 86400000)
        .toISOString()
        .slice(0, 10);
      const b = {
        doctorId: "DOC-001",
        date,
        time: "09:00",
        reason: "Workflow demo visit",
      };
      let r = await call("/appointments", {
        token: patient,
        method: "POST",
        body: b,
      });
      assert.equal(r.status, 201);
      assert.equal(
        (await call("/appointments", { token: other, method: "POST", body: b }))
          .status,
        409,
      );
      assert.equal(
        (
          await call(`/appointments/${r.data.id}`, {
            token: patient,
            method: "PATCH",
            body: { status: "Completed" },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call(`/appointments/${r.data.id}`, {
            token: patient,
            method: "PATCH",
            body: { status: "Cancelled" },
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await call("/mock/abha/verify", {
            token: patient,
            method: "POST",
            body: { number: "bad" },
          })
        ).status,
        400,
      );
      assert.match(
        (
          await call("/mock/abha/verify", {
            token: patient,
            method: "POST",
            body: { number: "12-3456-7890-1234" },
          })
        ).data.label,
        /MOCK/,
      );
      assert.equal(
        (
          await call("/ayush", {
            token: patient,
            method: "PUT",
            body: {
              appetite: "Good",
              temperature: "Often feel hot",
              sleep: "Usually restful",
              digestion: "Regular",
              activity: "Moderate",
            },
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await call("/medications/med-1", {
            token: other,
            method: "PATCH",
            body: { taking: "No" },
          })
        ).status,
        404,
      );
    },
  );
});
test.after(async () => {
  await new Promise((r) => server.close(r));
  await closeStore();
  const target = path.resolve(testDir);
  if (
    !target.startsWith(path.resolve(os.tmpdir()) + path.sep) ||
    !path.basename(target).startsWith("swasthya-test-")
  )
    throw Error("Unexpected test directory");
  await fs.rm(target, { recursive: true, force: true });
});
