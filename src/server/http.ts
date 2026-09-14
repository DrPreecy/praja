import { ZodError } from "zod";
import { DomainError } from "../domain/model";
export async function body(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  const expectedOrigin = process.env.NEXTAUTH_URL
    ? new URL(process.env.NEXTAUTH_URL).origin
    : `${url.protocol}//${request.headers.get("host") ?? url.host}`;
  if (origin !== expectedOrigin)
    throw new DomainError("Cross-origin changes are not allowed.", 403);
  const value = await request.text();
  if (value.length > 100000)
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
