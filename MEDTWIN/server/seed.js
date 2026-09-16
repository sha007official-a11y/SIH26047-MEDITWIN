import bcrypt from "bcryptjs";
export async function seed() {
  const passwordHash = await bcrypt.hash("Demo@123", 12);
  const now = new Date();
  const day = (n) => new Date(now.getTime() + n * 86400000).toISOString();
  const people = [
    ["Lakshmi Devi", 58, "Female", "Stomach pain", "Moderate"],
    ["Arjun Kumar", 42, "Male", "Headache", "Mild"],
    ["Meera Krishnan", 34, "Female", "Knee pain", "Moderate"],
    ["Ravi Shankar", 65, "Male", "Chest discomfort", "Severe"],
    ["Fatima Begum", 47, "Female", "Back pain", "Mild"],
    ["Priya Nair", 28, "Female", "Fever", "Moderate"],
  ];
  const users = people.map(([name], i) => ({
    id: `u-p${i + 1}`,
    email: i === 0 ? "patient@demo.com" : `patient${i + 1}@demo.com`,
    mobile: `900000000${i}`,
    role: "patient",
    name,
    passwordHash,
  }));
  users.push(
    ...["Ananya Rao", "Vikram Shah", "Divya Menon"].map((name, i) => ({
      id: `u-d${i + 1}`,
      email: i === 0 ? "doctor@demo.com" : `doctor${i + 1}@demo.com`,
      role: "doctor",
      name: `Dr. ${name}`,
      passwordHash,
      mobile: `800000000${i}`,
    })),
  );
  const patients = people.map(([name, age, gender], i) => ({
    id: `SS-2026-00${i + 1}`,
    userId: `u-p${i + 1}`,
    name,
    age,
    gender,
    abha: i === 0 ? "12-3456-7890-1234" : "",
    language: "English",
    bloodGroup: i === 0 ? "O+" : "Not provided",
    medicalHistory:
      i === 0 ? "Hypertension, reported since 2022" : "No history provided",
    allergies: i === 3 ? "I don't know" : "None known",
    createdAt: day(-30),
  }));
  const doctors = ["Ananya Rao", "Vikram Shah", "Divya Menon"].map(
    (name, i) => ({
      id: `DOC-00${i + 1}`,
      userId: `u-d${i + 1}`,
      name: `Dr. ${name}`,
      specialty: ["General medicine", "Family medicine", "AYUSH practitioner"][
        i
      ],
    }),
  );
  const assessments = people.map(
    ([name, age, gender, complaint, severity], i) => ({
      id: `case-demo-${i + 1}`,
      patientId: patients[i].id,
      doctorId: doctors[0].id,
      status: i === 5 ? "completed" : "submitted",
      step: 7,
      language: "English",
      mode: "Tap",
      consent: true,
      bodyArea: ["Stomach", "Head", "Legs", "Chest", "Back", "Other"][i],
      answers: {
        complaint,
        duration: "5 days",
        severity,
        associatedSymptoms:
          i === 0 ? "Nausea, reduced appetite" : "Not reported",
        pattern: "Comes and goes",
        medication: i === 0 ? "Amlodipine 5 mg, morning" : "None reported",
        allergies: patients[i].allergies,
      },
      summary: {
        complaint,
        duration: "5 days",
        severity,
        associatedSymptoms:
          i === 0 ? "Nausea, reduced appetite" : "Not reported",
        medication: i === 0 ? "Amlodipine 5 mg, morning" : "None reported",
        allergies: patients[i].allergies,
        medicalHistory: patients[i].medicalHistory,
      },
      patientVerified: true,
      doctorVerified: i === 5,
      createdAt: day(-i),
      submittedAt: day(-i),
      flagsDismissed: false,
      engine: "Demo question engine",
    }),
  );
  const timeline = patients.flatMap((p, i) => [
    {
      id: `tl-${i}-1`,
      patientId: p.id,
      date: "2022-04-10",
      title:
        i === 0 ? "Started blood pressure medication" : "First health record",
      detail: "Imported fictional demo history",
      type: "history",
    },
    {
      id: `tl-${i}-2`,
      patientId: p.id,
      date: "2024-07-12",
      title: "Routine blood test",
      detail: "Demo laboratory report added",
      type: "document",
    },
    {
      id: `tl-${i}-3`,
      patientId: p.id,
      date: day(-i),
      title: "Health summary shared",
      detail: people[i][3],
      type: "assessment",
    },
  ]);
  return {
    users,
    patients,
    doctors,
    assessments,
    timeline,
    documents: [
      {
        id: "doc-sample-1",
        patientId: patients[0].id,
        assessmentId: assessments[0].id,
        name: "Prescription — sample record.txt",
        type: "Prescription",
        mime: "text/plain",
        size: 160,
        sample: true,
        ocrText:
          "FICTIONAL DEMO RECORD\nPatient: Lakshmi Devi\nReported medication: Amlodipine 5 mg\nMorning — 1 tablet\nFor workflow demonstration only; not a prescription.",
        structured:
          "Reported medication: Amlodipine 5 mg. Schedule: morning, 1 tablet. Requires verification.",
        verified: false,
        createdAt: day(-2),
      },
    ],
    medications: [
      {
        id: "med-1",
        patientId: patients[0].id,
        name: "Amlodipine 5 mg",
        schedule: "Morning · 1 tablet",
        taking: "Yes",
        source: "Fictional demo record",
      },
    ],
    appointments: [
      {
        id: "appt-demo",
        patientId: patients[0].id,
        doctorId: doctors[0].id,
        date: day(1).slice(0, 10),
        time: "10:30",
        reason: "Review stomach pain",
        status: "Booked",
        createdAt: day(0),
      },
    ],
    ayush: [
      {
        id: "ayush-demo",
        patientId: patients[0].id,
        appetite: "Good",
        temperature: "Often feel hot",
        sleep: "Usually restful",
        digestion: "Regular",
        activity: "Moderate",
        summary:
          "Reported good appetite, feeling warm, regular digestion and restful sleep. Practitioner assessment is needed.",
        prakriti: "Not assessed — practitioner review needed",
        updatedAt: day(-1),
      },
    ],
    notes: [],
    consultations: [],
  };
}
