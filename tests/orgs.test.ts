import { describe, expect, it } from "vitest";
import { average, memberAverage, reportCsv, type Report } from "@/lib/orgs";

const report: Report = {
  organization: "Atelier Test",
  packs: [],
  pending_invitations: [],
  members: [
    { user_id: "1", name: "=HYPERLINK(\"http://x\")", email: "a@t.fr", role: "learner", joined: "2026-10-01", last_activity: "2026-10-20T10:00:00Z", seats: [{ allocation_id: "a", path: "RH Augmentées", valid_until: "2027-01-01" }],
      courses: [{ code: "M3", title: "IA générative", percent: 100, quiz_passed: true }, { code: "M4", title: "Prompt Engineering", percent: 50, quiz_passed: false }] },
    { user_id: "2", name: "Léa; \"Dupont\"", email: "l@t.fr", role: "manager", joined: "2026-10-02", last_activity: null, seats: [], courses: [] },
  ],
};

describe("organisation report helpers", () => {
  it("averages progress and handles empty lists", () => {
    expect(average([])).toBe(0);
    expect(memberAverage(report.members[0])).toBe(75);
    expect(memberAverage(report.members[1])).toBe(0);
  });
  it("exports a CSV that quotes cells and neutralises spreadsheet formulas", () => {
    const csv = reportCsv(report);
    expect(csv.startsWith("﻿\"Nom\";")).toBe(true);
    expect(csv).toContain("\"'=HYPERLINK(");
    expect(csv).toContain('"Léa; ""Dupont"""');
    expect(csv).toContain('"1/2"');
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(3);
  });
  it("never includes anything beyond progress data", () => {
    expect(reportCsv(report)).not.toMatch(/réponse|livrable confidentiel|feedback/i);
  });
});
