import { ZodError } from "zod";
import { DomainError } from "../domain/model";
import { localMode } from "./store";

const maxBodyBytes = 100000;
const encoder = new TextEncoder();
const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

function sameOrigin(actual: string, expected: string, allowLoopbackAlias: boolean) {
  if (actual === expected) return true;
  if (!allowLoopbackAlias) return false;
  const a = new URL(actual);
  const b = new URL(expected);
  return (
    a.protocol === b.protocol &&
    a.port === b.port &&
    loopbackHosts.has(a.hostname) &&
    loopbackHosts.has(b.hostname)
  );
}

export async function body(request: Request) {
  const origin = request.headers.get("origin");
  const contentLength = request.headers.get("content-length");
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const expectedOrigin = process.env.NEXTAUTH_URL
    ? new URL(process.env.NEXTAUTH_URL).origin
    : localMode()
      ? url.origin
      : null;
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && origin) {
    if (!expectedOrigin)
      throw new DomainError(
        "Configure NEXTAUTH_URL before accepting browser writes.",
        503,
      );
    if (!sameOrigin(origin, expectedOrigin, localMode()))
      throw new DomainError("Cross-origin changes are not allowed.", 403);
  }
  if (contentLength) {
    const declaredBytes = Number.parseInt(contentLength, 10);
    if (!Number.isFinite(declaredBytes) || declaredBytes < 0)
      throw new DomainError("Content-Length header is invalid.");
    if (declaredBytes > maxBodyBytes)
      throw new DomainError("Request is too large.", 413);
  }
  const value = await request.text();
  if (!value.trim()) throw new DomainError("Request body is required.");
  if (encoder.encode(value).length > maxBodyBytes)
    throw new DomainError("Request is too large.", 413);
  return JSON.parse(value);
}
export function failure(e: unknown) {
  if (e instanceof DomainError)
    return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError)
    return Response.json(
      {
        error: e.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  if (e instanceof SyntaxError)
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  console.error(e instanceof Error ? e.message : "Unknown server error");
  return Response.json(
    {
      error:
        "The operation failed. Check the server configuration and try again.",
    },
    { status: 500 },
  );
}
