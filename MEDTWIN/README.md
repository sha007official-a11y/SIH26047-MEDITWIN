# SwasthyaSetu

**Your Voice. Our Priority.** A working healthcare web application prototype based on the supplied UI concept board and patient/doctor workflow.

This is a demonstration, not a clinical system. Use fictional information only. Questions and summaries collect and organize information; they do not diagnose, prescribe, or replace a clinician.

## Start the working demo

Requires Node.js 22 or newer and npm. From this project folder:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. The API runs at **http://127.0.0.1:4000**. No `.env` is required for the local demonstration.

| Role                   | Login                                       | Password |
| ---------------------- | ------------------------------------------- | -------- |
| Patient: Lakshmi Devi  | patient@demo.com                            | Demo@123 |
| Doctor: Dr. Ananya Rao | doctor@demo.com                             | Demo@123 |
| Other patients         | patient2@demo.com through patient6@demo.com | Demo@123 |
| Other doctors          | doctor2@demo.com, doctor3@demo.com          | Demo@123 |

The login pages also have one-click demo buttons. Seeded doctors are managed accounts; unrestricted public doctor registration is intentionally unavailable. Patient registration works and creates a unique patient ID. No real Aadhaar information is collected.

### Production-style local preview

```sh
npm run build
npm start
```

Then open **http://127.0.0.1:4000**. Express serves both the built frontend and API. Keep the process running while using the preview.

## Try the complete workflow

1. Use the patient demo or register a new fictional patient.
2. Start an assessment. Choose a language and Speak, Tap, or Helper mode.
3. Confirm identity and consent. ABHA accepts a fictional 14-digit number through a visibly mocked service.
4. Select a body area and answer the adaptive questions. “I don’t know” remains an actual answer.
5. Review the understanding summary. Change any fields, then choose **Yes, correct**.
6. Optionally upload a medical document. Images support real Tesseract OCR; edit and verify the extracted text. PDFs support preview, download, and manual transcription.
7. Choose a doctor and submit. Submission is idempotent. Unsubmitted drafts remain private to the patient.
8. Sign out, choose the doctor demo, and open that case from the queue.
9. Review Summary, Case history, Documents, Timeline, AYUSH, and Alerts. Correct and verify the summary.
10. Start consultation, write notes, and complete it. The patient’s health timeline shows the completed consultation and notes.

Patients can also book/cancel demonstration appointments, manage reported medicine status, upload records, update their profile, and fill out the AYUSH lifestyle questionnaire. Doctors can manage their own appointment statuses, search/filter cases, verify documents, and review information flags.

## What runs immediately, and what needs configuration

| Feature                 | Default local demo                                                              | Configured integration                                                     |
| ----------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Records                 | Persistent JSON in `data/demo.json`, explicitly labelled **Local demo storage** | MySQL 8.4 with schema and adapter                                          |
| Authentication          | Real JWTs, bcrypt hashes, backend role/ownership checks                         | Same implementation with required configured JWT secret                    |
| Questions and summaries | Body-area-aware guided questions, labelled **Demo question engine**             | Gemini server-side REST requests                                           |
| Documents               | Protected local files under `data/uploads`                                      | Authenticated Cloudinary assets and expiring downloads                     |
| Image OCR               | Tesseract.js in the browser; English OCR model                                  | Same; requires model/worker downloads on first use                         |
| Voice                   | Web Speech API and text-to-speech where supported                               | Browser-dependent; voice data may use the browser provider                 |
| ABHA / HIS              | Mock APIs only                                                                  | Intentionally remains mock                                                 |
| AYUSH                   | Self-reported appetite, temperature, sleep, digestion, and activity summary     | Optional Gemini information summary; no inferred diagnosis or constitution |

The local demo storage is a convenience for an immediate runnable preview, not a replacement for the requested MySQL stack. The app never silently falls back to demo storage when `STORAGE_MODE=mysql` fails.

Core assessment questions, choices, body areas, and navigation controls support English, Tamil, Hindi, Telugu, and Malayalam. Supporting workspace text remains English. Browser voices vary; missing voice support falls back to typing/tapping. No microphone or camera permission is required to complete the workflow.

## Configure MySQL

Copy `.env.example` to `.env`. Set:

```dotenv
STORAGE_MODE=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=swasthyasetu
MYSQL_USER=swasthyasetu
MYSQL_PASSWORD=your_database_password
JWT_SECRET=replace_with_a_random_secret_at_least_32_characters_long
SEED_DEMO=true
```

Create a database and scoped database user using your MySQL administrator. The application user needs SELECT, INSERT, and UPDATE at runtime; schema setup additionally needs CREATE and REFERENCES. Use TLS for remote databases (`MYSQL_SSL=true`). Then run:

```sh
npm run db:setup
npm run dev
```

Alternatively, `docker-compose.yml` starts MySQL 8.4 and imports the schema on a fresh volume. Set both `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` in `.env`, then run `docker compose up -d`. Docker is optional and must be installed separately.

`database/schema.sql` defines users, patients, doctors, health assessments, documents, timelines, medications, appointments, AYUSH profiles, doctor notes, and consultations. Ownership is normalized with foreign keys. Evolving prototype answers, symptoms, history, allergies, and OCR fields are retained in entity JSON payloads. Files themselves are never stored in MySQL.

The prototype adapter keeps a small dataset in memory and writes transactions to MySQL. Run **one API process/replica**. It is not designed for multi-instance concurrent writes or large clinical datasets. A production design would use per-operation SQL transactions, a migration framework, and additional audit controls. Demo JSON records are not automatically migrated when changing storage modes.

`SEED_DEMO=true` seeds six fictional patients and three doctors only when the database has no users. Do not expose demo accounts with real medical information. With an empty unseeded database, provision doctor accounts before expecting patients to submit or book visits.

## Configure Gemini

Create a Gemini API key in Google AI Studio. Set only server environment variables:

```dotenv
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-2.5-flash
```

Use a model available to your account that supports structured JSON output. The server uses `generateContent`, constrained output schemas, response validation, a timeout, and instructions to treat patient/OCR text as untrusted data. Gemini adapts questions, structures the history, summarizes the case, extracts reported document facts, and summarizes AYUSH lifestyle answers.

Patient/doctor verification remains required. An unavailable or rejected AI response returns a clearly labelled guided or transcription fallback without losing the saved answers. No key is embedded in the browser bundle. See [Gemini structured output documentation](https://ai.google.dev/gemini-api/docs/structured-output) and [REST API reference](https://ai.google.dev/api/generate-content).

## Configure Cloudinary

Set these server variables from your Cloudinary account:

```dotenv
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

Files are uploaded with `type: authenticated`; original image and raw PDF assets are protected. The API checks ownership/doctor assignment before retrieving a document using an expiring signed Cloudinary download URL. Stored metadata includes the Cloudinary URL, public ID, resource type, document type, patient ID, and upload time. Uploads accept validated JPG, PNG, WebP, or PDF bytes up to 10 MB.

Removal hides the document from the app; retention and permanent deletion are administrator responsibilities in this prototype. Existing local uploads remain local when Cloudinary is later configured. See [Cloudinary upload documentation](https://cloudinary.com/documentation/node_image_and_video_upload) and [access control](https://cloudinary.com/documentation/control_access_to_media).

## Deploy the frontend to Vercel

1. Create a GitHub repository for this source, excluding `.env`, `data`, and `node_modules`.
2. Import it into Vercel. Select Vite, build command `npm run build`, output `dist`.
3. Set `VITE_API_URL` to the HTTPS origin of the deployed API, **without `/api` or a trailing slash**.
4. Deploy. `vercel.json` routes client-side paths to `index.html`.
5. Add the exact Vercel origin to the backend `FRONTEND_ORIGIN` and restart the API.

## Deploy the backend to Render

1. Provision a MySQL database reachable from Render. Render’s standard managed PostgreSQL is not a replacement for the requested MySQL database.
2. Apply `database/schema.sql` using the provider’s SQL console or `npm run db:setup` against that database.
3. Create a Render Node web service from the same GitHub repository, or use `render.yaml`.
4. Build: `npm ci --include=dev && npm run build`. Start: `npm start`.
5. Set `HOST=0.0.0.0`, `TRUST_PROXY=1`, `STORAGE_MODE=mysql`, a strong `JWT_SECRET`, all MySQL settings, and `FRONTEND_ORIGIN=https://your-frontend.vercel.app`. Render supplies `PORT`.
6. Configure Gemini and Cloudinary as needed. Use Cloudinary for persistent uploads; an ephemeral Render filesystem does not retain local files across deployments.
7. Check `/api/health` and run the patient-to-doctor workflow at the deployed frontend.

Public deployment was not performed: no Vercel, Render, GitHub, MySQL, Gemini, or Cloudinary account credentials were supplied. Live provider integrations must be validated after configuration.

## Project structure

```text
src/
  App.jsx                   Routes and role guards
  main.jsx                  React entry
  styles.css                Landing page and shared design tokens
  app.css                   Workspace, assessment and responsive styles
  components/
    ui.jsx                  Reusable controls, modal, logo, statuses
    Layout.jsx              Patient/doctor navigation
    BodyMap.jsx             Accessible interactive body diagram
    Voice.jsx               Speech recognition and read-aloud
    WebTools.jsx            Optional authenticated read-only WebMCP tool
  lib/
    api.js                  API client and protected document retrieval
    context.jsx              Session and notification state
    languages.js            Five-language assessment strings
  pages/
    Landing.jsx, Auth.jsx, Patient.jsx, Assessment.jsx,
    Records.jsx, Doctor.jsx
server/
  app.js                    Express routes, auth, validation, uploads
  ai.js                     Guided questions and Gemini adapters
  store.js                  MySQL / explicitly local demo adapters
  seed.js                   Fictional sample data
  setup-db.js               Schema setup
  index.js                  API entry
database/schema.sql
tests/workflow.test.js
docs/API.md
.env.example
docker-compose.yml
vercel.json
render.yaml
```

## Validation and limitations

```sh
npm test
npm run build
```

The automated workflow uses an isolated temporary dataset. It checks authentication, role/ownership boundaries, private drafts/documents, consent, corrected summaries, idempotent submission, doctor verification, consultation completion, persistence, appointment conflicts, and mock services. The preview uses the local demo adapter; MySQL and live third-party requests require a configured environment and are not claimed as runtime-tested here.

The JWT lives in per-tab session storage and expires after eight hours. Demo mode generates a local secret if none is configured. Password recovery email delivery is not configured. Camera capture and voice recognition depend on browser/device support; PDF OCR is not implemented. AYUSH never asserts a prakriti/vikriti classification from the short questionnaire. There is no real clinical, ABHA, or hospital connection, no prescriptions are issued, and no actual clinic is notified by booking an appointment.

The build uses the WebAssembly distribution of esbuild for compatibility with restricted Windows workspaces. This preserves the requested Vite/React toolchain and may start somewhat slower than the native distribution.
