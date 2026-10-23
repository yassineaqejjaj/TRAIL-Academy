/**
 * Creates the private bucket on the S3-compatible storage if it does not exist (idempotent).
 *   S3_ENDPOINT=https://… S3_BUCKET=trail S3_ACCESS_KEY_ID=… S3_SECRET_ACCESS_KEY=… npm run storage:setup
 * CORS for direct browser uploads is configured on the MinIO service itself (MINIO_API_CORS_ALLOW_ORIGIN = the site origin).
 */
import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

const need = (n: string) => { const v = process.env[n]; if (!v) { console.error(`Missing ${n}`); process.exit(1); } return v; };
const bucket = need("S3_BUCKET");
const s3 = new S3Client({ endpoint: need("S3_ENDPOINT"), region: process.env.S3_REGION ?? "us-east-1", forcePathStyle: true, credentials: { accessKeyId: need("S3_ACCESS_KEY_ID"), secretAccessKey: need("S3_SECRET_ACCESS_KEY") } });
try { await s3.send(new HeadBucketCommand({ Bucket: bucket })); console.info(`bucket "${bucket}" already exists`); }
catch { await s3.send(new CreateBucketCommand({ Bucket: bucket })); console.info(`bucket "${bucket}" created`); }
