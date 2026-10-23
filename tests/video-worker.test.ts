// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildHlsArgs, contentTypeOf, parseProbe, pickRungs } from "../services/video-worker/src/ffmpeg";
import { transcodeToHls } from "../services/video-worker/src/transcode";

describe("rendition ladder", () => {
  it("never upscales and always keeps the smallest rendition", () => {
    expect(pickRungs(2160).map((r) => r.height)).toEqual([360, 720, 1080]);
    expect(pickRungs(720).map((r) => r.height)).toEqual([360, 720]);
    expect(pickRungs(540).map((r) => r.height)).toEqual([360]);
    expect(pickRungs(240).map((r) => r.height)).toEqual([360]);
  });
});

describe("ffprobe output", () => {
  const probe = (streams: object[], duration = "12.4") => JSON.stringify({ streams, format: { duration } });
  it("reads height, audio presence and duration", () => {
    expect(parseProbe(probe([{ codec_type: "video", height: 1080 }, { codec_type: "audio" }]))).toEqual({ height: 1080, hasAudio: true, durationSeconds: 12 });
    expect(parseProbe(probe([{ codec_type: "video", height: 720 }]))).toMatchObject({ hasAudio: false });
  });
  it("rejects a file without a video stream", () => {
    expect(() => parseProbe(probe([{ codec_type: "audio" }]))).toThrow("no_video_stream");
  });
});

describe("ffmpeg arguments", () => {
  const args = (height: number, hasAudio: boolean) => buildHlsArgs({ input: "in.mp4", outDir: "/out", probe: { height, hasAudio, durationSeconds: 10 } });
  it("maps one audio track per rendition and describes the variants", () => {
    const a = args(1080, true);
    expect(a.filter((x) => x === "0:a:0")).toHaveLength(3);
    expect(a[a.indexOf("-var_stream_map") + 1]).toBe("v:0,a:0 v:1,a:1 v:2,a:2");
    expect(a.join(" ")).toContain("split=3[s0][s1][s2]");
  });
  it("handles a silent source and a single rendition", () => {
    const a = args(480, false);
    expect(a).not.toContain("-c:a");
    expect(a[a.indexOf("-var_stream_map") + 1]).toBe("v:0");
    expect(a.join(" ")).toContain("[0:v]scale=-2:360[o0]");
  });
  it("writes the layout the stream gateway serves (index.m3u8 + v<N>.m3u8 + segments)", () => {
    const a = args(1080, true);
    expect(a).toContain("index.m3u8");
    expect(a[a.length - 1]).toBe("/out/v%v.m3u8");
    expect(a).toContain("/out/v%v_seg%03d.ts");
  });
  it("labels playlist and segment content types", () => {
    expect(contentTypeOf("index.m3u8")).toBe("application/vnd.apple.mpegurl");
    expect(contentTypeOf("v0_seg000.ts")).toBe("video/mp2t");
  });
});

// Real transcoding needs ffmpeg: it runs in CI (apt-get install ffmpeg) and locally when ffmpeg is on PATH or FFMPEG_PATH is set.
const ffmpegBin = process.env.FFMPEG_PATH ?? "ffmpeg";
const hasFfmpeg = spawnSync(ffmpegBin, ["-version"]).status === 0 && spawnSync(process.env.FFPROBE_PATH ?? "ffprobe", ["-version"]).status === 0;
describe.skipIf(!hasFfmpeg)("real transcoding (ffmpeg)", () => {
  const dir = mkdtempSync(join(tmpdir(), "vw-test-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  it("turns a 3 s sample into adaptive HLS with audio", async () => {
    const src = join(dir, "sample.mp4");
    execFileSync(ffmpegBin, ["-hide_banner", "-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=25:duration=3", "-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", src]);
    const out = join(dir, "hls");
    mkdirSync(out);
    const info = await transcodeToHls(src, out);
    expect(info).toMatchObject({ height: 720, hasAudio: true, durationSeconds: 3 });
    const files = readdirSync(out);
    expect(files).toEqual(expect.arrayContaining(["index.m3u8", "v0.m3u8", "v1.m3u8"]));
    expect(files.filter((f) => f.endsWith(".ts")).length).toBeGreaterThanOrEqual(2);
    expect(files).not.toContain("v2.m3u8"); // 1080p is not produced from a 720p source
    const master = readFileSync(join(out, "index.m3u8"), "utf8");
    expect(master).toContain("#EXT-X-STREAM-INF");
    expect(master.match(/v\d\.m3u8/g)).toHaveLength(2);
  }, 120_000);
  it("rejects a file that is not a video", async () => {
    const bad = join(dir, "bad.mp4");
    execFileSync("sh", ["-c", `echo not a video > ${bad}`]);
    const out = join(dir, "hls-bad");
    mkdirSync(out);
    await expect(transcodeToHls(bad, out)).rejects.toThrow();
  });
});
