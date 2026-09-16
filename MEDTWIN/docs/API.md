# SwasthyaSetu REST API

Base path: `/api`. JSON requests use `Content-Type: application/json`. Authenticated routes use `Authorization: Bearer <JWT>`. The server returns `{ "error": "readable message" }` for failures. Common codes: 400 validation/consent, 401 session, 403 role, 404 inaccessible/missing record, 409 state conflict, 500 unexpected service failure.

## Authentication and configuration

| Method | Endpoint         | Access    | Purpose                                                                         |
| ------ | ---------------- | --------- | ------------------------------------------------------------------------------- |
| GET    | `/health`        | Public    | Prototype and integration status; no secrets                                    |
| POST   | `/auth/login`    | Public    | `{identifier,password,role}`; returns `{user,token}`                            |
| POST   | `/auth/register` | Public    | Patient registration; name, age, gender, mobile, email, password, optional ABHA |
| GET    | `/me`            | Signed in | Current account without password hash                                           |
| GET    | `/doctors`       | Signed in | Available doctors and specialties                                               |

Identifiers support email/mobile and seeded doctor IDs. Registration always creates a patient role; clients cannot elevate their own role.

## Patient records and assessment

| Method | Endpoint                    | Purpose                                                                                    |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------ | ---- | ------------ |
| GET    | `/patient`                  | Patient-owned profile, assessments, timeline, files, medicines, AYUSH, appointments, notes |
| PATCH  | `/patient/profile`          | Update name, age, gender, optional ABHA, preferred language, history and allergies         |
| POST   | `/assessments`              | Create or reuse the patient's existing draft                                               |
| GET    | `/assessments/:id`          | Owner or assigned doctor; doctors cannot read drafts                                       |
| PATCH  | `/assessments/:id`          | Patient-only draft changes; answers, language, mode, body area, consent, summary, step     |
| GET    | `/assessments/:id/question` | Next missing question; returns `{key,text,options,engine}` or `{done:true}`                |
| POST   | `/assessments/:id/summary`  | Generate/rebuild unverified summary from saved answers                                     |
| POST   | `/assessments/:id/submit`   | `{doctorId}`; requires consent and patient-verified summary                                |
| POST   | `/medications`              | Add reported `{name,schedule}`                                                             |
| PATCH  | `/medications/:id`          | `{taking: "Yes"                                                                            | "No" | "Not sure"}` |
| PUT    | `/ayush`                    | Save appetite, temperature, sleep, digestion and activity answers                          |

Draft steps are 0–7: language, mode, consent, body map, questions, understanding, documents, review. Answer edits invalidate the summary; changing the selected body area clears incompatible answers unless new answers are supplied in that request. Summary edits invalidate verification unless the patient explicitly confirms the corrected summary in the same operation.

### Summary shape

```json
{
  "complaint": "Stomach pain",
  "duration": "5 days",
  "severity": "Moderate",
  "associatedSymptoms": "Nausea",
  "medication": "None reported",
  "allergies": "I don't know",
  "medicalHistory": "Not provided"
}
```

Unknown is distinct from none known. Patient responses remain in `answers` even after the doctor corrects `summary`.

## Documents

| Method | Endpoint                 | Purpose                                                               |
| ------ | ------------------------ | --------------------------------------------------------------------- |
| POST   | `/documents`             | Patient upload, multipart `file`, `type`, optional `assessmentId`     |
| GET    | `/documents/:id/file`    | Protected original file stream; no unauthenticated static uploads     |
| PATCH  | `/documents/:id`         | Save `ocrText` / `structured`; only a doctor may set `verified:true`  |
| POST   | `/documents/:id/extract` | Structure saved OCR through Gemini or preserve labelled transcription |
| DELETE | `/documents/:id`         | Patient soft removal from displayed records                           |

Document types: `Prescription`, `Lab Report`, `Discharge Summary`, `Other`. Up to 10 MB. Images: JPG, PNG, WebP. PDFs: stored, previewed, manually transcribed. Byte signatures are checked against reported media type. Text OCR runs in the browser through Tesseract; the resulting text is editable and saved through PATCH. Do not treat text extraction as verified clinical information.

## Appointments

| Method | Endpoint            | Purpose                                                   |
| ------ | ------------------- | --------------------------------------------------------- |
| POST   | `/appointments`     | Patient books `{doctorId,date,time,reason}`               |
| PATCH  | `/appointments/:id` | Patient cancels own; assigned doctor rejects or completes |

Dates use `YYYY-MM-DD`. Available sample times: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 14:00, 14:30, 15:00. Occupied doctor/date/time slots return 409. All bookings are fictional.

## Doctor workspace

| Method | Endpoint                               | Purpose                                                                |
| ------ | -------------------------------------- | ---------------------------------------------------------------------- |
| GET    | `/doctor/dashboard`                    | Assigned submitted cases, appointments and derived counts              |
| GET    | `/doctor/patients/:id`                 | Patient profile and records shared through an assigned, consented case |
| PATCH  | `/doctor/assessments/:id/review`       | Edit summary, explicitly verify it, or mark flags reviewed             |
| POST   | `/doctor/assessments/:id/consultation` | `{action:"start"}` or `{action:"complete",notes}`                      |
| POST   | `/doctor/notes`                        | Save `{assessmentId,text}` without completing the visit                |

Starting a consultation requires doctor verification. Completion requires a started consultation and nonempty notes. Completion is idempotent and appends notes and a patient timeline event. Assigned-doctor checks apply on the server.

## Mock services

| Method | Endpoint               | Purpose                                                                                       |
| ------ | ---------------------- | --------------------------------------------------------------------------------------------- |
| POST   | `/mock/abha/verify`    | Patient `{number}`; validates 14-digit format and returns only the current fictional identity |
| GET    | `/mock/his/:patientId` | Authorized timeline/consultation retrieval                                                    |

Both return `label: "MOCK API — PROTOTYPE"`. Consultation persistence simulates the HIS write step in local/MySQL storage. They do not call real healthcare systems.
