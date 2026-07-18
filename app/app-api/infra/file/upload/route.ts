import {
  getAssessment,
  getBindings,
  json,
  workerAuthorized,
} from "@/lib/assessment-store";

const MAX_BYTES = 10 * 1024 * 1024;

type MultipartFile = {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
};

function indexOfBytes(source: Uint8Array, needle: Uint8Array, from = 0) {
  outer: for (let i = from; i <= source.length - needle.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (source[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

async function parseMultipart(request: Request): Promise<{ path: string; file: MultipartFile } | null> {
  const contentType = request.headers.get("content-type") || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2];
  if (!boundary) return null;

  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > MAX_BYTES + 64 * 1024) return null;

  const body = new Uint8Array(await request.arrayBuffer());
  if (!body.length || body.length > MAX_BYTES + 64 * 1024) return null;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const marker = encoder.encode(`--${boundary}`);
  const headerSeparator = encoder.encode("\r\n\r\n");
  const nextMarker = encoder.encode(`\r\n--${boundary}`);
  let cursor = 0;
  let remotePath = "";
  let uploadedFile: MultipartFile | null = null;

  while (cursor < body.length) {
    const markerIndex = indexOfBytes(body, marker, cursor);
    if (markerIndex < 0) break;
    let partStart = markerIndex + marker.length;
    if (body[partStart] === 45 && body[partStart + 1] === 45) break;
    if (body[partStart] === 13 && body[partStart + 1] === 10) partStart += 2;

    const headerEnd = indexOfBytes(body, headerSeparator, partStart);
    if (headerEnd < 0) break;
    const headers = decoder.decode(body.slice(partStart, headerEnd));
    const dataStart = headerEnd + headerSeparator.length;
    const dataEnd = indexOfBytes(body, nextMarker, dataStart);
    if (dataEnd < 0) break;

    const disposition = headers.match(/content-disposition:[^\r\n]+/i)?.[0] || "";
    const name = disposition.match(/name="([^"]+)"/i)?.[1] || "";
    const filename = disposition.match(/filename="([^"]*)"/i)?.[1] || "";
    if (name === "path") {
      remotePath = decoder.decode(body.slice(dataStart, dataEnd)).trim();
    } else if (name === "file" && filename) {
      uploadedFile = {
        filename,
        contentType: headers.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim() || "application/octet-stream",
        bytes: body.slice(dataStart, dataEnd),
      };
    }
    cursor = dataEnd + 2;
  }

  return remotePath && uploadedFile ? { path: remotePath, file: uploadedFile } : null;
}

export async function POST(request: Request) {
  if (!workerAuthorized(request)) return json({ code: 401, msg: "Worker token invalid" }, { status: 401 });
  const multipart = await parseMultipart(request);
  if (!multipart) return json({ code: 400, msg: "file and path are required" }, { status: 400 });
  const { path: remotePath, file } = multipart;
  if (!file.contentType.startsWith("image/") || file.bytes.byteLength > MAX_BYTES) {
    return json({ code: 413, msg: "invalid image or file too large" }, { status: 413 });
  }

  const match = remotePath.match(/(?:^|\/)hyeyes\/annotated\/([^/]+)\/([^/]+)$/);
  if (!match) return json({ code: 400, msg: "invalid path" }, { status: 400 });
  const assessmentId = match[1];
  const filename = match[2].replaceAll("/", "");
  if (!await getAssessment(assessmentId)) return json({ code: 404, msg: "assessment not found" }, { status: 404 });

  const key = `assessments/${assessmentId}/annotated/${filename}`;
  await getBindings().UPLOADS.put(key, file.bytes, {
    httpMetadata: { contentType: file.contentType || "image/jpeg" },
    customMetadata: { assessmentId, kind: "annotated" },
  });

  const origin = new URL(request.url).origin;
  return json({ code: 0, data: `${origin}/api/worker-assets/${assessmentId}/${encodeURIComponent(filename)}` });
}
