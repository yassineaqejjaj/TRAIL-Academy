/** Pure helpers: which renditions to produce and the ffmpeg arguments for them. Nothing here starts a process. */

export interface Rung { height: number; videoKbps: number }
export interface Probe { height: number; hasAudio: boolean; durationSeconds: number | null }

export const LADDER: readonly Rung[] = [{ height: 360, videoKbps: 800 }, { height: 720, videoKbps: 2800 }, { height: 1080, videoKbps: 5000 }];

/** Never upscale: keep the renditions that fit the source, and always at least the smallest one. */
export function pickRungs(sourceHeight: number): Rung[] {
  const fit = LADDER.filter((r) => r.height <= sourceHeight);
  return fit.length ? [...fit] : [LADDER[0]];
}

/** Reads `ffprobe -print_format json -show_streams -show_format` output. Throws when the file has no video stream. */
export function parseProbe(json: string): Probe {
  const data = JSON.parse(json) as { streams?: { codec_type?: string; height?: number; duration?: string }[]; format?: { duration?: string } };
  const video = data.streams?.find((s) => s.codec_type === "video" && Number(s.height) > 0);
  if (!video) throw new Error("no_video_stream");
  const duration = Number(data.format?.duration ?? video.duration);
  return { height: Number(video.height), hasAudio: Boolean(data.streams?.some((s) => s.codec_type === "audio")), durationSeconds: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null };
}

/**
 * Adaptive HLS (H.264 + AAC, 6 s segments, keyframe every 4 s) written to `outDir`: master playlist index.m3u8,
 * one v<N>.m3u8 per rendition, v<N>_segNNN.ts segments. Same layout as scripts/encode-hls.sh, which the gateway expects.
 */
export function buildHlsArgs(opts: { input: string; outDir: string; probe: Probe }): string[] {
  const rungs = pickRungs(opts.probe.height);
  const n = rungs.length;
  const scale = n === 1
    ? `[0:v]scale=-2:${rungs[0].height}[o0]`
    : `[0:v]split=${n}${rungs.map((_, i) => `[s${i}]`).join("")};${rungs.map((r, i) => `[s${i}]scale=-2:${r.height}[o${i}]`).join(";")}`;
  const args = ["-hide_banner", "-nostdin", "-y", "-i", opts.input, "-filter_complex", scale];
  rungs.forEach((_, i) => args.push("-map", `[o${i}]`));
  if (opts.probe.hasAudio) rungs.forEach(() => args.push("-map", "0:a:0"));
  args.push("-c:v", "libx264", "-preset", "veryfast", "-profile:v", "main", "-crf", "22", "-g", "96", "-keyint_min", "96", "-sc_threshold", "0", "-pix_fmt", "yuv420p");
  rungs.forEach((r, i) => args.push(`-b:v:${i}`, `${r.videoKbps}k`, `-maxrate:v:${i}`, `${Math.round(r.videoKbps * 1.2)}k`, `-bufsize:v:${i}`, `${r.videoKbps * 2}k`));
  if (opts.probe.hasAudio) args.push("-c:a", "aac", "-b:a", "128k", "-ac", "2");
  const streamMap = rungs.map((_, i) => (opts.probe.hasAudio ? `v:${i},a:${i}` : `v:${i}`)).join(" ");
  args.push("-f", "hls", "-hls_time", "6", "-hls_playlist_type", "vod", "-hls_flags", "independent_segments",
    "-hls_segment_filename", `${opts.outDir}/v%v_seg%03d.ts`, "-master_pl_name", "index.m3u8", "-var_stream_map", streamMap, `${opts.outDir}/v%v.m3u8`);
  return args;
}

const TYPES: Record<string, string> = { m3u8: "application/vnd.apple.mpegurl", ts: "video/mp2t" };
export const contentTypeOf = (file: string): string => TYPES[file.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
