import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildHlsArgs, parseProbe, type Probe } from "./ffmpeg.ts";

const run = promisify(execFile);
const ffmpeg = () => process.env.FFMPEG_PATH ?? "ffmpeg";
const ffprobe = () => process.env.FFPROBE_PATH ?? "ffprobe";

export async function probe(input: string): Promise<Probe> {
  const { stdout } = await run(ffprobe(), ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", input], { maxBuffer: 10 * 1024 * 1024 });
  return parseProbe(stdout);
}

/** Probes `input`, writes adaptive HLS into the (existing, empty) `outDir` and returns the source description. */
export async function transcodeToHls(input: string, outDir: string): Promise<Probe> {
  const info = await probe(input);
  await run(ffmpeg(), buildHlsArgs({ input, outDir, probe: info }), { maxBuffer: 50 * 1024 * 1024, timeout: 2 * 60 * 60 * 1000 });
  return info;
}
