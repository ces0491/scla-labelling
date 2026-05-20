import { S3Client } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 signed-URL helper.
 *
 * Labellers never see the R2 key -- the next-task API returns a
 * short-lived signed URL that wraps the key. The key itself carries a
 * random nonce per frame so URL guessing doesn't enumerate the
 * bucket.
 *
 * R2 requires SigV4 for presigned URLs (see SCLA's
 * feedback_r2_sigv4_required memory). The S3 client passes
 * signatureVersion via the underlying AWS SDK defaults; the @aws-sdk
 * v3 client uses SigV4 unconditionally.
 */

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  const endpoint = process.env.R2_ENDPOINT_URL;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 env vars missing: R2_ENDPOINT_URL + R2_ACCESS_KEY_ID + " +
        "R2_SECRET_ACCESS_KEY must be set",
    );
  }
  _client = new S3Client({
    endpoint,
    region: "auto",
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

export async function signFrameUrl(r2Key: string): Promise<string> {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET env var missing");
  const ttl = parseInt(process.env.R2_FRAME_TTL_SECONDS ?? "86400", 10);
  const client = getClient();
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: r2Key });
  return getSignedUrl(client, cmd, { expiresIn: ttl });
}
