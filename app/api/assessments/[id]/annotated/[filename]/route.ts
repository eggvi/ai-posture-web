import {
  getAssessment,
  getBindings,
  hasClientAccess,
} from "@/lib/assessment-store";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; filename: string }> },
) {
  const { id, filename: encodedFilename } = await context.params;
  const filename = decodeURIComponent(encodedFilename).replaceAll("/", "");
  const row = await getAssessment(id);
  if (!row || !hasClientAccess(request, row)) return new Response("Unauthorized", { status: 401 });
  const key = `assessments/${id}/annotated/${filename}`;
  const object = await getBindings().UPLOADS.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
