-- MySQL 8.4+. UTF-8 supports the five assessment languages.
-- Entity payloads retain evolving prototype fields in JSON; ownership and
-- account identifiers are normalized and protected by foreign/unique keys.
CREATE TABLE IF NOT EXISTS users (
 id VARCHAR(64) PRIMARY KEY,
 email VARCHAR(150) NOT NULL UNIQUE,
 mobile VARCHAR(20) UNIQUE,
 role ENUM('patient','doctor') NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 data JSON NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS patients (
 id VARCHAR(64) PRIMARY KEY,
 user_id VARCHAR(64) NOT NULL UNIQUE,
 data JSON NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS doctors (
 id VARCHAR(64) PRIMARY KEY,
 user_id VARCHAR(64) NOT NULL UNIQUE,
 data JSON NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS health_assessments (
 id VARCHAR(64) PRIMARY KEY,
 patient_id VARCHAR(64) NOT NULL,
 data JSON NOT NULL,
 FOREIGN KEY (patient_id) REFERENCES patients(id),
 INDEX idx_assessment_patient (patient_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS health_timeline (
 id VARCHAR(64) PRIMARY KEY, patient_id VARCHAR(64) NOT NULL, data JSON NOT NULL,
 FOREIGN KEY (patient_id) REFERENCES patients(id), INDEX idx_timeline_patient(patient_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS documents (
 id VARCHAR(64) PRIMARY KEY, patient_id VARCHAR(64) NOT NULL, data JSON NOT NULL,
 FOREIGN KEY (patient_id) REFERENCES patients(id), INDEX idx_document_patient(patient_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS medications (
 id VARCHAR(64) PRIMARY KEY, patient_id VARCHAR(64) NOT NULL, data JSON NOT NULL,
 FOREIGN KEY (patient_id) REFERENCES patients(id), INDEX idx_medication_patient(patient_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS appointments (
 id VARCHAR(64) PRIMARY KEY, patient_id VARCHAR(64) NOT NULL, data JSON NOT NULL,
 FOREIGN KEY (patient_id) REFERENCES patients(id), INDEX idx_appointment_patient(patient_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ayush_profiles (
 id VARCHAR(64) PRIMARY KEY, patient_id VARCHAR(64) NOT NULL UNIQUE, data JSON NOT NULL,
 FOREIGN KEY (patient_id) REFERENCES patients(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS doctor_notes (
 id VARCHAR(64) PRIMARY KEY, patient_id VARCHAR(64) NOT NULL, data JSON NOT NULL,
 FOREIGN KEY (patient_id) REFERENCES patients(id), INDEX idx_notes_patient(patient_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS consultations (
 id VARCHAR(64) PRIMARY KEY, patient_id VARCHAR(64) NOT NULL, data JSON NOT NULL,
 FOREIGN KEY (patient_id) REFERENCES patients(id), INDEX idx_consultation_patient(patient_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
