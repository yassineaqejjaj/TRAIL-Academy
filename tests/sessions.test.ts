import { describe, expect, it } from "vitest";
import { buildIcs, dayKey, formatRange, isMonth, monthGrid, seatsLeft, shiftMonth, type LiveSession } from "@/lib/sessions";

const session = (over: Partial<LiveSession> = {}): LiveSession => ({ id: "s1", title: "Atelier prompts", description: "", course_code: "M4", course_slug: "prompt-engineering", course_title: "Prompt Engineering", starts_at: "2026-11-12T18:30:00Z", duration_minutes: 90, capacity: 10, audience: "learners", status: "published", booked: 4, waitlist: 0, ...over });

describe("ICS", () => {
  const ics = buildIcs([{ uid: "abc", title: "Atelier; avec, virgule", description: "Ligne 1\nLigne 2", startsAt: "2026-11-12T18:30:00Z", durationMinutes: 90, location: "https://meet.jit.si/x", url: "https://site.test/sessions/abc" }], { name: "TRAIL", domain: "site.test", now: new Date("2026-10-23T10:00:00Z") });
  it("is a valid calendar with UTC times, CRLF lines and a reminder", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261112T183000Z");
    expect(ics).toContain("DTEND:20261112T200000Z");
    expect(ics).toContain("DTSTAMP:20261023T100000Z");
    expect(ics).toContain("TRIGGER:-PT15M");
    expect(ics).not.toMatch(/[^\r]\n/);
  });
  it("escapes text and folds long lines at 75 octets", () => {
    expect(ics).toContain("SUMMARY:Atelier\; avec\\, virgule");
    expect(ics).toContain("DESCRIPTION:Ligne 1\\nLigne 2");
    const long = buildIcs([{ uid: "x", title: "é".repeat(120), description: "", startsAt: "2026-11-12T18:30:00Z", durationMinutes: 30 }], { name: "T", domain: "d" });
    for (const line of long.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });
  it("marks a canceled session as cancelled", () => {
    expect(buildIcs([{ uid: "c", title: "x", description: "", startsAt: "2026-11-12T18:30:00Z", durationMinutes: 30, canceled: true }], { name: "T", domain: "d" })).toContain("STATUS:CANCELLED");
  });
});

describe("calendar helpers", () => {
  it("shows Paris time, including daylight-saving time", () => {
    expect(formatRange(session())).toBe("19:30 – 21:00 (heure de Paris)");               // winter: UTC+1
    expect(formatRange(session({ starts_at: "2026-07-02T08:00:00Z" }))).toBe("10:00 – 11:30 (heure de Paris)"); // summer: UTC+2
  });
  it("groups by Paris calendar day, not UTC day", () => { expect(dayKey("2026-11-12T23:30:00Z")).toBe("2026-11-13"); });
  it("builds a Monday-first month grid holding the sessions", () => {
    const g = monthGrid("2026-11", [session(), session({ id: "s2", starts_at: "2026-11-30T09:00:00Z" })]);
    expect(g.label).toMatch(/novembre 2026/);
    expect(g.weeks[0][0].date).toBe("2026-10-26"); // 1 Nov 2026 is a Sunday
    expect(g.weeks.every((w) => w.length === 7)).toBe(true);
    const days = g.weeks.flat().filter((c) => c.sessions.length);
    expect(days.map((d) => d.date)).toEqual(["2026-11-12", "2026-11-30"]);
  });
  it("navigates months and validates the parameter", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("2026-11")).toBe(true);
    expect(isMonth("<script>")).toBe(false);
  });
  it("counts remaining seats", () => { expect(seatsLeft(session())).toBe(6); expect(seatsLeft(session({ booked: 12 }))).toBe(0); });
});
