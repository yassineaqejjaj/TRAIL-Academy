#!/usr/bin/env bash
# Encodes a source video into adaptive HLS and uploads it to the private bucket where the stream gateway serves it.
#   ./scripts/encode-hls.sh lesson-intro.mp4 intro-m4-01
# Requires ffmpeg and the MinIO client (mc) configured with an alias "trail" (mc alias set trail $S3_ENDPOINT $S3_ACCESS_KEY_ID $S3_SECRET_ACCESS_KEY).
# The asset id (2nd argument) is what you paste into the lesson in the admin. Use 4-64 characters: letters, digits, "_" and "-".
set -euo pipefail
SRC="${1:?source video}"; ID="${2:?asset id}"; BUCKET="${S3_BUCKET:-trail}"
[[ "$ID" =~ ^[A-Za-z0-9_-]{4,64}$ ]] || { echo "invalid asset id" >&2; exit 1; }
OUT="$(mktemp -d)"; trap 'rm -rf "$OUT"' EXIT

ffmpeg -hide_banner -y -i "$SRC" \
  -filter_complex "[0:v]split=3[a][b][c];[a]scale=-2:360[v360];[b]scale=-2:720[v720];[c]scale=-2:1080[v1080]" \
  -map "[v360]" -map "[v720]" -map "[v1080]" -map 0:a -map 0:a -map 0:a \
  -c:v libx264 -preset veryfast -profile:v main -crf 22 -g 96 -keyint_min 96 -sc_threshold 0 \
  -b:v:0 800k -b:v:1 2800k -b:v:2 5000k -c:a aac -b:a 128k -ac 2 \
  -f hls -hls_time 6 -hls_playlist_type vod -hls_flags independent_segments \
  -hls_segment_filename "$OUT/v%v_seg%03d.ts" \
  -master_pl_name index.m3u8 -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" "$OUT/v%v.m3u8"

mc cp --recursive "$OUT/" "trail/$BUCKET/video/$ID/"
echo "uploaded: video/$ID/index.m3u8  → use asset id: $ID"
