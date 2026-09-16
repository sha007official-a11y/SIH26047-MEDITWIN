import { useEffect } from "react";
import { useApp } from "../lib/context";
import { api } from "../lib/api";
export default function WebTools() {
  const { user } = useApp();
  useEffect(() => {
    if (!user || !document.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const doctor = user.role === "doctor";
    const tool = {
      name: "read_health_stories",
      title: doctor ? "Read assigned patient cases" : "Read my health stories",
      description: doctor
        ? "Read the health summaries already shared with the signed-in doctor. Does not verify or change patient information."
        : "Read the signed-in patient’s saved health stories and their status. Does not submit or change records.",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["all", "draft", "submitted", "in-consultation", "completed"],
          },
        },
        required: ["status"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input) {
        if (
          !input ||
          Object.keys(input).some((k) => k !== "status") ||
          ![
            "all",
            "draft",
            "submitted",
            "in-consultation",
            "completed",
          ].includes(input.status)
        )
          throw Error("Choose a supported status.");
        const data = await api(doctor ? "/doctor/dashboard" : "/patient");
        const cases = doctor ? data.cases : data.assessments;
        return {
          prototype: true,
          cases: cases
            .filter((c) => input.status === "all" || c.status === input.status)
            .map((c) => ({
              id: c.id,
              patient: doctor ? c.patient.name : data.patient.name,
              status: c.status,
              summary: c.summary,
              patientVerified: c.patientVerified,
              doctorVerified: !!c.doctorVerified,
            })),
        };
      },
    };
    try {
      Promise.resolve(
        document.modelContext.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [user?.id]);
  return null;
}
