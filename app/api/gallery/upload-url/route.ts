import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? process.env.BLOG_ADMIN_TOKEN;
const GCS_BUCKET = process.env.GCS_BUCKET_NAME;
const SERVICE_ACCOUNT_EMAIL = process.env.GCS_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = (process.env.GCS_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const UPLOAD_EXPIRY_SECONDS = 10 * 60;

function encodeRfc3986(str: string) {
  return encodeURIComponent(str).replace(/[!*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function getSignedUrl(objectName: string, contentType: string) {
  if (!GCS_BUCKET || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
    throw new Error("GCS credentials are not configured");
  }

  const method = "PUT";
  const host = "storage.googleapis.com";
  const canonicalUri = `/${encodeURIComponent(GCS_BUCKET)}/${objectName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

  const now = new Date();
  const datestamp = `${now.getUTCFullYear()}${`${now.getUTCMonth() + 1}`.padStart(2, "0")}${`${now.getUTCDate()}`.padStart(2, "0")}`;
  const timestamp = `${datestamp}T${`${now.getUTCHours()}`.padStart(2, "0")}${`${now.getUTCMinutes()}`.padStart(2, "0")}${`${now.getUTCSeconds()}`.padStart(2, "0")}Z`;
  const credentialScope = `${datestamp}/auto/storage/goog4_request`;
  const credential = `${SERVICE_ACCOUNT_EMAIL}/${credentialScope}`;

  const normalizedContentType = contentType || "application/octet-stream";

  const queryParams: Record<string, string> = {
    "X-Goog-Algorithm": "GOOG4-RSA-SHA256",
    "X-Goog-Credential": credential,
    "X-Goog-Date": timestamp,
    "X-Goog-Expires": String(UPLOAD_EXPIRY_SECONDS),
    "X-Goog-SignedHeaders": "content-type;host",
    "X-Goog-Content-SHA256": "UNSIGNED-PAYLOAD",
  };

  const canonicalQueryString = Object.keys(queryParams)
    .sort()
    .map((key) => `${encodeRfc3986(key)}=${encodeRfc3986(queryParams[key])}`)
    .join("&");

  const canonicalHeaders = `content-type:${normalizedContentType}
host:${host}\n`;
  const signedHeaders = "content-type;host";
  const hashedPayload = "UNSIGNED-PAYLOAD";

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedPayload,
  ].join("\n");

  const canonicalHash = crypto.createHash("sha256").update(canonicalRequest).digest("hex");

  const stringToSign = [
    "GOOG4-RSA-SHA256",
    timestamp,
    credentialScope,
    canonicalHash,
  ].join("\n");

  const signature = crypto
    .createSign("RSA-SHA256")
    .update(stringToSign)
    .sign(PRIVATE_KEY)
    .toString("hex");

  const signedUrl = `https://${host}/${GCS_BUCKET}/${objectName}?${canonicalQueryString}&X-Goog-Signature=${signature}`;

  return {
    uploadUrl: signedUrl,
    publicUrl: `https://${host}/${GCS_BUCKET}/${objectName}`,
  };
}

export async function POST(request: NextRequest) {
  if (!ADMIN_TOKEN) {
    return NextResponse.json(
      { error: "ADMIN_TOKEN environment variable not set" },
      { status: 500 }
    );
  }

  let payload: { filename?: string; contentType?: string; token?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const headerToken = request.headers.get("x-admin-token");
  const providedToken = headerToken ?? payload.token;

  if (providedToken !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!payload.filename || !payload.contentType) {
    return NextResponse.json(
      { error: "filename and contentType are required" },
      { status: 400 }
    );
  }

  const ext = payload.filename.includes(".")
    ? payload.filename.substring(payload.filename.lastIndexOf("."))
    : "";
  const safeExt = ext.slice(0, 10).replace(/[^\w.]/g, "");
  const objectName = `gallery/${crypto.randomUUID()}${safeExt}`;

  try {
    const { uploadUrl, publicUrl } = getSignedUrl(objectName, payload.contentType);
    return NextResponse.json({ uploadUrl, publicUrl, objectName });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
