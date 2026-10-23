import { describe, expect, it } from "vitest";
import { isVideoSourceKeyFor, MAX_VIDEO_BYTES, validateVideoSource, videoSourceKey } from "@/lib/uploads";

describe("source video uploads", () => {
  it("accepts common containers and signs a canonical content type", () => {
    expect(validateVideoSource({ name: "Intro.MP4", size: 10 })).toEqual({ ok: true, extension: "mp4", contentType: "video/mp4" });
    expect(validateVideoSource({ name: "screen.mov", size: 10 })).toMatchObject({ ok: true, contentType: "video/quicktime" });
    expect(validateVideoSource({ name: "x.mkv", size: 10 })).toMatchObject({ ok: true });
  });
  it("rejects other formats, empty files and files over 4 Go", () => {
    expect(validateVideoSource({ name: "malware.exe", size: 10 }).ok).toBe(false);
    expect(validateVideoSource({ name: "video", size: 10 }).ok).toBe(false);
    expect(validateVideoSource({ name: "a.mp4", size: 0 }).ok).toBe(false);
    expect(validateVideoSource({ name: "a.mp4", size: MAX_VIDEO_BYTES + 1 }).ok).toBe(false);
  });
  it("scopes keys to the lesson and refuses traversal", () => {
    const key = videoSourceKey("lesson-1", "u1", "mp4");
    expect(key).toBe("video-src/lesson-1/u1.mp4");
    expect(isVideoSourceKeyFor(key, "lesson-1")).toBe(true);
    expect(isVideoSourceKeyFor(key, "lesson-2")).toBe(false);
    expect(isVideoSourceKeyFor("video-src/lesson-1/../x.mp4", "lesson-1")).toBe(false);
  });
});
