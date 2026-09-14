import { afterEach, describe, expect, it, vi } from "vitest";
import { body } from "../src/server/http";

afterEach(() => vi.unstubAllEnvs());

describe("request body handling", () => {
  it("accepts same-origin browser writes", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PRAJA_LOCAL_DEV", "1");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    const request = new Request("http://localhost:3000/api/projects", {
      method: "POST",
      headers: {
        origin: "http://127.0.0.1:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ok: true }),
    });
    await expect(body(request)).resolves.toEqual({ ok: true });
  });

  it("accepts non-browser writes without an origin header", async () => {
    const request = new Request("http://127.0.0.1:3000/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true }),
    });
    await expect(body(request)).resolves.toEqual({ ok: true });
  });

  it("rejects cross-origin writes when an origin header is present", async () => {
    const request = new Request("http://127.0.0.1:3000/api/projects", {
      method: "POST",
      headers: {
        origin: "https://attacker.invalid",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ok: true }),
    });
    await expect(body(request)).rejects.toThrow("Cross-origin");
  });

  it("rejects oversized requests from content-length before buffering", async () => {
    const request = new Request("http://127.0.0.1:3000/api/projects", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "100001",
      },
      body: JSON.stringify({ ok: true }),
    });
    await expect(body(request)).rejects.toThrow("too large");
  });

  it("rejects invalid content-length headers before buffering", async () => {
    const request = new Request("http://127.0.0.1:3000/api/projects", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "-1",
      },
      body: JSON.stringify({ ok: true }),
    });
    await expect(body(request)).rejects.toThrow("Content-Length");
  });

  it("rejects oversized multibyte payloads after reading", async () => {
    const request = new Request("http://127.0.0.1:3000/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "😀".repeat(30000) }),
    });
    await expect(body(request)).rejects.toThrow("too large");
  });

  it("rejects an empty request body with a clear error", async () => {
    const request = new Request("http://127.0.0.1:3000/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "   ",
    });
    await expect(body(request)).rejects.toThrow("body is required");
  });
});
