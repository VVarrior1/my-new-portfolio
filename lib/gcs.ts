import crypto from "crypto";

const GCS_BUCKET = process.env.GCS_BUCKET_NAME;
const SERVICE_ACCOUNT_EMAIL = process.env.GCS_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = (process.env.GCS_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const HOST = "storage.googleapis.com";
const SIGNED_HEADERS = "content-type;host";
const ALGORITHM = "GOOG4-RSA-SHA256";
const EXPIRY_SECONDS = 15 * 60;

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function ensureGcsConfig() {
  if (!GCS_BUCKET || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
    throw new Error("GCS credentials are not configured");
  }
}

export function generateSignedUrl(options: {
  objectName: string;
  method: "PUT" | "DELETE";
  contentType?: string;
  expiresInSeconds?: number;
}) {
  ensureGcsConfig();

  const { objectName, method, contentType = "application/octet-stream", expiresInSeconds = EXPIRY_SECONDS } = options;

  const now = new Date();
  const datestamp = `${now.getUTCFullYear()}${`${now.getUTCMonth() + 1}`.padStart(2, "0")}${`${now.getUTCDate()}`.padStart(2, "0")}`;
  const timestamp = `${datestamp}T${`${now.getUTCHours()}`.padStart(2, "0")}${`${now.getUTCMinutes()}`.padStart(2, "0")}${`${now.getUTCSeconds()}`.padStart(2, "0")}Z`;
  const credentialScope = `${datestamp}/auto/storage/goog4_request`;
  const credential = `${SERVICE_ACCOUNT_EMAIL}/${credentialScope}`;

  const sanitizedObjectName = objectName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const canonicalUri = `/${encodeURIComponent(GCS_BUCKET!)}/${sanitizedObjectName}`;

  const queryParams: Record<string, string> = {
    "X-Goog-Algorithm": ALGORITHM,
    "X-Goog-Credential": credential,
    "X-Goog-Date": timestamp,
    "X-Goog-Expires": String(expiresInSeconds),
    "X-Goog-SignedHeaders": SIGNED_HEADERS,
    "X-Goog-Content-SHA256": "UNSIGNED-PAYLOAD",
  };

  const canonicalQueryString = Object.keys(queryParams)
    .sort()
    .map((key) => `${encodeRfc3986(key)}=${encodeRfc3986(queryParams[key])}`)
    .join("&");

  const canonicalHeaders = `content-type:${contentType}\nhost:${HOST}\n`;

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    SIGNED_HEADERS,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const canonicalHash = crypto.createHash("sha256").update(canonicalRequest).digest("hex");

  const stringToSign = [
    ALGORITHM,
    timestamp,
    credentialScope,
    canonicalHash,
  ].join("\n");

  const signature = crypto
    .createSign("RSA-SHA256")
    .update(stringToSign)
    .sign(PRIVATE_KEY)
    .toString("hex");

  const signedUrl = `https://${HOST}/${GCS_BUCKET}/${objectName}?${canonicalQueryString}&X-Goog-Signature=${signature}`;

  return {
    signedUrl,
    publicUrl: `https://${HOST}/${GCS_BUCKET}/${objectName}`,
  };
}

export function extractObjectNameFromUrl(url: string): string | null {
  if (!GCS_BUCKET) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== HOST && !parsed.hostname.endsWith("storage.googleapis.com")) {
      return null;
    }
    const prefix = `/${GCS_BUCKET}/`;
    if (!parsed.pathname.startsWith(prefix)) {
      return null;
    }
    const objectPath = parsed.pathname.slice(prefix.length);
    return decodeURIComponent(objectPath);
  } catch {
    return null;
  }
}

export const gcsBucketName = GCS_BUCKET;
